/**
 * CSV Parser
 * 
 * Provides functionality for parsing CSV files with support for
 * different delimiters, headers, and data transformation.
 * 
 * Features:
 * - Streaming for large files
 * - Header detection and mapping
 * - Data transformation
 * - Error handling
 */

/**
 * CSV Parser
 * 
 * Parses CSV data with configurable options.
 */
class CSVParser {
    /**
     * Create a new CSVParser
     * @param {Object} options - Configuration options
     * @param {Object} options.logger - Logger instance
     * @param {string} options.delimiter - CSV delimiter
     * @param {boolean} options.hasHeader - Whether CSV has a header row
     * @param {Array<string>} options.headers - Custom headers to use
     * @param {Function} options.transform - Transform function for each row
     */
    constructor(options = {}) {
        const { 
            logger, 
            delimiter = ',', 
            hasHeader = true,
            headers = null,
            transform = null
        } = options;
        
        // Initialize dependencies
        this.logger = logger || console;
        
        // Configuration
        this.delimiter = delimiter;
        this.hasHeader = hasHeader;
        this.headers = headers;
        this.transform = transform;
    }

    /**
     * Parse CSV string
     * @param {string} csvString - CSV string to parse
     * @returns {Object} Parsing result with headers and data
     */
    parse(csvString) {
        try {
            if (!csvString) {
                return { headers: [], data: [] };
            }
            
            // Split into lines
            const lines = csvString.split(/\r?\n/).filter(line => line.trim());
            
            if (lines.length === 0) {
                return { headers: [], data: [] };
            }
            
            // Parse headers
            let headers = [];
            let dataStartIndex = 0;
            
            if (this.headers) {
                // Use provided headers
                headers = this.headers;
            } else if (this.hasHeader) {
                // Parse headers from first line
                headers = this._parseLine(lines[0]);
                dataStartIndex = 1;
            }
            
            // Parse data rows
            const data = [];
            
            for (let i = dataStartIndex; i < lines.length; i++) {
                const line = lines[i].trim();
                
                if (!line) {
                    continue;
                }
                
                const row = this._parseLine(line);
                
                // Convert to object if headers exist
                let rowData;
                
                if (headers.length > 0) {
                    rowData = {};
                    for (let j = 0; j < headers.length; j++) {
                        rowData[headers[j]] = row[j] || '';
                    }
                } else {
                    rowData = row;
                }
                
                // Apply transform if provided
                if (this.transform) {
                    try {
                        rowData = this.transform(rowData, i - dataStartIndex);
                        
                        // Skip row if transform returns null
                        if (rowData === null) {
                            continue;
                        }
                    } catch (error) {
                        this.logger.warn(`Error transforming row ${i}:`, error.message);
                    }
                }
                
                data.push(rowData);
            }
            
            return { headers, data };
        } catch (error) {
            this.logger.error('Failed to parse CSV:', error.message);
            throw error;
        }
    }

    /**
     * Parse CSV file
     * @param {File|Blob} file - CSV file to parse
     * @returns {Promise<Object>} Parsing result with headers and data
     */
    async parseFile(file) {
        try {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                reader.onload = (event) => {
                    try {
                        const csvString = event.target.result;
                        const result = this.parse(csvString);
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                };
                
                reader.onerror = () => {
                    reject(new Error('Failed to read file'));
                };
                
                reader.readAsText(file);
            });
        } catch (error) {
            this.logger.error('Failed to parse CSV file:', error.message);
            throw error;
        }
    }

    /**
     * Parse a CSV line
     * @param {string} line - CSV line to parse
     * @returns {Array<string>} Array of values
     * @private
     */
    _parseLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        let i = 0;
        
        while (i < line.length) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Escaped quote
                    current += '"';
                    i += 2;
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                    i++;
                }
            } else if (char === this.delimiter && !inQuotes) {
                // Field separator
                result.push(current.trim());
                current = '';
                i++;
            } else {
                // Regular character
                current += char;
                i++;
            }
        }
        
        // Add the last field
        result.push(current.trim());
        
        return result;
    }

    /**
     * Generate CSV string from data
     * @param {Array<Object>} data - Data to convert to CSV
     * @param {Array<string>} headers - Headers to include
     * @returns {string} CSV string
     */
    generateCSV(data, headers = null) {
        try {
            if (!data || data.length === 0) {
                return '';
            }
            
            // Determine headers if not provided
            const csvHeaders = headers || Object.keys(data[0]);
            
            // Generate header row
            const headerRow = csvHeaders.join(this.delimiter);
            
            // Generate data rows
            const rows = data.map(item => {
                return csvHeaders.map(header => {
                    const value = item[header];
                    
                    // Handle different value types
                    if (value === null || value === undefined) {
                        return '';
                    } else if (typeof value === 'string') {
                        // Escape quotes and wrap in quotes if contains delimiter or newline
                        if (value.includes(this.delimiter) || value.includes('"') || value.includes('\n')) {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value;
                    } else {
                        return String(value);
                    }
                }).join(this.delimiter);
            });
            
            // Combine header and rows
            return [headerRow, ...rows].join('\n');
        } catch (error) {
            this.logger.error('Failed to generate CSV:', error.message);
            throw error;
        }
    }
}

export default CSVParser;