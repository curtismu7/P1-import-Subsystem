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

import { getLogger } from '../../server/logger';
const logger = getLogger('test-module');

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
export const version = '1.0.0';
export const author = 'PingOne Import Tool Team';
export const constants = {
    MAX_ITEMS: 1000,
    TIMEOUT: 30000
};

export { processData };
export { DataProcessor };
export const utils = {
    isValid: (data) => !!data,
    format: (data) => JSON.stringify(data, null, 2)
};