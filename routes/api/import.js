/**
 * Import API Routes
 * 
 * Provides endpoints for import operations and status monitoring.
 * These endpoints support the ImportSubsystem and related UI components.
 */

import express from 'express';
import multer from 'multer';
import nodemailer from 'nodemailer';
import { parse as csvParseStream } from 'csv-parse';
import { promises as fsp, createReadStream, unlinkSync } from 'fs';
import os from 'os';
import path from 'path';
import fetch from 'node-fetch';
const router = express.Router();

// Configure multer for file uploads (disk storage for large files)
const upload = multer({ 
    limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB
    storage: multer.diskStorage({
        destination: (_, __, cb) => cb(null, os.tmpdir()),
        filename: (_, file, cb) => {
            const safe = `${Date.now()}-${(file.originalname || 'upload.csv').replace(/[^a-zA-Z0-9_.-]+/g,'_')}`;
            cb(null, safe);
        }
    })
});

// In-memory storage for import status (in production, use database)
let importStatus = {
    isRunning: false,
    progress: 0,
    total: 0,
    processed: 0,
    skipped: 0,
    errors: 0,
    warnings: 0,
    startTime: null,
    endTime: null,
    currentFile: null,
    sessionId: null,
    status: 'idle', // idle, running, completed, failed, cancelled
    lastError: null,
    recentErrors: [],
    sessionLog: [] // in-memory event log for current session
};

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
                skipped: importStatus.skipped,
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
            sessionId: importStatus.sessionId,
            lastError: importStatus.lastError,
            recentErrors: importStatus.recentErrors
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
            skipped: 0,
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

        res.success('Import operation cancelled', { status: importStatus.status });
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
            skipped: 0,
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
router.post('/import', upload.single('file'), async (req, res) => {
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.error('No file uploaded', { code: 'NO_FILE_UPLOADED' }, 400);
        }

        // Check if population ID was provided
        if (!req.body.populationId) {
            return res.error('Population ID is required', { code: 'POPULATION_ID_REQUIRED' }, 400);
        }

        // Get file details
        const fileName = req.file.originalname;
        const fileSize = req.file.size;
        const tempPath = req.file.path;

        // Validate-only: stream count and return
        if (String(req.body.validateOnly) === 'true') {
            const totalRecords = await countCsvRows(tempPath);
            try { unlinkSync(tempPath); } catch (_) {}
            return res.success('File validated', { total: totalRecords, fileName, fileSize });
        }

        const totalRecords = await countCsvRows(tempPath);
        
        // Generate session ID
        const sessionId = `import_${Date.now()}`;
        
        // Update import status
        importStatus = {
            isRunning: true,
            progress: 0,
            total: totalRecords,
            processed: 0,
            skipped: 0,
            errors: 0,
            warnings: 0,
            startTime: Date.now(),
            endTime: null,
            currentFile: fileName,
            sessionId: sessionId,
            status: 'running',
            lastError: null,
            recentErrors: [],
            sessionLog: []
        };
        importStatus.sessionLog.push({ ts: new Date().toISOString(), type: 'start', file: fileName, total: totalRecords, sessionId: importStatus.sessionId });
        
        // Log import start
        console.log(`🔄 Import started: ${fileName}, ${totalRecords} records, session: ${sessionId}`);
        
        // Return success response immediately
        const importBehavior = String(req.body.importBehavior || 'create').toLowerCase();
        const importMode = String(req.body.importMode || 'auto').toLowerCase();

        res.success('Import started successfully', { 
            sessionId: sessionId, 
            total: totalRecords, 
            fileName: fileName, 
            fileSize: fileSize, 
            populationId: req.body.populationId,
            importBehavior,
            importMode
        });
        
        // Launch background import job (streaming)
        runImportJobStream({
            sessionId,
            tempPath,
            populationId: req.body.populationId,
            sendWelcome: String(req.body.sendWelcome) === 'true',
            app: req.app,
            importBehavior,
            importMode
        }).catch(err => {
            console.error('Import job failed:', err);
            importStatus.isRunning = false;
            importStatus.status = 'failed';
        });
        
    } catch (error) {
        console.error('Import error:', error);
        res.error('Failed to start import', { code: 'IMPORT_START_ERROR', details: error.message }, 500);
    }
});

