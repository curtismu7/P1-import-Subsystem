
/**
 * Security Utils - Prevents sensitive data exposure
 */
class SecurityUtils {
    static maskSensitiveData(data) {
        if (!data || typeof data !== 'object') return data;

        const sensitiveKeys = ['password', 'secret', 'token', 'key', 'credential'];
        const masked = { ...data };

        for (const key in masked) {
            if (sensitiveKeys.some(s => key.toLowerCase().includes(s.toLowerCase()))) {
                masked[key] = typeof masked[key] === 'string' && masked[key].length > 0
                    ? masked[key].substring(0, 4) + '***MASKED***'
                    : '***MASKED***';
            } else if (typeof masked[key] === 'object' && masked[key] !== null) {
                masked[key] = this.maskSensitiveData(masked[key]);
            }
        }

        return masked;
    }

    static sanitizeHTML(html) {
        const temp = document.createElement('div');
        temp.textContent = html;
        return temp.innerHTML;
    }
}

// Override console methods
const originalConsole = { ...console };
console.log = (...args) => originalConsole.log(...args.map(arg => 
    typeof arg === 'object' ? SecurityUtils.maskSensitiveData(arg) : arg
));
console.error = (...args) => originalConsole.error(...args.map(arg => 
    typeof arg === 'object' ? SecurityUtils.maskSensitiveData(arg) : arg
));

window.SecurityUtils = SecurityUtils;
