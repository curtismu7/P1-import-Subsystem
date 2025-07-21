/**
 * Custom log formatter for improved readability with tail -f
 */
import winston from 'winston';

export const createReadableFormatter = () => {
    return winston.format.printf(({ timestamp, level, message, service, env, pid, version, appVersion, critical, ...meta }) => {
        // Human-readable format with separators for tail -f
        let out = '';
        out += '\n' + '='.repeat(80) + '\n';
        out += `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        
        // Add version info if present
        if (appVersion || version) {
            out += ` (v${appVersion || version})`;
        }
        
        // Add critical flag if present
        if (critical) {
            out += ' [CRITICAL]';
        }
        
        out += '\n';
        
        // Add service/env info
        if (service || env || pid) {
            out += `Service: ${service || 'unknown'} | Env: ${env || 'unknown'} | PID: ${pid || 'unknown'}\n`;
        }
        
        // Add meta information if present
        const extraMeta = { ...meta };
        if (Object.keys(extraMeta).length > 0) {
            out += 'Meta: ' + JSON.stringify(extraMeta, null, 2) + '\n';
        }
        
        out += '-'.repeat(80) + '\n';
        return out;
    });
};
