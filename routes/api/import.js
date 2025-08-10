/**
 * Import API Routes
 * 
 * Provides endpoints for import operations and status monitoring.
 * These endpoints support the ImportSubsystem and related UI components.
 */

import express from 'express';
import multer from 'multer';
import nodemailer from 'nodemailer';
import { parse } from 'csv-parse/sync';
import fetch from 'node-fetch';
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
    status: 'idle', // idle, running, completed, failed, cancelled
    lastError: null,
    recentErrors: []
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

        // Check if population ID was provided
        if (!req.body.populationId) {
            return res.error('Population ID is required', { code: 'POPULATION_ID_REQUIRED' }, 400);
        }

        // Get file details
        const fileName = req.file.originalname;
        const fileSize = req.file.size;
        const fileBuffer = req.file.buffer;
        
        // Parse CSV to get total records (simplified)
        const csvContent = fileBuffer.toString('utf8');
        const lines = csvContent.split('\n').filter(line => line.trim());
        const totalRecords = lines.length > 1 ? lines.length - 1 : 0; // Subtract header row
        
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
            status: 'running',
            lastError: null,
            recentErrors: []
        };
        
        // Log import start
        console.log(`🔄 Import started: ${fileName}, ${totalRecords} records, session: ${sessionId}`);
        
        // Return success response immediately
        res.success('Import started successfully', { 
            sessionId: sessionId, 
            total: totalRecords, 
            fileName: fileName, 
            fileSize: fileSize, 
            populationId: req.body.populationId 
        });
        
        // Launch background import job (real implementation)
        runImportJob({
            sessionId,
            csvContent,
            populationId: req.body.populationId,
            sendWelcome: String(req.body.sendWelcome) === 'true',
            app: req.app
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

async function runImportJob({ sessionId, csvContent, populationId, sendWelcome, app }) {
    try {
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });
        const total = records.length;
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

        const endpoint = `${apiBaseUrl}/environments/${environmentId}/users`;
        const concurrency = 5;
        let inFlight = 0;
        let idx = 0;

        await new Promise((resolve) => {
            const pump = async () => {
                while (inFlight < concurrency && idx < total) {
                    const row = records[idx++];
                    inFlight++;
                    createPingOneUser(endpoint, token, populationId, row)
                        .then(() => {
                            importStatus.processed++;
                        })
                        .catch((err) => {
                            importStatus.errors++;
                            const msg = (err && err.message) ? String(err.message).slice(0, 500) : 'Unknown PingOne error';
                            importStatus.lastError = msg;
                            importStatus.recentErrors = [msg, ...(importStatus.recentErrors || [])].slice(0, 5);
                        })
                        .finally(() => {
                            inFlight--;
                            importStatus.progress = Math.round((importStatus.processed / total) * 100);
                            if (importStatus.processed >= total && inFlight === 0) resolve();
                            else pump();
                        });
                }
            };
            pump();
        });

        // Optional welcome emails
        if (sendWelcome) {
            const emails = extractEmailsFromCsv(csvContent || '');
            if (emails.length > 0) await sendWelcomeEmailBatch(emails);
        }

        importStatus.isRunning = false;
        importStatus.endTime = Date.now();
        importStatus.status = 'completed';
        importStatus.progress = 100;
        console.log(`✅ Import completed: ${sessionId}, ${total} records processed`);
    } catch (err) {
        console.error('runImportJob error:', err);
        importStatus.isRunning = false;
        importStatus.status = 'failed';
    }
}

async function createPingOneUser(endpoint, token, populationId, row) {
    const username = row.username || row.userName || row.login || row.email;
    const given = row.givenName || row['name.given'] || row.first_name || row.firstname || row.firstName || '';
    const family = row.familyName || row['name.family'] || row.last_name || row.lastname || row.lastName || '';
    const email = row.email || row.mail || '';
    const enabled = typeof row.enabled !== 'undefined'
        ? String(row.enabled).toLowerCase() !== 'false' && String(row.enabled).toLowerCase() !== 'disabled'
        : (row.status ? String(row.status).toLowerCase() !== 'disabled' : true);

    const body = {
        username: username || undefined,
        population: { id: populationId },
        name: { given, family },
        emails: email ? [{ value: email, primary: true }] : [],
        enabled
    };
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
        throw new Error(`User create failed: ${resp.status} ${resp.statusText} ${txt}`);
    }
}

export default router;