/**
 * GET /api/import/template
 * Download CSV template for user import
 */
router.get('/template', (req, res) => {
    try {
        const csvTemplate = `username,email,givenname,familyname,population
user1@example.com,user1@example.com,John,Doe,Default Population
user2@example.com,user2@example.com,Jane,Smith,Default Population`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="user-import-template.csv"');
        res.send(csvTemplate);
    } catch (error) {
        res.error('Failed to generate template', { code: 'TEMPLATE_GENERATION_ERROR', details: error.message }, 500);
    }
});

/**
 * POST /api/ (legacy endpoint for backward compatibility)
 * Redirects to /api/import
 */
router.post('/', upload.single('file'), async (req, res) => {
    // Redirect to the main import endpoint
    req.url = '/import';
    return router._router.handle(req, res);
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
        console.log(`✉️ Sent welcome emails to ${emails.length} recipients`);
    } catch (err) {
        console.warn('Failed to send welcome emails:', err.message);
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

async function runImportJobStream({ sessionId, tempPath, populationId, sendWelcome, app, importBehavior, importMode }) {
    try {
        const total = importStatus.total || 0;
        importStatus.total = total;
        importStatus.processed = 0;
        importStatus.errors = 0;
        importStatus.warnings = 0;
        importStatus.lastError = null;
        importStatus.recentErrors = [];

        // Get PingOne info
        const tokenManager = app.get('tokenManager');
        const environmentId = await tokenManager.getEnvironmentId();
        const apiBaseUrl = tokenManager.getApiBaseUrl();
        const token = await tokenManager.getAccessToken();

        // Visible diagnostics
        console.log(`[IMPORT] Session ${sessionId}: env=${environmentId} apiBase=${apiBaseUrl}`);
        console.log(`[IMPORT] Session ${sessionId}: records=${total} populationId=${populationId}`);
        if (!token) {
            const msg = 'No access token available for PingOne import';
            console.error(`[IMPORT] ${msg}`);
            importStatus.lastError = msg;
            importStatus.recentErrors = [msg, ...(importStatus.recentErrors || [])].slice(0, 5);
            importStatus.isRunning = false;
            importStatus.status = 'failed';
            return;
        }

        const endpointBase = `${apiBaseUrl}/environments/${environmentId}/users`;
        const concurrency = Number(process.env.IMPORT_CONCURRENCY || 20);
        const rateLimitPerSec = Math.max(1, Number(process.env.IMPORT_RPS_LIMIT || 50));
        let tokens = rateLimitPerSec;
        let refillTimer = null;
        const waiters = [];
        const grant = () => {
            while (tokens > 0 && waiters.length > 0) {
                tokens--;
                const resolve = waiters.shift();
                try { resolve(); } catch (_) {}
            }
        };
        const rateLimiter = {
            acquire: async () => {
                if (tokens > 0) {
                    tokens--;
                    return;
                }
                await new Promise(resolve => waiters.push(resolve));
            }
        };

        let inFlight = 0;
        let idx = 0;
        const rowsBuffer = [];
        let ended = false;

        await new Promise((resolve, reject) => {
            // Refill tokens every second and nudge the queue
            refillTimer = setInterval(() => {
                tokens = rateLimitPerSec;
                grant();
                queueNext();
            }, 1000);

            const queueNext = () => {
                while (inFlight < concurrency) {
                    const row = rowsBuffer.shift();
                    if (!row) break;
                    const rowNumber = ++idx;
                    if (rowNumber <= 3) {
                        const dbgUser = row.username || row.userName || row.login || row.email || '(no-username)';
                        console.log(`[IMPORT] Creating PingOne user [row ${rowNumber}/${importStatus.total || '?'}] user=${dbgUser}`);
                    }
                                            // Acquire rate-limit token before dispatching
                        rateLimiter.acquire().then(() => {
                            inFlight++;
                            
                            // Determine action based on import behavior
                            if (importBehavior === 'upsert') {
                                // Try to update first, then create if not found
                                updatePingOneUserWithRetry(endpointBase, token, populationId, row)
                                    .then(() => {
                                        importStatus.processed++;
                                        if (importStatus.processed % 100 === 0) {
                                            importStatus.sessionLog.push({ ts: new Date().toISOString(), type: 'progress', processed: importStatus.processed, total: importStatus.total });
                                        }
                                    })
                                    .catch((err) => {
                                        // If update fails, try to create
                                        createPingOneUserWithRetry(endpointBase, token, populationId, row)
                                            .then(() => {
                                                importStatus.processed++;
                                                if (importStatus.processed % 100 === 0) {
                                                    importStatus.sessionLog.push({ ts: new Date().toISOString(), type: 'progress', processed: importStatus.processed, total: importStatus.total });
                                                }
                                            })
                                            .catch((createErr) => {
                                                importStatus.errors++;
                                                const msg = (createErr && createErr.message) ? String(createErr.message).slice(0, 500) : 'Unknown PingOne error';
                                                importStatus.lastError = msg;
                                                importStatus.recentErrors = [msg, ...(importStatus.recentErrors || [])].slice(0, 5);
                                                importStatus.sessionLog.push({ ts: new Date().toISOString(), type: 'error', row: rowNumber, message: msg });
                                                console.error(`[IMPORT] Error creating user at row ${rowNumber}: ${msg}`);
                                            })
                                            .finally(() => {
                                                inFlight--;
                                                const denom = importStatus.total > 0 ? importStatus.total : Math.max(importStatus.processed + importStatus.errors, 1);
                                                importStatus.progress = Math.round((importStatus.processed / denom) * 100);
                                                queueNext();
                                                if (ended && rowsBuffer.length === 0 && inFlight === 0) resolve();
                                            });
                                    })
                                    .finally(() => {
                                        inFlight--;
                                        const denom = importStatus.total > 0 ? importStatus.total : Math.max(importStatus.processed + importStatus.errors, 1);
                                        importStatus.progress = Math.round((importStatus.processed / denom) * 100);
                                        queueNext();
                                        if (ended && rowsBuffer.length === 0 && inFlight === 0) resolve();
                                    });
                                return;
                                                        }
                            
                            // Default behavior: create new users only (importBehavior === 'create')
                            createPingOneUserWithRetry(endpointBase, token, populationId, row)
                            .then(() => {
                                importStatus.processed++;
                                if (importStatus.processed % 100 === 0) {
                                    importStatus.sessionLog.push({ ts: new Date().toISOString(), type: 'progress', processed: importStatus.processed, total: importStatus.total });
                                }
                            })
                            .catch((err) => {
                                const raw = String(err && err.message || '');
                                let countedAsSkip = false;
                                try {
                                    // Try to detect uniqueness violation from PingOne error body
                                    const jsonStart = raw.indexOf('{');
                                    if (jsonStart !== -1) {
                                        const body = JSON.parse(raw.slice(jsonStart));
                                        const details = Array.isArray(body.details) ? body.details : [];
                                        if (body.code === 'INVALID_DATA' && details.some(d => d.code === 'UNIQUENESS_VIOLATION')) {
                                            importStatus.skipped++;
                                            importStatus.sessionLog.push({ ts: new Date().toISOString(), type: 'skip', row: rowNumber, reason: 'UNIQUENESS_VIOLATION', user: row.username || row.email });
                                            countedAsSkip = true;
                                        }
                                    }
                                } catch (_) { /* ignore parse errors */ }
                                if (!countedAsSkip) {
                                    importStatus.errors++;
                                    const msg = raw ? raw.slice(0, 500) : 'Unknown PingOne error';
                                    importStatus.lastError = msg;
                                    importStatus.recentErrors = [msg, ...(importStatus.recentErrors || [])].slice(0, 5);
                                    importStatus.sessionLog.push({ ts: new Date().toISOString(), type: 'error', row: rowNumber, message: msg });
                                    console.error(`[IMPORT] Error creating user at row ${rowNumber}: ${msg}`);
                                }
                            })
                            .finally(() => {
                                inFlight--;
                                const denom = importStatus.total > 0 ? importStatus.total : Math.max(importStatus.processed + importStatus.errors, 1);
                                importStatus.progress = Math.round((importStatus.processed / denom) * 100);
                                queueNext();
                                if (ended && rowsBuffer.length === 0 && inFlight === 0) resolve();
                            });
                    });
                }
            };

            const parser = csvParseStream({ columns: true, trim: true, skip_empty_lines: true });
            parser.on('readable', () => {
                let record;
                while ((record = parser.read()) !== null) {
                    rowsBuffer.push(record);
                }
                queueNext();
            });
            parser.on('error', (err) => reject(err));
            parser.on('end', () => { ended = true; queueNext(); if (rowsBuffer.length === 0 && inFlight === 0) resolve(); });

            createReadStream(tempPath, { encoding: 'utf8' }).pipe(parser);
        });

        // Optional welcome emails
        if (sendWelcome) {
            const csv = await fsp.readFile(tempPath, 'utf8').catch(() => '');
            const emails = extractEmailsFromCsv(csv || '');
            if (emails.length > 0) await sendWelcomeEmailBatch(emails);
        }

        importStatus.isRunning = false;
        importStatus.endTime = Date.now();
        importStatus.status = 'completed';
        importStatus.progress = 100;
        console.log(`✅ Import completed: ${sessionId}, ${total} records processed`);
        importStatus.sessionLog.push({ ts: new Date().toISOString(), type: 'complete', processed: importStatus.processed, errors: importStatus.errors, total: importStatus.total });
        try { unlinkSync(tempPath); } catch (_) {}
    } catch (err) {
        console.error('runImportJob error:', err);
        importStatus.isRunning = false;
        importStatus.status = 'failed';
        const msg = (err && err.message) ? String(err.message).slice(0, 500) : 'Unknown import error';
        importStatus.lastError = msg;
        importStatus.recentErrors = [msg, ...(importStatus.recentErrors || [])].slice(0, 5);
        importStatus.sessionLog.push({ ts: new Date().toISOString(), type: 'fatal', message: msg });
        try { unlinkSync(tempPath); } catch (_) {}
    }
    finally {
        // Cleanup token bucket timer if set
        try { if (typeof refillTimer !== 'undefined' && refillTimer) clearInterval(refillTimer); } catch (_) {}
    }

// Count CSV rows efficiently via stream (minus header)
async function countCsvRows(filePath) {
    return new Promise((resolve, reject) => {
        let count = 0;
        let seenHeader = false;
        const parser = csvParseStream({ columns: false, trim: true, skip_empty_lines: true });
        parser.on('readable', () => {
            let rec;
            while ((rec = parser.read()) !== null) {
                if (!seenHeader) { seenHeader = true; continue; }
                count++;
            }
        });
        parser.on('error', (e) => reject(e));
        parser.on('end', () => resolve(count));
        createReadStream(filePath, { encoding: 'utf8' }).pipe(parser);
    });
}

// Retry wrapper with backoff
async function createPingOneUserWithRetry(endpoint, token, populationId, row, attempt = 0) {
    const maxAttempts = 5;
    const baseDelay = 300;
    try {
        return await createPingOneUser(endpoint, token, populationId, row);
    } catch (err) {
        const message = String(err?.message || '').toLowerCase();
        const transient = /429|rate|throttle|timeout|5\d\d/.test(message);
        if (transient && attempt < maxAttempts) {
            const jitter = Math.floor(Math.random() * 200);
            const delay = Math.min(5000, baseDelay * Math.pow(2, attempt)) + jitter;
            await new Promise(r => setTimeout(r, delay));
            return createPingOneUserWithRetry(endpoint, token, populationId, row, attempt + 1);
        }
        throw err;
    }
}
}

async function updatePingOneUserWithRetry(endpointBase, token, populationId, row, attempt = 0) {
    const maxAttempts = 5;
    const baseDelay = 300;
    try {
        return await updatePingOneUser(endpointBase, token, populationId, row);
    } catch (err) {
        const message = String(err?.message || '').toLowerCase();
        const transient = /429|rate|throttle|timeout|5\d\d/.test(message);
        if (transient && attempt < maxAttempts) {
            const jitter = Math.floor(Math.random() * 200);
            const delay = Math.min(5000, baseDelay * Math.pow(2, attempt)) + jitter;
            await new Promise(r => setTimeout(r, delay));
            return updatePingOneUserWithRetry(endpointBase, token, populationId, row, attempt + 1);
        }
        throw err;
    }
}

// Remove empty strings/arrays/objects recursively
function pruneEmpty(value) {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'string') {
        const v = value.trim();
        return v === '' ? undefined : value;
    }
    if (Array.isArray(value)) {
        const arr = value.map(pruneEmpty).filter(v => v !== undefined);
        return arr.length ? arr : undefined;
    }
    if (typeof value === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            const pv = pruneEmpty(v);
            if (pv !== undefined) out[k] = pv;
        }
        return Object.keys(out).length ? out : undefined;
    }
    return value;
}

