// Simplified Logger for Import Maps prototype
export class Logger {
    constructor(name) {
        this.name = name;
        this.startTime = Date.now();
    }

    info(message, ...args) {
        console.log(`[${this.name}] INFO:`, message, ...args);
    }

    error(message, ...args) {
        console.error(`[${this.name}] ERROR:`, message, ...args);
    }

    debug(message, ...args) {
        console.debug(`[${this.name}] DEBUG:`, message, ...args);
    }

    warn(message, ...args) {
        console.warn(`[${this.name}] WARN:`, message, ...args);
    }
}

export function createLogger(name) {
    return new Logger(name);
}

export default Logger;
