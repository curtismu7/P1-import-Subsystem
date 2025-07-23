
/**
 * Safe API Wrappers - Prevents common API misuse bugs
 */
class SafeAPI {
    static parseJSON(jsonString, defaultValue = null) {
        try {
            if (typeof jsonString !== 'string' || jsonString.trim() === '') {
                return defaultValue;
            }
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('JSON parse error:', error.message);
            return defaultValue;
        }
    }

    static getElement(selector, context = document) {
        try {
            const element = context.querySelector(selector);
            if (!element) {
                console.warn(`Element not found: ${selector}`);
            }
            return element;
        } catch (error) {
            console.error('Selector error:', error.message);
            return null;
        }
    }

    static getElements(selector, context = document) {
        try {
            return Array.from(context.querySelectorAll(selector));
        } catch (error) {
            console.error('Selector error:', error.message);
            return [];
        }
    }

    static parseInt(value, defaultValue = 0) {
        const result = parseInt(value, 10);
        return isNaN(result) ? defaultValue : result;
    }

    static async safeFetch(url, options = {}, timeout = 10000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`Request timeout: ${url}`);
            }
            throw error;
        }
    }
}

// Make available globally
window.SafeAPI = SafeAPI;
window.safeParseJSON = SafeAPI.parseJSON;
window.getElement = SafeAPI.getElement;
window.getElements = SafeAPI.getElements;
window.safeParseInt = SafeAPI.parseInt;
window.safeFetch = SafeAPI.safeFetch;
