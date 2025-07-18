/**
 * History Manager Module
 * 
 * Handles loading and displaying operation history from the server.
 * Provides functionality to load, filter, and display operation logs.
 */

export class HistoryManager {
    constructor() {
        this.history = [];
        this.isLoading = false;
        this.currentPage = 1;
        this.itemsPerPage = 50;
        this.totalItems = 0;
    }

    /**
     * Load operation history from the server
     * @param {Object} options - Loading options
     * @param {number} options.limit - Number of items to load
     * @param {number} options.offset - Offset for pagination
     * @param {string} options.filter - Filter by operation type
     * @param {string} options.search - Search term
     * @returns {Promise<Array>} - Array of history items
     */
    async loadHistory(options = {}) {
        const requestId = `frontend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();
        
        console.log(`🔍 [HistoryManager Debug] ${requestId} - loadHistory() called with options:`, options);
        
        try {
            this.isLoading = true;
            console.log(`🔍 [HistoryManager Debug] ${requestId} - Set isLoading = true`);
            
            const params = new URLSearchParams();
            
            if (options.limit) {
                params.append('limit', options.limit);
                console.log(`🔍 [HistoryManager Debug] ${requestId} - Added limit parameter:`, options.limit);
            }
            
            if (options.offset) {
                params.append('offset', options.offset);
                console.log(`🔍 [HistoryManager Debug] ${requestId} - Added offset parameter:`, options.offset);
            }
            
            if (options.filter) {
                params.append('filter', options.filter);
                console.log(`🔍 [HistoryManager Debug] ${requestId} - Added filter parameter:`, options.filter);
            }
            
            if (options.search) {
                params.append('search', options.search);
                console.log(`🔍 [HistoryManager Debug] ${requestId} - Added search parameter:`, options.search);
            }

            const url = `/api/history?${params.toString()}`;
            console.log(`🔍 [HistoryManager Debug] ${requestId} - Making fetch request to:`, url);
            console.log(`🔍 [HistoryManager Debug] ${requestId} - Request parameters:`, params.toString());

            const response = await fetch(url);
            console.log(`🔍 [HistoryManager Debug] ${requestId} - Response received:`, {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                headers: Object.fromEntries(response.headers.entries())
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`🔍 [HistoryManager Debug] ${requestId} - Response not ok:`, {
                    status: response.status,
                    statusText: response.statusText,
                    errorText: errorText
                });
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`🔍 [HistoryManager Debug] ${requestId} - Response data:`, {
                success: data.success,
                historyCount: data.history ? data.history.length : 'no history property',
                total: data.total,
                limit: data.limit,
                offset: data.offset,
                hasHistory: !!data.history,
                historyType: Array.isArray(data.history) ? 'array' : typeof data.history
            });
            
            if (data.success === false) {
                console.error(`🔍 [HistoryManager Debug] ${requestId} - API returned success: false:`, data);
                throw new Error(data.error || 'Failed to load history');
            }

            this.history = data.history || data;
            this.totalItems = data.total || this.history.length;
            
            console.log(`🔍 [HistoryManager Debug] ${requestId} - Updated instance properties:`, {
                historyLength: this.history.length,
                totalItems: this.totalItems,
                historyType: Array.isArray(this.history) ? 'array' : typeof this.history
            });
            
            const duration = Date.now() - startTime;
            console.log(`🔍 [HistoryManager Debug] ${requestId} - loadHistory() completed in ${duration}ms`);
            
            return this.history;
            
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`🔍 [HistoryManager Debug] ${requestId} - Error in loadHistory() after ${duration}ms:`, error);
            console.error(`🔍 [HistoryManager Debug] ${requestId} - Error stack:`, error.stack);
            throw error;
        } finally {
            this.isLoading = false;
            console.log(`🔍 [HistoryManager Debug] ${requestId} - Set isLoading = false`);
        }
    }

    /**
     * Get current history data
     * @returns {Array} - Current history items
     */
    getHistory() {
        console.log(`🔍 [HistoryManager Debug] getHistory() called, returning ${this.history.length} items`);
        return this.history;
    }

    /**
     * Check if currently loading
     * @returns {boolean} - Loading state
     */
    isLoading() {
        console.log(`🔍 [HistoryManager Debug] isLoading() called, returning:`, this.isLoading);
        return this.isLoading;
    }

    /**
     * Get pagination info
     * @returns {Object} - Pagination information
     */
    getPaginationInfo() {
        const paginationInfo = {
            currentPage: this.currentPage,
            itemsPerPage: this.itemsPerPage,
            totalItems: this.totalItems,
            totalPages: Math.ceil(this.totalItems / this.itemsPerPage)
        };
        console.log(`🔍 [HistoryManager Debug] getPaginationInfo() called, returning:`, paginationInfo);
        return paginationInfo;
    }

    /**
     * Load next page of history
     * @returns {Promise<Array>} - Next page of history items
     */
    async loadNextPage() {
        console.log(`🔍 [HistoryManager Debug] loadNextPage() called, current page:`, this.currentPage);
        this.currentPage++;
        const offset = (this.currentPage - 1) * this.itemsPerPage;
        console.log(`🔍 [HistoryManager Debug] loadNextPage() - new page:`, this.currentPage, 'offset:', offset);
        
        return await this.loadHistory({
            limit: this.itemsPerPage,
            offset: offset
        });
    }

    /**
     * Load previous page of history
     * @returns {Promise<Array>} - Previous page of history items
     */
    async loadPreviousPage() {
        console.log(`🔍 [HistoryManager Debug] loadPreviousPage() called, current page:`, this.currentPage);
        if (this.currentPage > 1) {
            this.currentPage--;
            const offset = (this.currentPage - 1) * this.itemsPerPage;
            console.log(`🔍 [HistoryManager Debug] loadPreviousPage() - new page:`, this.currentPage, 'offset:', offset);
            
            return await this.loadHistory({
                limit: this.itemsPerPage,
                offset: offset
            });
        } else {
            console.log(`🔍 [HistoryManager Debug] loadPreviousPage() - already on first page, returning current history`);
        }
        
        return this.history;
    }

    /**
     * Filter history by operation type
     * @param {string} filter - Filter type (import, delete, modify, export)
     * @returns {Promise<Array>} - Filtered history items
     */
    async filterByType(filter) {
        console.log(`🔍 [HistoryManager Debug] filterByType() called with filter:`, filter);
        return await this.loadHistory({
            limit: this.itemsPerPage,
            filter: filter
        });
    }

    /**
     * Search history
     * @param {string} searchTerm - Search term
     * @returns {Promise<Array>} - Search results
     */
    async searchHistory(searchTerm) {
        console.log(`🔍 [HistoryManager Debug] searchHistory() called with searchTerm:`, searchTerm);
        return await this.loadHistory({
            limit: this.itemsPerPage,
            search: searchTerm
        });
    }

    /**
     * Clear current history data
     */
    clearHistory() {
        console.log(`🔍 [HistoryManager Debug] clearHistory() called`);
        console.log(`🔍 [HistoryManager Debug] clearHistory() - before:`, {
            historyLength: this.history.length,
            currentPage: this.currentPage,
            totalItems: this.totalItems
        });
        this.history = [];
        this.currentPage = 1;
        this.totalItems = 0;
        console.log(`🔍 [HistoryManager Debug] clearHistory() - after:`, {
            historyLength: this.history.length,
            currentPage: this.currentPage,
            totalItems: this.totalItems
        });
    }
} 