async function createPingOneUser(endpoint, token, populationId, row) {
    // Support multiple CSV header variants (case/spacing)
    const username = row.username || row.userName || row.login || row.email || row.Username || row['User Name'] || row.UserName || '';
    const email = row.email || row.Email || row.mail || row['E-mail'] || '';
    let given = row.givenName || row['name.given'] || row.first_name || row.firstname || row.firstName || row['First Name'] || row.given || '';
    let family = row.familyName || row['name.family'] || row.last_name || row.lastname || row.lastName || row['Last Name'] || row.family || '';
    const enabled = typeof row.enabled !== 'undefined'
        ? String(row.enabled).toLowerCase() !== 'false' && String(row.enabled).toLowerCase() !== 'disabled'
        : (row.status ? String(row.status).toLowerCase() !== 'disabled' : true);

    // Derive missing names from common alternatives to avoid PingOne 400s and avoid sending blanks
    const fullName = row.fullName || row.displayName || row.name || '';
    const clean = (s) => (typeof s === 'string' ? s.trim() : '').replace(/\s+/g, ' ');
    const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '');

    const tryFromFullName = () => {
        const n = clean(fullName);
        if (!n) return null;
        const parts = n.split(' ');
        if (parts.length === 1) return { given: cap(parts[0]), family: 'User' };
        return { given: cap(parts[0]), family: cap(parts.slice(1).join(' ')) };
    };

    const tryFromIdentifier = (id) => {
        const v = clean(id);
        if (!v) return null;
        const local = v.includes('@') ? v.split('@')[0] : v;
        const segs = local.split(/[._-]+/).filter(Boolean);
        if (segs.length >= 2) return { given: cap(segs[0]), family: cap(segs[1]) };
        if (segs.length === 1) return { given: cap(segs[0]), family: 'User' };
        return null;
    };

    if (!given && !family) {
        const derived = tryFromFullName() || tryFromIdentifier(email) || tryFromIdentifier(username) || { given: '', family: '' };
        given = derived.given || '';
        family = derived.family || '';
    } else {
        // If one side missing, attempt to derive it
        if (!given) {
            const d = tryFromFullName() || tryFromIdentifier(email) || tryFromIdentifier(username);
            if (d?.given) given = d.given;
        }
        if (!family) {
            const d = tryFromFullName() || tryFromIdentifier(email) || tryFromIdentifier(username);
            if (d?.family) family = d.family;
        }
    }

    const payload = {
        username: (username || email) || undefined,
        population: { id: populationId },
        // Only include name if both given and family are non-empty
        name: (given && family) ? { given, family } : undefined,
        emails: email ? [{ value: email, primary: true }] : undefined,
        enabled
    };
    const body = pruneEmpty(payload);
    // Emit a minimal request log into session for diagnostics
    importStatus.sessionLog.push({ ts: new Date().toISOString(), type: 'request', endpoint, user: username || email, populationId });

    const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        const truncated = txt && txt.length > 1000 ? txt.slice(0, 1000) + '…' : txt;
        throw new Error(`User create failed: ${resp.status} ${resp.statusText} ${truncated}`);
    }
}

