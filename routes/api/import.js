/**
 * Import API Routes
 * 
 * Provides endpoints for import operations and status monitoring.
 * These endpoints support the ImportSubsystem and related UI components.
 */

import express from 'express';
import multer from 'multer';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { importLogger, logSeparator } from '../../server/winston-config.js';
import TokenManager from '../../server/token-manager.js';
import { createPingOneClient } from '../../api-client-subsystem/index.js';
import CSVParser from '../../file-processing-subsystem/parsers/csv-parser.js';
const router = express.Router();

// Configure multer for file uploads
const upload = multer({ 
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    storage: multer.memoryStorage()
});

// In-memory storage for import status (in production, use database)
let importStatus = {
    isRunning: false,
    progress: 0,
    total: 0,
    processed: 0,
    errors: 0,
    warnings: 0,
    startTime: null,
    endTime: null,
    currentFile: null,
    sessionId: null,
    status: 'idle' // idle, running, completed, failed, cancelled
};

// Read app-config.json helper (memoized with simple timeout)
let _appConfigCache = { data: null, loadedAt: 0 };
function readAppConfigSafe() {
    try {
        const now = Date.now();
        if (_appConfigCache.data && (now - _appConfigCache.loadedAt) < 30_000) {
            return _appConfigCache.data;
        }
        const configPath = path.join(process.cwd(), 'data', 'app-config.json');
        if (fs.existsSync(configPath)) {
            const raw = fs.readFileSync(configPath, 'utf8');
            const json = JSON.parse(raw || '{}');
            _appConfigCache = { data: json, loadedAt: now };
            return json;
        }
    } catch (_) { /* ignore */ }
    return {};
}

function getImportConcurrencyThreshold() {
    const cfg = readAppConfigSafe();
    const val = cfg?.import_concurrency_threshold ?? cfg?.importThreshold;
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? n : 400; // default
}

function getImportPollingThreshold() {
    const cfg = readAppConfigSafe();
    const val = cfg?.import_polling_threshold ?? cfg?.importPollingThreshold;
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? n : 400; // default aligns with concurrency unless overridden
}

function getImportRateLimitPerSecond() {
    const cfg = readAppConfigSafe();
    // Support multiple keys; prefer explicit rateLimit
    const raw = cfg?.rateLimit ?? cfg?.import_rate_limit ?? cfg?.importRateLimit;
    const n = Number(raw);
    // Clamp to [1, 50] as per provider guidance
    if (!Number.isFinite(n) || n <= 0) return 50;
    return Math.min(50, Math.max(1, Math.floor(n)));
}

