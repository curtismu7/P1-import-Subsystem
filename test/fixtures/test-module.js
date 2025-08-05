import fs from 'fs';
import path from 'path';
import { promisify, inspect } from 'util';
import { utils as helpers } from './helpers';
import { join as join } from 'path';
import { dirname as dirname } from 'path';

/**
 * Test module with various CommonJS patterns
 * This will be used to test the enhanced module converter
 */

const logger = require('../../server/logger').getLogger('test-module');

// Submodule require

// Function declaration
function processData(data) {
    return data.map(item => {
        return {
            id: item.id,
            name: item.name,
            processed: true
        };
    });
}

// Class declaration
class DataProcessor {
    constructor(options) {
        this.options = options || {};
        this.logger = logger;
    }

    process(data) {
        return processData(data);
    }
}

// Named exports

// Named exports with module.exports

// Object.assign exports
Object.assign(exports, {
    version: '1.0.0',
    author: 'PingOne Import Tool Team',
    constants: {
        MAX_ITEMS: 1000,
        TIMEOUT: 30000
    }
});

// Default export (will override previous exports)
// export default DataProcessor;

export { processData };
export { DataProcessor };
export const utils = {
    isValid: (data) => !!data,
    format: (data) => JSON.stringify(data, null, 2)
};