async function updatePingOneUser(endpointBase, token, populationId, row) {
    // Identify user by username or email
    const username = row.username || row.userName || row.login || row.Username || row['User Name'] || row.UserName || '';
    const email = row.email || row.Email || row.mail || row['E-mail'] || '';
    const identifier = username || email;
    if (!identifier) throw new Error('Update requires username or email');

    // Lookup user id
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    const searchUrl = username
        ? `${endpointBase}?filter=username eq "${identifier}"`
        : `${endpointBase}?filter=email eq "${identifier}"`;
    const searchResp = await fetch(encodeURI(searchUrl), { headers });
    if (!searchResp.ok) {
        const t = await searchResp.text().catch(()=>'');
        throw new Error(`Lookup failed: ${searchResp.status} ${searchResp.statusText} ${t}`);
    }
    const data = await searchResp.json().catch(()=>({}));
    const user = data?._embedded?.users?.[0];
    if (!user || !user.id) throw new Error('User not found for update');

    // Build patch body, prune empty
    const given = row.givenName || row['name.given'] || row.first_name || row.firstname || row.firstName || row['First Name'] || row.given || '';
    const family = row.familyName || row['name.family'] || row.last_name || row.lastname || row.lastName || row['Last Name'] || row.family || '';
    const payload = {
        population: populationId ? { id: populationId } : undefined,
        // Only include name if both sides present
        name: (given && family) ? { given, family } : undefined,
        emails: email ? [{ value: email, primary: true }] : undefined,
    };
    const body = pruneEmpty(payload);

    const patchUrl = `${endpointBase}/${encodeURIComponent(user.id)}`;
    const patchResp = await fetch(patchUrl, { method: 'PATCH', headers, body: JSON.stringify(body) });
    if (!patchResp.ok) {
        const txt = await patchResp.text().catch(()=> '');
        throw new Error(`Update failed: ${patchResp.status} ${patchResp.statusText} ${txt}`);
    }
}

export default router;

/**
 * GET /api/import/log
 * Download the in-memory session log for the current/last import
 * Supports ?format=json|ndjson (default json)
 */
router.get('/log', (req, res) => {
    try {
        const format = String(req.query.format || 'json').toLowerCase();
        const filename = `import-log-${new Date().toISOString().split('T')[0]}.${format === 'ndjson' ? 'ndjson' : 'json'}`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        if (format === 'ndjson') {
            res.setHeader('Content-Type', 'application/x-ndjson');
            const lines = (importStatus.sessionLog || []).map(e => JSON.stringify(e)).join('\n');
            return res.send(lines);
        }
        res.setHeader('Content-Type', 'application/json');
        return res.send(JSON.stringify({
            sessionId: importStatus.sessionId,
            summary: {
                status: importStatus.status,
                processed: importStatus.processed,
                total: importStatus.total,
                errors: importStatus.errors,
                warnings: importStatus.warnings,
                startTime: importStatus.startTime,
                endTime: importStatus.endTime
            },
            lastError: importStatus.lastError,
            recentErrors: importStatus.recentErrors,
            events: importStatus.sessionLog || []
        }, null, 2));
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