// Import logging routed through Winston importLogger
const IMPORT_LOG_FILE = path.join(process.cwd(), 'logs', 'import.log');
function ensureLogsDir() {
    try {
        const dir = path.dirname(IMPORT_LOG_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } catch (_) { /* no-op */ }
}
function importLog(msg, meta) {
    try {
        if (process.env.DEBUG_IMPORT_LOG !== '1') return;
        ensureLogsDir();
        const ts = new Date().toISOString();
        const level = /failed|error/i.test(msg)
            ? 'error'
            : (/warn|rate limited|duplicate/i.test(msg) ? 'warn' : 'info');
        importLogger.log(level, msg, {
            ...meta,
            timestamp: ts,
            separator: logSeparator('═', 80)
        });
    } catch (_) { /* no-op */ }
}

/**
 * GET /api/import/status
 * Get current import operation status
 */
router.get('/status', (req, res) => {
    try {
        const response = {
            success: true,
            status: importStatus.status,
            isRunning: importStatus.isRunning,
            progress: {
                current: importStatus.processed,
                total: importStatus.total,
                percentage: importStatus.total > 0 ? Math.round((importStatus.processed / importStatus.total) * 100) : 0
            },
            statistics: {
                processed: importStatus.processed,
                errors: importStatus.errors,
                warnings: importStatus.warnings
            },
            timing: {
                startTime: importStatus.startTime,
                endTime: importStatus.endTime,
                duration: importStatus.startTime && importStatus.endTime 
                    ? importStatus.endTime - importStatus.startTime 
                    : importStatus.startTime 
                        ? Date.now() - importStatus.startTime 
                        : null
            },
            currentFile: importStatus.currentFile,
            sessionId: importStatus.sessionId
        };

        res.success('Import status retrieved successfully', response);
    } catch (error) {
        res.error('Failed to get import status', { code: 'IMPORT_STATUS_ERROR', details: error.message }, 500);
    }
});

/**
 * POST /api/import/start
 * Start a new import operation
 */
router.post('/start', express.json(), (req, res) => {
    try {
        if (importStatus.isRunning) {
            return res.error('Import operation already running', { code: 'IMPORT_ALREADY_RUNNING', sessionId: importStatus.sessionId }, 409);
        }

        const { sessionId, totalRecords, fileName } = req.body;

        importStatus = {
            isRunning: true,
            progress: 0,
            total: totalRecords || 0,
            processed: 0,
            errors: 0,
            warnings: 0,
            startTime: Date.now(),
            endTime: null,
            currentFile: fileName || null,
            sessionId: sessionId || `import_${Date.now()}`,
            status: 'running'
        };

        res.success('Import operation started', { sessionId: importStatus.sessionId, status: importStatus.status });
    } catch (error) {
        res.error('Failed to start import operation', { code: 'IMPORT_START_ERROR', details: error.message }, 500);
    }
});

/**
 * POST /api/import/progress
 * Update import progress
 */
router.post('/progress', express.json(), (req, res) => {
    try {
        const { processed, errors, warnings, currentFile } = req.body;

        if (!importStatus.isRunning) {
            return res.error('No import operation running', { code: 'IMPORT_NOT_RUNNING' }, 400);
        }

        if (typeof processed === 'number') importStatus.processed = processed;
        if (typeof errors === 'number') importStatus.errors = errors;
        if (typeof warnings === 'number') importStatus.warnings = warnings;
        if (currentFile) importStatus.currentFile = currentFile;

        res.success('Progress updated', { status: importStatus.status });
    } catch (error) {
        res.error('Failed to update import progress', { code: 'IMPORT_PROGRESS_ERROR', details: error.message }, 500);
    }
});

/**
 * POST /api/import/complete
 * Mark import operation as completed
 */
router.post('/complete', express.json(), (req, res) => {
    try {
        const { success: operationSuccess, finalStats } = req.body;

        importStatus.isRunning = false;
        importStatus.endTime = Date.now();
        importStatus.status = operationSuccess ? 'completed' : 'failed';

        if (finalStats) {
            importStatus.processed = finalStats.processed || importStatus.processed;
            importStatus.errors = finalStats.errors || importStatus.errors;
            importStatus.warnings = finalStats.warnings || importStatus.warnings;
        }

        res.success(`Import operation ${importStatus.status}`, { 
            status: importStatus.status, 
            finalStats: {
                processed: importStatus.processed,
                errors: importStatus.errors,
                warnings: importStatus.warnings,
                duration: importStatus.endTime - importStatus.startTime
            } 
        });
    } catch (error) {
        res.error('Failed to complete import operation', { code: 'IMPORT_COMPLETE_ERROR', details: error.message }, 500);
    }
});

/**
 * POST /api/import/cancel
 * Cancel running import operation
 */
router.post('/cancel', (req, res) => {
    try {
        if (!importStatus.isRunning) {
            return res.error('No import operation running', { code: 'IMPORT_NOT_RUNNING' }, 400);
        }

        importStatus.isRunning = false;
        importStatus.endTime = Date.now();
        importStatus.status = 'cancelled';

        // Emit a realtime cancellation message so the UI can stop polling immediately
        try {
            const realtimeManager = req.app.get('realtimeManager');
            if (realtimeManager && importStatus.sessionId) {
                realtimeManager.sendToSession(importStatus.sessionId, 'error', { message: 'Import cancelled by user' });
            }
        } catch (_) { /* no-op */ }

        res.success('Import operation cancelled', { status: importStatus.status, sessionId: importStatus.sessionId });
    } catch (error) {
        res.error('Failed to cancel import operation', { code: 'IMPORT_CANCEL_ERROR', details: error.message }, 500);
    }
});

/**
 * DELETE /api/import/reset
 * Reset import status
 */
router.delete('/reset', (req, res) => {
    try {
        importStatus = {
            isRunning: false,
            progress: 0,
            total: 0,
            processed: 0,
            errors: 0,
            warnings: 0,
            startTime: null,
            endTime: null,
            currentFile: null,
            sessionId: null,
            status: 'idle'
        };

        res.success('Import status reset', { status: importStatus.status });
    } catch (error) {
        res.error('Failed to reset import status', { code: 'IMPORT_RESET_ERROR', details: error.message }, 500);
    }
});

/**
 * POST /api/import
 * Main import endpoint - handles file upload and starts import process
 */
router.post('/', upload.single('file'), async (req, res) => {
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.error('No file uploaded', { code: 'NO_FILE_UPLOADED' }, 400);
        }

        // Determine if this is a validation-only request
        const isValidateOnly = String(req.body.validateOnly).toLowerCase() === 'true';

        // Only require populationId if we're actually starting an import
        if (!isValidateOnly && !req.body.populationId) {
            return res.error('Population ID is required', { code: 'POPULATION_ID_REQUIRED' }, 400);
        }

        // Pre-flight: validate credentials/token only if we're starting an import (skip for validateOnly)
        if (!isValidateOnly) {
            try {
                const tm = new TokenManager(importLogger);
                await tm.getAccessToken();
            } catch (authErr) {
                importLogger.error('❌ Import aborted: invalid credentials or token', {
                    error: authErr?.message,
                    separator: logSeparator('═', 80)
                });
                return res.error('Authentication failed: Please verify PingOne Client ID/Secret, Environment ID, and Region in Settings, then try again.', {
                    code: 'INVALID_CREDENTIALS',
                    details: authErr?.message
                }, 401);
            }
        }

        // Get file details
        const fileName = req.file.originalname;
        const fileSize = req.file.size;
        const fileBuffer = req.file.buffer;
        
        // Parse CSV to get total records (simplified)
        const csvContent = fileBuffer.toString('utf8');
        const lines = csvContent.split('\n').filter(line => line.trim());
        const totalRecords = lines.length > 1 ? lines.length - 1 : 0; // Subtract header row

        // Validation-only short-circuit: do not start import, just report findings
        if (isValidateOnly) {
            try {
                const parser = new CSVParser({ logger: importLogger });
                const { headers } = parser.parse(csvContent || '');
                return res.success('File validation successful', {
                    total: totalRecords,
                    headers: headers || []
                });
            } catch (_) {
                return res.success('File validation successful', { total: totalRecords });
            }
        }
        
        // Generate session ID
        const sessionId = `import_${Date.now()}`;
        
        // Update import status
        importStatus = {
            isRunning: true,
            progress: 0,
            total: totalRecords,
            processed: 0,
            errors: 0,
            warnings: 0,
            startTime: Date.now(),
            endTime: null,
            currentFile: fileName,
            sessionId: sessionId,
            status: 'running'
        };
        
        // Log import start
        importLogger.info('🔄 Import started', {
            fileName,
            totalRecords,
            sessionId,
            separator: logSeparator('═', 80)
        });
        importLog('Import started', { fileName, totalRecords, sessionId });
        
        // Return success response immediately
        res.success('Import started successfully', { 
            sessionId: sessionId, 
            total: totalRecords, 
            fileName: fileName, 
            fileSize: fileSize, 
            populationId: req.body.populationId 
        });
        
        // Kick off real import worker (non-blocking)
        const realtimeManager = req.app.get('realtimeManager');
        const populationId = req.body.populationId;
        const sendWelcome = String(req.body.sendWelcome) === 'true';
        runRealImportWorker({
            sessionId,
            populationId,
            csvContent,
            sendWelcome,
            realtimeManager
        }).catch(err => {
            importLogger.warn('Import worker failed', { error: err?.message || String(err) });
        });
        
    } catch (error) {
        importLogger.error('Import error', { error: error?.message, stack: error?.stack, separator: logSeparator('═', 80) });
        res.error('Failed to start import', { code: 'IMPORT_START_ERROR', details: error.message }, 500);
    }
});

