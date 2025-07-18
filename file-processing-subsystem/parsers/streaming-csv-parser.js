/**
 * Streaming CSV Parser
 * 
 * Provides functionality for parsing large CSV files using streaming
 * to avoid memory issues with very large files.
 * 
 * Features:
 * - Streaming processing for large files
 * - Chunk-based processing
 * - Progress reporting
 * - Memory efficient
 */

import CSVParser from './csv-parser.js';

/**
 * Streaming CSV Parser
 * 
 * Parses large CSV files using streaming approach.
 */
class StreamingCSVParser extends CSVParser {
    /**
     * Create a new StreamingCSVParser
     * @param {Object} options - Configuration options
     * @param {number} options.chunkSize - Size of each chunk to process
     * @param {Function} options.onProgress - Progress callback
     * @param {Function} options.onChunk - Chunk processing callback
     */
    constructor(options = {}) {
        super(options);
        
        const {
            chunkSize = 64 * 1024, // 64KB chunks
            onProgress = null,
            onChunk = null
        } = options;
        
        this.chunkSize = chunkSize;
        this.onProgress = onProgress;
        this.onChunk = onChunk;
    }

    /**
     * Parse CSV file using streaming approach
     * @param {File|Blob} file - CSV file to parse
     * @returns {Promise<Object>} Parsing result with headers and data
     */
    async parseFileStreaming(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            let buffer = '';
            let headers = [];
            let data = [];
            let headersParsed = false;
            let totalBytesRead = 0;
            let currentChunk = 0;
            
            const processChunk = (chunk) => {
                buffer += chunk;
                const lines = buffer.split(/\r?\n/);
                
                // Keep the last incomplete line in buffer
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (!line.trim()) continue;
                    
                    const parsedLine = this._parseLine(line);
                    
                    if (!headersParsed) {
                        if (this.headers) {
                            headers = this.headers;
                        } else if (this.hasHeader) {
                            headers = parsedLine;
                            headersParsed = true;
                            continue;
                        }
                        headersParsed = true;
                    }
                    
                    // Convert to object if headers exist
                    let rowData;
                    if (headers.length > 0) {
                        rowData = {};
                        for (let j = 0; j < headers.length; j++) {
                            rowData[headers[j]] = parsedLine[j] || '';
                        }
                    } else {
                        rowData = parsedLine;
                    }
                    
                    // Apply transform if provided
                    if (this.transform) {
                        try {
                            rowData = this.transform(rowData, data.length);
                            if (rowData === null) continue;
                        } catch (error) {
                            this.logger.warn(`Error transforming row:`, error.message);
                        }
                    }
                    
                    data.push(rowData);
                }
                
                // Call chunk callback if provided
                if (this.onChunk) {
                    this.onChunk(data.length, headers);
                }
                
                // Report progress
                if (this.onProgress) {
                    const progress = Math.min((totalBytesRead / file.size) * 100, 100);
                    this.onProgress(progress, totalBytesRead, file.size);
                }
            };
            
            const readNextChunk = (offset) => {
                if (offset >= file.size) {
                    // Process any remaining buffer
                    if (buffer.trim()) {
                        const parsedLine = this._parseLine(buffer);
                        
                        if (!headersParsed) {
                            if (this.headers) {
                                headers = this.headers;
                            } else if (this.hasHeader) {
                                headers = parsedLine;
                                resolve({ headers, data });
                                return;
                            }
                        }
                        
                        let rowData;
                        if (headers.length > 0) {
                            rowData = {};
                            for (let j = 0; j < headers.length; j++) {
                                rowData[headers[j]] = parsedLine[j] || '';
                            }
                        } else {
                            rowData = parsedLine;
                        }
                        
                        if (this.transform) {
                            try {
                                rowData = this.transform(rowData, data.length);
                                if (rowData !== null) {
                                    data.push(rowData);
                                }
                            } catch (error) {
                                this.logger.warn(`Error transforming final row:`, error.message);
                            }
                        } else {
                            data.push(rowData);
                        }
                    }
                    
                    resolve({ headers, data });
                    return;
                }
                
                const blob = file.slice(offset, offset + this.chunkSize);
                const chunkReader = new FileReader();
                
                chunkReader.onload = (event) => {
                    const chunk = event.target.result;
                    totalBytesRead += chunk.length;
                    currentChunk++;
                    
                    try {
                        processChunk(chunk);
                        
                        // Read next chunk
                        setTimeout(() => readNextChunk(offset + this.chunkSize), 0);
                    } catch (error) {
                        reject(error);
                    }
                };
                
                chunkReader.onerror = () => {
                    reject(new Error(`Failed to read chunk ${currentChunk}`));
                };
                
                chunkReader.readAsText(blob);
            };
            
            // Start reading
            readNextChunk(0);
        });
    }

    /**
     * Parse CSV file with automatic streaming detection
     * @param {File|Blob} file - CSV file to parse
     * @param {number} streamingThreshold - File size threshold for streaming (default 1MB)
     * @returns {Promise<Object>} Parsing result with headers and data
     */
    async parseFile(file, streamingThreshold = 1024 * 1024) {
        if (file.size > streamingThreshold) {
            this.logger.info(`File size (${file.size} bytes) exceeds threshold, using streaming parser`);
            return await this.parseFileStreaming(file);
        } else {
            this.logger.debug(`File size (${file.size} bytes) below threshold, using standard parser`);
            return await super.parseFile(file);
        }
    }
}

export default StreamingCSVParser;