/**
 * Simulate import progress for testing
 */
async function sendWelcomeEmailBatch(emails) {
    if (!Array.isArray(emails) || emails.length === 0) return;
    // Simple transport using local sendmail or environment SMTP if provided
    const transporter = nodemailer.createTransport({
        sendmail: true,
        newline: 'unix',
        path: '/usr/sbin/sendmail'
    });

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;background:#f5f7fb;padding:24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;box-shadow:0 6px 24px rgba(16,24,40,.08);">
          <tr>
            <td style="padding:24px 24px 8px 24px;text-align:center;border-bottom:1px solid #eef2f7;">
              <h1 style="margin:0;color:#0b3c8c;font-size:22px;">Welcome to PingOne</h1>
              <p style="margin:8px 0 0 0;color:#475569;">Your account has been created in our system.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;color:#111827;font-size:15px;line-height:1.6;">
              <p>Hello,</p>
              <p>We're excited to have you on board. Use the button below to access your account and complete setup.</p>
              <div style="text-align:center;margin:24px 0;">
                <a href="#" style="background:#1565c0;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;display:inline-block;">Open Your Account</a>
              </div>
              <p>If you have any questions, just reply to this email—our team is here to help.</p>
              <p style="margin-top:24px;color:#6b7280;">Thanks,<br/>Ping Identity Team</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;text-align:center;color:#94a3b8;font-size:12px;border-top:1px solid #eef2f7;">
              © ${new Date().getFullYear()} Ping Identity. All rights reserved.
            </td>
          </tr>
        </table>
      </div>`;

    const message = {
        from: 'no-reply@localhost',
        bcc: emails.join(','),
        subject: 'Welcome to PingOne',
        html
    };

    try {
        await transporter.sendMail(message);
        importLogger.info('✉️ Sent welcome emails', { recipients: emails.length, separator: logSeparator('─', 60) });
    } catch (err) {
        importLogger.warn('Failed to send welcome emails', { error: err.message });
    }
}

function extractEmailsFromCsv(csv) {
    const lines = csv.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g,'').toLowerCase());
    const emailIdx = headers.indexOf('email');
    if (emailIdx === -1) return [];
    const emails = [];
    for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(',');
        const email = (cells[emailIdx] || '').replace(/"/g,'').trim();
        if (email) emails.push(email);
    }
    // Deduplicate
    return Array.from(new Set(emails));
}

async function runRealImportWorker({ sessionId, populationId, csvContent, sendWelcome, realtimeManager }) {
    // Parse CSV
    const parser = new CSVParser({ logger: importLogger });
    const { headers, data } = parser.parse(csvContent || '');
    const totalRecords = Array.isArray(data) ? data.length : 0;

    // Update import status
    importStatus.total = totalRecords;
    importStatus.processed = 0;
    importStatus.errors = 0;
    importStatus.warnings = 0;
    importStatus.status = 'running';
    importStatus.startTime = importStatus.startTime || Date.now();

    if (!populationId) throw new Error('populationId is required for import');

    // Prepare PingOne client
    const client = createPingOneClient({ logger: console });

    let created = 0;
    let failed = 0;
    let skipped = 0;
    const createdEmails = [];

    const emitProgress = async () => {
        if (!realtimeManager || !sessionId) return;
        try {
            const payload = {
                processed: importStatus.processed,
                total: totalRecords,
                stats: {
                    created,
                    failed,
                    skipped,
                    errors: importStatus.errors,
                    warnings: importStatus.warnings
                },
                fileName: importStatus.currentFile
            };
            importLogger.debug('[ImportWorker] Emitting progress', {
                sessionId,
                processed: payload.processed,
                total: payload.total,
                created: payload.stats.created,
                skipped: payload.stats.skipped,
                failed: payload.stats.failed,
                separator: logSeparator('─', 60)
            });
            await realtimeManager.sendToSession(sessionId, 'progress', payload, { queue: true });
        } catch (e) {
            importLogger.warn('Failed to emit progress update', { error: e.message, separator: logSeparator('─', 60) });
        }
    };

    // Resolve environment details for better diagnostics
    let environmentId = null;
    try {
        environmentId = await client.tokenManager.getEnvironmentId();
    } catch (e) {
        importLogger.warn('[ImportWorker] Could not resolve environmentId from token manager', { error: e.message });
    }
    importLogger.info('[ImportWorker] Processing users', { sessionId, environmentId, populationId, totalRecords, separator: logSeparator('─', 60) });
    importLog('Processing users', { sessionId, environmentId, populationId, totalRecords });

    // Concurrency and rate limiting
    const MAX_REQUESTS_PER_SECOND = getImportRateLimitPerSecond(); // respect provider limit (clamped to 50)
    const RATE_WINDOW_MS = 1000;
    const threshold = getImportConcurrencyThreshold();
    const CONCURRENCY = totalRecords > threshold ? 12 : 1;

    const startTimes = [];
    const nowMs = () => Date.now();
    const sleep = (ms) => new Promise(res => setTimeout(res, ms));
    const awaitRateSlot = async () => {
        while (true) {
            const cutoff = nowMs() - RATE_WINDOW_MS;
            while (startTimes.length && startTimes[0] < cutoff) startTimes.shift();
            if (startTimes.length < MAX_REQUESTS_PER_SECOND) {
                startTimes.push(nowMs());
                return;
            }
            await sleep(10);
        }
    };

    let nextIndex = 0;

    const buildPayload = (row) => {
        const username = row.username || row.userName || row.userid || row.userId || '';
        const email = row.email || row.mail || '';
        const given = row.firstName || row.givenName || row.given || '';
        const family = row.lastName || row.familyName || row.family || '';
        if (!email && !username) return null;
        const payload = { username: username || email, email, name: { given, family } };
        if (typeof row.enabled !== 'undefined') {
            const enabledStr = String(row.enabled).trim().toLowerCase();
            payload.enabled = !(enabledStr === 'false' || enabledStr === '0' || enabledStr === 'no');
        }
        return payload;
    };

    const processOne = async (row) => {
        const userPayload = buildPayload(row);
        if (!userPayload) {
            skipped++;
            importStatus.processed++;
            await emitProgress();
            return;
        }
        await awaitRateSlot();
        try {
            console.debug('[ImportWorker] Creating user', { username: userPayload.username, email: userPayload.email });
            importLog('Creating user', { username: userPayload.username, email: userPayload.email });
            try {
                const baseUrl = client?.config?.baseUrl || 'https://api.pingone.com/v1';
                const apiUrl = `${baseUrl}/environments/${environmentId}/populations/${populationId}/users`;
                const preview = { username: userPayload.username, email: userPayload.email, name: userPayload.name, ...(typeof userPayload.enabled !== 'undefined' ? { enabled: userPayload.enabled } : {}) };
                importLog('API request', { method: 'POST', url: apiUrl, environmentId, populationId, payload: preview });
            } catch (_) {}
            // Enable verbose diagnostics for the first failing creation only
            const debugOnce = (global.__importDebugOnce__ !== true);
            let createdUser;
            try {
                createdUser = await client.createUser(populationId, userPayload, { debug: debugOnce });
                if (debugOnce) global.__importDebugOnce__ = true;
            } catch (err) {
                // Re-throw so normal error handling path logs and counts it
                if (debugOnce) global.__importDebugOnce__ = true;
                throw err;
            }
            created++;
            if (userPayload.email) createdEmails.push(userPayload.email);
            try {
                importLogger.info('[ImportWorker] User created', { id: createdUser?.id, username: createdUser?.username || userPayload.username, email: userPayload.email, populationId, separator: logSeparator('─', 60) });
                importLog('User created', { id: createdUser?.id, username: createdUser?.username || userPayload.username, email: userPayload.email });
            } catch (_) {}
        } catch (err) {
            const status = err?.status;
            const body = err?.body || '';
            const bodyStr = String(body);
            const isUniquenessViolation = /UNIQUENESS_VIOLATION/i.test(bodyStr);
            const isAlreadyExists = /duplicate|already exists/i.test(bodyStr);
            const isDuplicate = status === 409 || isUniquenessViolation || isAlreadyExists;
            if (isDuplicate) {
                skipped++;
                const snippet = (bodyStr.slice(0, 180) || '').replace(/\s+/g, ' ');
                const reason = isUniquenessViolation ? 'UNIQUENESS_VIOLATION' : (isAlreadyExists ? 'already_exists' : 'conflict');
                console.info('Duplicate detected, skipping user', { status, reason, snippet });
                importLog('Duplicate detected, skipping user', { status, reason, snippet, username: userPayload.username, email: userPayload.email });
            } else {
                failed++;
                importStatus.errors++;
                const snippet = (bodyStr.slice(0, 500) || '').replace(/\s+/g, ' ');
                console.warn('Create user failed', { status, message: err?.message, snippet });
                try {
                    importLogger.warn('Create user failed', { status, message: err?.message, snippet, username: userPayload.username, email: userPayload.email, populationId, sessionId });
                } catch (_) {}
                importLog('Create user failed', { status, message: err?.message, snippet, username: userPayload.username, email: userPayload.email });
                if (status === 429) {
                    console.warn('[ImportWorker] Rate limited when creating user. Consider adjusting throughput or enabling backoff.');
                    importLog('Rate limited (429) during create', { username: userPayload.username, email: userPayload.email });
                }
            }
        } finally {
            importStatus.processed++;
            await emitProgress();
        }
    };

    if (CONCURRENCY === 1) {
        for (const row of data) {
            await processOne(row);
        }
    } else {
        const workers = new Array(CONCURRENCY).fill(0).map(async () => {
            while (true) {
                const i = nextIndex++;
                if (i >= data.length) break;
                await processOne(data[i]);
            }
        });
        await Promise.all(workers);
    }

    // Complete
    importStatus.isRunning = false;
    importStatus.endTime = Date.now();
    importStatus.status = 'completed';
    importStatus.progress = 100;

    try {
        if (realtimeManager && sessionId) {
            const payload = {
                processed: importStatus.processed,
                total: totalRecords,
                stats: {
                    created,
                    failed,
                    skipped,
                    errors: importStatus.errors,
                    warnings: importStatus.warnings
                },
                durationMs: importStatus.endTime - importStatus.startTime,
                fileName: importStatus.currentFile,
                // Non-breaking additional diagnostics
                environmentId,
                populationId,
                createdEmailsSample: createdEmails.slice(0, 5)
            };
            console.log(`[ImportWorker] Emitting completion`, {
                sessionId,
                processed: payload.processed,
                total: payload.total,
                created: payload.stats.created,
                skipped: payload.stats.skipped,
                failed: payload.stats.failed,
                durationMs: payload.durationMs
            });
            importLog('Import completed', { sessionId, processed: payload.processed, total: payload.total, created: payload.stats.created, skipped: payload.stats.skipped, failed: payload.stats.failed, durationMs: payload.durationMs, environmentId, populationId });
            await realtimeManager.sendToSession(sessionId, 'completion', payload, { queue: true });
        }
    } catch (e) {
        console.warn('Failed to emit completion event:', e.message);
    }

    // Optional: send welcome emails
    if (sendWelcome) {
        const emails = extractEmailsFromCsv(csvContent || '');
        if (emails.length > 0) {
            await sendWelcomeEmailBatch(emails);
        }
    }
}

export default router;
