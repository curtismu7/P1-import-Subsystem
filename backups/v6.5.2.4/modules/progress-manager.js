/**
 * Enhanced Progress Manager Module
 * 
 * Modern, real-time progress UI system with Socket.IO and WebSocket fallback:
 * - Real-time updates via Socket.IO (primary)
 * - WebSocket fallback for reliability
 * - Professional Ping Identity design system
 * - Responsive and accessible
 * - Enhanced visual feedback
 * - Step-by-step progress tracking
 * 
 * Features:
 * - Real-time progress updates via Socket.IO
 * - WebSocket fallback for connection issues
 * - Professional progress indicators
 * - Step-by-step operation tracking
 * - Enhanced error handling and recovery
 * - Accessibility compliance
 * - Production-ready logging
 */

import { createWinstonLogger } from './winston-logger.js';
import { ElementRegistry } from './element-registry.js';
import { sessionManager } from './session-manager.js';
import messageFormatter from './message-formatter.js';

// Enable debug mode for development (set to false in production)
const DEBUG_MODE = process.env.NODE_ENV !== 'production';

/**
 * Enhanced Progress Manager Class
 * 
 * Manages all progress-related UI updates with real-time Socket.IO and WebSocket integration
 */
class ProgressManager {
    constructor() {
        this.logger = createWinstonLogger('pingone-progress');
        this.isEnabled = true; // Will be set to false if progress container is not found
        this.currentOperation = null;
        this.currentSessionId = null;
        this.isActive = false;
        this.startTime = null;
        this.timingInterval = null;
        this.progressCallback = null;
        this.completeCallback = null;
        this.cancelCallback = null;
        this.duplicateHandlingMode = 'skip';
        
        // Real-time communication
        this.socket = null;
        this.websocket = null;
        this.connectionType = null; // 'socketio' or 'websocket'
        this.connectionRetries = 0;
        this.maxRetries = 3;
        
        // Stats tracking
        this.stats = {
            processed: 0,
            success: 0,
            failed: 0,
            skipped: 0,
            total: 0
        };
        
        this.logger.debug('ProgressManager initialized');
    }

    /**
     * Initialize the progress manager and setup core functionality
     */
    initialize() {
        try {
            this.setupElements();
            this.setupEventListeners();
            this.logger.info('Enhanced progress manager initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize progress manager', { error: error.message });
        }
    }

    /**
     * Setup DOM elements with enhanced design
     */
    setupElements() {
        try {
            // Main progress container - use existing one from HTML or find operation-specific container
            this.progressContainer = document.getElementById('progress-container');
            
            // If main container not found, we'll dynamically select the appropriate container based on operation
            if (!this.progressContainer) {
                this.logger.info('Main progress container not found - will use operation-specific containers');
                // We'll set isEnabled to true since we'll find the container dynamically when needed
                this.isEnabled = true;
            }

            // Log the progress container details for debugging
            this.logger.info('Progress container found', {
                id: this.progressContainer.id,
                className: this.progressContainer.className,
                display: this.progressContainer.style.display,
                visibility: this.progressContainer.style.visibility,
                offsetParent: this.progressContainer.offsetParent !== null
            });

            // Create enhanced progress content
            this.progressContainer.innerHTML = `
                <div class="progress-overlay">
                    <div class="progress-modal">
                        <div class="progress-header">
                            <div class="operation-info">
                                <h3 class="operation-title">
                                    <i class="fas fa-cog fa-spin"></i>
                                    <span class="title-text">Operation in Progress</span>
                                </h3>
                                <div class="operation-subtitle">Processing your request...</div>
                            </div>
                            <button class="cancel-operation" type="button" aria-label="Cancel operation">
                                <i class="fas fa-times"></i>
                                <span>Cancel</span>
                            </button>
                        </div>
                        
                        <div class="progress-content">
                            <div class="progress-steps">
                                <div class="step active" data-step="init">
                                    <div class="step-icon">
                                        <i class="fas fa-play"></i>
                                    </div>
                                    <div class="step-label">Initializing</div>
                                </div>
                                <div class="step" data-step="validate">
                                    <div class="step-icon">
                                        <i class="fas fa-check"></i>
                                    </div>
                                    <div class="step-label">Validating</div>
                                </div>
                                <div class="step" data-step="process">
                                    <div class="step-icon">
                                        <i class="fas fa-cogs"></i>
                                    </div>
                                    <div class="step-label">Processing</div>
                                </div>
                                <div class="step" data-step="complete">
                                    <div class="step-icon">
                                        <i class="fas fa-check-circle"></i>
                                    </div>
                                    <div class="step-label">Complete</div>
                                </div>
                            </div>
                            
                            <div class="progress-main">
                                <div class="progress-bar-container">
                                    <div class="progress-bar">
                                        <div class="progress-bar-fill"></div>
                                        <div class="progress-bar-glow"></div>
                                    </div>
                                    <div class="progress-percentage">0%</div>
                                </div>
                                
                                <div class="progress-text">Preparing operation...</div>
                                
                                <div class="progress-stats">
                                    <div class="stat-item">
                                        <span class="stat-label">Processed:</span>
                                        <span class="stat-value processed">0</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Success:</span>
                                        <span class="stat-value success">0</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Failed:</span>
                                        <span class="stat-value failed">0</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Skipped:</span>
                                        <span class="stat-value skipped">0</span>
                                    </div>
                                </div>
                                
                                <div class="progress-timing">
                                    <div class="time-elapsed">
                                        <i class="fas fa-clock"></i>
                                        <span>Time: <span class="elapsed-value">00:00</span></span>
                                    </div>
                                    <div class="time-remaining">
                                        <i class="fas fa-hourglass-half"></i>
                                        <span>ETA: <span class="eta-value">Calculating...</span></span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="progress-details">
                                <div class="details-header">
                                    <h4><i class="fas fa-info-circle"></i> Operation Details</h4>
                                </div>
                                <div class="details-content">
                                    <div class="detail-item">
                                        <span class="detail-label">Operation Type:</span>
                                        <span class="detail-value operation-type">-</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Session ID:</span>
                                        <span class="detail-value session-id">-</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Population:</span>
                                        <span class="detail-value population-info">-</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Connection:</span>
                                        <span class="detail-value connection-type">-</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this.logger.debug('Progress elements setup completed');
        } catch (error) {
            this.logger.error('Error setting up progress elements', { error: error.message });
            this.isEnabled = false;
        }
    }

    /**
     * Setup event listeners for progress interactions
     */
    setupEventListeners() {
        if (!this.isEnabled) {
            this.logger.warn('Progress manager not enabled - skipping event listener setup');
            return;
        }

        try {
            // Cancel operation button
            const cancelButton = this.progressContainer.querySelector('.cancel-operation');
            if (cancelButton) {
                cancelButton.addEventListener('click', () => this.cancelOperation());
            }

            // Close progress button (if exists)
            const closeButton = this.progressContainer.querySelector('.close-progress-btn');
            if (closeButton) {
                closeButton.addEventListener('click', () => this.hideProgress());
            }

            this.logger.debug('Progress event listeners setup completed');
        } catch (error) {
            this.logger.error('Error setting up progress event listeners', { error: error.message });
        }
    }

    /**
     * Start a new operation with progress tracking
     * @param {string} operationType - Type of operation (import, export, delete, modify)
     * @param {Object} options - Operation options
     * @param {number} options.totalUsers - Total number of users
     * @param {string} options.populationName - Population name
     * @param {string} options.populationId - Population ID
     */
    startOperation(operationType, options = {}) {
        if (!this.isEnabled) {
            this.logger.warn('Progress manager not enabled - cannot start operation');
            return;
        }

        this.currentOperation = operationType;
        this.isActive = true;
        this.startTime = Date.now();
        this.resetOperationStats();

        // Select the appropriate progress container based on operation type
        this.selectProgressContainer(operationType);

        // If we still don't have a progress container, try to create one
        if (!this.progressContainer) {
            this.createFallbackProgressContainer(operationType);
        }

        // If we still don't have a container, we can't proceed
        if (!this.progressContainer) {
            this.logger.error('No progress container available for operation', { operationType });
            return;
        }

        // Initialize the progress container with content if needed
        this.initializeProgressContainer();

        // Update operation details
        this.updateOperationTitle(operationType);
        this.updateOperationDetails(options);

        // Show progress
        this.showProgress();

        // Start timing updates
        this.startTimingUpdates();

        this.logger.info('Operation started', { operationType, options });
    }
    
    /**
     * Select the appropriate progress container based on operation type
     * @param {string} operationType - Type of operation (import, export, delete, modify)
     */
    selectProgressContainer(operationType) {
        // If we already have a container, keep using it
        if (this.progressContainer && this.progressContainer.parentNode) {
            return;
        }
        
        // Try to find operation-specific container first
        const containerMap = {
            'import': 'progress-container',
            'delete': 'progress-container-delete',
            'modify': 'progress-container-modify',
            'export': 'progress-container-export'
        };
        
        const containerId = containerMap[operationType] || 'progress-container';
        this.progressContainer = document.getElementById(containerId);
        
        // If not found, try the main progress container
        if (!this.progressContainer) {
            this.progressContainer = document.getElementById('progress-container');
        }
        
        // Log what we found
        if (this.progressContainer) {
            this.logger.info('Selected progress container', { 
                id: this.progressContainer.id,
                operationType
            });
        } else {
            this.logger.warn('No progress container found for operation', { operationType });
        }
    }
    
    /**
     * Create a fallback progress container if none exists
     * @param {string} operationType - Type of operation
     */
    createFallbackProgressContainer(operationType) {
        try {
            // Create a simple progress container
            const fallbackContainer = document.createElement('div');
            fallbackContainer.id = 'progress-container-fallback';
            fallbackContainer.className = 'progress-container visible';
            
            fallbackContainer.style.cssText = `
                display: block !important;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                z-index: 10000;
                display: flex;
                justify-content: center;
                align-items: center;
            `;
            
            // Add to the document
            document.body.appendChild(fallbackContainer);
            this.progressContainer = fallbackContainer;
            
            this.logger.info('Created fallback progress container', { operationType });
        } catch (error) {
            this.logger.error('Failed to create fallback progress container', { error: error.message });
        }
    }
    
    /**
     * Initialize the progress container with content if needed
     */
    initializeProgressContainer() {
        // Only initialize if the container is empty
        if (this.progressContainer && !this.progressContainer.querySelector('.progress-overlay')) {
            this.setupElements();
            this.setupEventListeners();
        }
    }

    /**
     * Initialize real-time connection for progress updates
     * @param {string} sessionId - Session ID for tracking
     */
    initializeRealTimeConnection(sessionId) {
        if (!sessionId) {
            this.logger.warn('No session ID provided for real-time connection');
            return;
        }

        this.currentSessionId = sessionId;
        this.connectionRetries = 0;

        // Try Socket.IO first, then fallback to WebSocket
        this.trySocketIOConnection(sessionId);
    }

    /**
     * Try Socket.IO connection for real-time updates
     * @param {string} sessionId - Session ID for tracking
     */
    trySocketIOConnection(sessionId) {
        try {
            // Check if Socket.IO is already loaded globally
            if (typeof io !== 'undefined') {
                this.logger.info('Using global Socket.IO client');
                this.connectWithSocketIO(io, sessionId);
            } else {
                // Try to load Socket.IO dynamically
                this.logger.info('Loading Socket.IO client dynamically');
                
                // Create a script element to load Socket.IO
                const script = document.createElement('script');
                script.src = '/socket.io/socket.io.js';
                script.async = true;
                
                script.onload = () => {
                    this.logger.info('Socket.IO client loaded successfully');
                    if (typeof io !== 'undefined') {
                        this.connectWithSocketIO(io, sessionId);
                    } else {
                        this.logger.warn('Socket.IO loaded but io is undefined, trying WebSocket');
                        this.tryWebSocketConnection(sessionId);
                    }
                };
                
                script.onerror = (error) => {
                    this.logger.warn('Failed to load Socket.IO client script', { error: error.message });
                    this.tryWebSocketConnection(sessionId);
                };
                
                document.head.appendChild(script);
            }
        } catch (error) {
            this.logger.warn('Socket.IO connection setup failed, trying WebSocket', { error: error.message });
            this.tryWebSocketConnection(sessionId);
        }
    }
    
    /**
     * Reconnect Socket.IO if connection is lost
     * @param {string} sessionId - Session ID for tracking
     */
    reconnectSocketIO(sessionId) {
        if (this.isReconnecting) return;
        
        this.isReconnecting = true;
        this.logger.info('Attempting to reconnect Socket.IO', { sessionId });
        console.log('🔄 [PROGRESS] Attempting to reconnect Socket.IO');
        
        // Close existing connections
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        
        // Try to reconnect
        setTimeout(() => {
            this.trySocketIOConnection(sessionId);
            this.isReconnecting = false;
        }, 1000);
    }
    
    /**
     * Connect with Socket.IO
     * @param {Function} io - Socket.IO client function
     * @param {string} sessionId - Session ID for tracking
     */
    connectWithSocketIO(io, sessionId) {
        try {
            // Create Socket.IO connection
            this.socket = io('/', {
                transports: ['websocket', 'polling'],
                timeout: 5000,
                forceNew: true
            });

            this.socket.on('connect', () => {
                this.connectionType = 'socketio';
                this.updateConnectionType('Socket.IO');
                this.logger.info('Socket.IO connected', { sessionId, socketId: this.socket.id });
                console.log(`🔌 [PROGRESS] Socket.IO connected (ID: ${this.socket.id})`);
                
                // Join session room
                this.socket.emit('registerSession', sessionId);
                
                // Also try the join-session event for compatibility
                this.socket.emit('join-session', { sessionId });
            });

            this.socket.on('progress', (data) => {
                console.log('🔄 [PROGRESS] Received progress event:', data);
                this.handleProgressEvent(data);
            });

            this.socket.on('completion', (data) => {
                console.log('✅ [PROGRESS] Received completion event:', data);
                this.handleCompletionEvent(data);
            });
            
            // Also listen for 'complete' for compatibility
            this.socket.on('complete', (data) => {
                console.log('✅ [PROGRESS] Received complete event:', data);
                this.handleCompletionEvent(data);
            });

            this.socket.on('error', (data) => {
                console.log('❌ [PROGRESS] Received error event:', data);
                this.handleErrorEvent(data);
            });

            this.socket.on('disconnect', () => {
                console.log('🔌 [PROGRESS] Socket.IO disconnected');
                this.logger.warn('Socket.IO disconnected');
                this.handleConnectionFailure();
            });

            this.socket.on('connect_error', (error) => {
                console.log('❌ [PROGRESS] Socket.IO connection error:', error.message);
                this.logger.warn('Socket.IO connection error', { error: error.message });
                this.handleConnectionFailure();
            });
        } catch (error) {
            this.logger.warn('Socket.IO connection failed, trying WebSocket', { error: error.message });
            this.tryWebSocketConnection(sessionId);
        }
    }

    /**
     * Try WebSocket connection as fallback
     * @param {string} sessionId - Session ID for tracking
     */
    tryWebSocketConnection(sessionId) {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws`;
            
            this.websocket = new WebSocket(wsUrl);

            this.websocket.onopen = () => {
                this.connectionType = 'websocket';
                this.updateConnectionType('WebSocket');
                this.logger.info('WebSocket connected', { sessionId });
                
                // Send session join message
                this.websocket.send(JSON.stringify({
                    type: 'join-session',
                    sessionId: sessionId
                }));
            };

            this.websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    switch (data.type) {
                        case 'progress':
                            this.handleProgressEvent(data);
                            break;
                        case 'complete':
                            this.handleCompletionEvent(data);
                            break;
                        case 'error':
                            this.handleErrorEvent(data);
                            break;
                    }
                } catch (error) {
                    this.logger.error('Error parsing WebSocket message', { error: error.message });
                }
            };

            this.websocket.onclose = (event) => {
                this.logger.warn('WebSocket closed', { code: event.code, reason: event.reason });
                this.handleConnectionFailure();
            };

            this.websocket.onerror = (error) => {
                this.logger.error('WebSocket error', { error: error.message });
                this.handleConnectionFailure();
            };

        } catch (error) {
            this.logger.error('WebSocket connection failed', { error: error.message });
            this.handleConnectionFailure();
        }
    }

    /**
     * Handle connection failure and implement fallback strategy
     */
    handleConnectionFailure() {
        this.connectionRetries++;
        
        if (this.connectionRetries <= this.maxRetries) {
            this.logger.info('Retrying connection', { attempt: this.connectionRetries, maxRetries: this.maxRetries });
            
            setTimeout(() => {
                if (this.currentSessionId) {
                    this.initializeRealTimeConnection(this.currentSessionId);
                }
            }, 1000 * this.connectionRetries); // Exponential backoff
        } else {
            this.logger.warn('Max connection retries reached, falling back to polling');
            this.updateConnectionType('Polling (Fallback)');
        }
    }

    /**
     * Close all real-time connections
     */
    closeConnections() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }

        if (this.websocket) {
            this.websocket.close(1000, 'Operation completed');
            this.websocket = null;
        }

        this.connectionType = null;
        this.logger.debug('Real-time connections closed');
    }

    /**
     * Update session ID for tracking
     * @param {string} sessionId - New session ID
     */
    updateSessionId(sessionId) {
        if (!sessionId) {
            this.logger.warn('No session ID provided for update');
            return;
        }

        this.currentSessionId = sessionId;
        
        // Update session ID display
        const sessionElement = this.progressContainer.querySelector('.detail-value.session-id');
        if (sessionElement) {
            sessionElement.textContent = sessionId;
        }

        this.logger.info('Session ID updated', { sessionId });
    }

    /**
     * Handle progress event from real-time connection
     * @param {Object} data - Progress event data
     */
    handleProgressEvent(data) {
        if (!data) {
            this.logger.warn('No progress data received');
            return;
        }

        const { current, total, message, counts } = data;
        this.updateProgress(current, total, message, counts);
        
        this.logger.debug('Progress event handled', { current, total, message });
    }

    /**
     * Handle completion event from real-time connection
     * @param {Object} data - Completion event data
     */
    handleCompletionEvent(data) {
        this.completeOperation(data);
        this.logger.info('Completion event handled', { data });
    }

    /**
     * Handle error event from real-time connection
     * @param {Object} data - Error event data
     */
    handleErrorEvent(data) {
        const { message, details } = data;
        this.handleOperationError(message, details);
        this.logger.error('Error event handled', { message, details });
    }

    /**
     * Update progress display with current values
     * @param {number} current - Current progress value
     * @param {number} total - Total progress value
     * @param {string} message - Progress message
     * @param {Object} details - Additional progress details
     */
    updateProgress(current, total, message = '', details = {}) {
        if (!this.isEnabled || !this.progressContainer) {
            this.logger.warn('Progress manager not enabled or container not found');
            return;
        }

        // Update progress bar
        const progressBar = this.progressContainer.querySelector('.progress-bar-fill');
        if (progressBar) {
            const percentage = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
            progressBar.style.width = `${percentage}%`;
        }

        // Update percentage text
        const percentageElement = this.progressContainer.querySelector('.progress-percentage');
        if (percentageElement) {
            const percentage = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
            percentageElement.textContent = `${percentage}%`;
        }

        // Update progress text
        const progressText = this.progressContainer.querySelector('.progress-text');
        if (progressText && message) {
            progressText.textContent = message;
        }

        // Update step indicator based on progress
        if (total > 0) {
            const percentage = (current / total) * 100;
            this.updateStepIndicatorBasedOnProgress(percentage);
        }

        // Update statistics if provided
        if (details && typeof details === 'object') {
            this.stats = { ...this.stats, ...details };
            this.updateStatsDisplay();
        }

        this.logger.debug('Progress updated', { current, total, message, details });
    }

    /**
     * Update statistics display in the UI
     */
    updateStatsDisplay() {
        if (!this.progressContainer) return;

        Object.entries(this.stats).forEach(([key, value]) => {
            const statElement = this.progressContainer.querySelector(`.stat-value.${key}`);
            if (statElement) {
                statElement.textContent = value || 0;
            }
        });

        this.logger.debug('Statistics display updated', { stats: this.stats });
    }

    /**
     * Update step indicator based on progress percentage
     * @param {number} percentage - Progress percentage (0-100)
     */
    updateStepIndicatorBasedOnProgress(percentage) {
        let step = 'init';
        
        if (percentage >= 100) {
            step = 'complete';
        } else if (percentage >= 75) {
            step = 'process';
        } else if (percentage >= 25) {
            step = 'validate';
        }

        this.updateStepIndicator(step);
    }

    /**
     * Update step indicator to show current operation phase
     * @param {string} step - Step name (init, validate, process, complete)
     */
    updateStepIndicator(step) {
        if (!this.progressContainer) return;

        const steps = this.progressContainer.querySelectorAll('.step');
        steps.forEach(stepElement => {
            stepElement.classList.remove('active', 'completed');
        });

        const currentStep = this.progressContainer.querySelector(`[data-step="${step}"]`);
        if (currentStep) {
            currentStep.classList.add('active');
        }

        // Mark previous steps as completed
        const stepOrder = this.getStepOrder(step);
        steps.forEach(stepElement => {
            const stepName = stepElement.getAttribute('data-step');
            const stepIndex = this.getStepOrder(stepName);
            if (stepIndex < stepOrder) {
                stepElement.classList.add('completed');
            }
        });

        this.logger.debug('Step indicator updated', { step });
    }

    /**
     * Get step order for comparison
     * @param {string} step - Step name
     * @returns {number} Step order (0-3)
     */
    getStepOrder(step) {
        const order = { init: 0, validate: 1, process: 2, complete: 3 };
        return order[step] || 0;
    }

    /**
     * Start timing updates for operation duration
     */
    startTimingUpdates() {
        if (this.timingInterval) {
            clearInterval(this.timingInterval);
        }

        this.timingInterval = setInterval(() => {
            this.updateTiming();
        }, 1000);

        this.logger.debug('Timing updates started');
    }

    /**
     * Update timing display with elapsed time and ETA
     */
    updateTiming() {
        if (!this.startTime || !this.progressContainer) return;

        const elapsed = Date.now() - this.startTime;
        const elapsedElement = this.progressContainer.querySelector('.elapsed-value');
        if (elapsedElement) {
            elapsedElement.textContent = this.formatDuration(elapsed);
        }

        // Calculate ETA if we have progress data
        if (this.stats.total > 0 && this.stats.processed > 0) {
            const progress = this.stats.processed / this.stats.total;
            if (progress > 0) {
                const estimatedTotal = elapsed / progress;
                const remaining = estimatedTotal - elapsed;
                
                const etaElement = this.progressContainer.querySelector('.eta-value');
                if (etaElement) {
                    etaElement.textContent = this.formatDuration(remaining);
                }
            }
        }

        this.logger.debug('Timing updated', { elapsed });
    }

    /**
     * Complete operation with results
     * @param {Object} results - Operation results
     * @param {number} results.processed - Number of processed items
     * @param {number} results.success - Number of successful items
     * @param {number} results.failed - Number of failed items
     * @param {number} results.skipped - Number of skipped items
     */
    completeOperation(results = {}) {
        if (!this.isEnabled) {
            this.logger.warn('Progress manager not enabled - cannot complete operation');
            return;
        }

        // Stop timing updates
        if (this.timingInterval) {
            clearInterval(this.timingInterval);
            this.timingInterval = null;
        }

        // Close real-time connections
        this.closeConnections();

        // Update final progress
        const { processed, success, failed, skipped } = results;
        this.updateProgress(processed || 0, processed || 0, 'Operation completed');

        // Update final statistics
        this.stats = { ...this.stats, ...results };
        this.updateStatsDisplay();

        // Mark as complete
        this.updateStepIndicator('complete');

        // Call completion callback if provided
        if (this.completeCallback && typeof this.completeCallback === 'function') {
            this.completeCallback(results);
        }

        this.isActive = false;
        this.logger.info('Operation completed', { results });
    }

    /**
     * Handle operation error
     * @param {string} message - Error message
     * @param {Object} details - Error details
     */
    handleOperationError(message, details = {}) {
        if (!this.isEnabled) {
            this.logger.warn('Progress manager not enabled - cannot handle error');
            return;
        }

        // Stop timing updates
        if (this.timingInterval) {
            clearInterval(this.timingInterval);
            this.timingInterval = null;
        }

        // Close real-time connections
        this.closeConnections();

        // Update progress text with error
        const progressText = this.progressContainer.querySelector('.progress-text');
        if (progressText) {
            progressText.textContent = `Error: ${message}`;
            progressText.classList.add('error');
        }

        this.isActive = false;
        this.logger.error('Operation error', { message, details });
    }

    /**
     * Cancel current operation
     */
    cancelOperation() {
        if (!this.isEnabled || !this.isActive) {
            this.logger.warn('No active operation to cancel');
            return;
        }

        // Stop timing updates
        if (this.timingInterval) {
            clearInterval(this.timingInterval);
            this.timingInterval = null;
        }

        // Close real-time connections
        this.closeConnections();

        // Call cancel callback if provided
        if (this.cancelCallback && typeof this.cancelCallback === 'function') {
            this.cancelCallback();
        }

        this.isActive = false;
        this.hideProgress();
        this.logger.info('Operation cancelled');
    }

    /**
     * Show progress display
     */
    showProgress() {
        if (!this.isEnabled || !this.progressContainer) {
            this.logger.warn('Progress manager not enabled or container not found');
            return;
        }

        // Make sure the container is visible
        this.progressContainer.style.display = 'block';
        this.progressContainer.classList.add('visible');
        
        // Force visibility with !important to override any CSS that might hide it
        this.progressContainer.setAttribute('style', 'display: block !important; visibility: visible !important;');

        // Focus management for accessibility
        const cancelButton = this.progressContainer.querySelector('.cancel-operation');
        if (cancelButton) {
            cancelButton.focus();
        }

        this.logger.debug('Progress display shown', { containerId: this.progressContainer.id });
        
        // Log to console for debugging
        console.log(`🔍 [PROGRESS] Showing progress container: ${this.progressContainer.id}`);
    }

    /**
     * Hide progress display
     */
    hideProgress() {
        if (!this.progressContainer) return;

        // Log before hiding
        this.logger.debug('Hiding progress display', { containerId: this.progressContainer.id });
        console.log(`🔍 [PROGRESS] Hiding progress container: ${this.progressContainer.id}`);

        this.progressContainer.classList.remove('visible');
        
        // Immediately hide the container
        this.progressContainer.style.display = 'none';

        this.logger.debug('Progress display hidden');
    }

    /**
     * Update operation title
     * @param {string} operationType - Type of operation
     */
    updateOperationTitle(operationType) {
        if (!this.progressContainer) return;

        const titleElement = this.progressContainer.querySelector('.title-text');
        if (titleElement) {
            const titles = {
                import: 'Import Users',
                export: 'Export Users',
                delete: 'Delete Users',
                modify: 'Modify Users'
            };
            titleElement.textContent = titles[operationType] || 'Operation in Progress';
        }

        this.logger.debug('Operation title updated', { operationType });
    }

    /**
     * Update operation details
     * @param {Object} options - Operation options
     * @param {string} options.populationName - Population name
     * @param {string} options.populationId - Population ID
     * @param {number} options.totalUsers - Total number of users
     */
    updateOperationDetails(options = {}) {
        if (!this.progressContainer) return;

        const { populationName, populationId, totalUsers } = options;

        // Update operation type
        const operationTypeElement = this.progressContainer.querySelector('.detail-value.operation-type');
        if (operationTypeElement) {
            operationTypeElement.textContent = this.currentOperation || 'Unknown';
        }

        // Update population info
        const populationElement = this.progressContainer.querySelector('.detail-value.population-info');
        if (populationElement) {
            populationElement.textContent = populationName || populationId || 'Unknown';
        }

        // Update total users in stats
        if (totalUsers) {
            this.stats.total = totalUsers;
            this.updateStatsDisplay();
        }

        this.logger.debug('Operation details updated', { options });
    }

    /**
     * Update operation status
     * @param {string} status - Operation status
     * @param {string} message - Status message
     */
    updateOperationStatus(status, message = '') {
        if (!this.progressContainer) return;

        const subtitleElement = this.progressContainer.querySelector('.operation-subtitle');
        if (subtitleElement) {
            subtitleElement.textContent = message || status;
        }

        this.logger.debug('Operation status updated', { status, message });
    }

    /**
     * Update connection type display
     * @param {string} type - Connection type
     */
    updateConnectionType(type) {
        if (!this.progressContainer) return;

        const connectionElement = this.progressContainer.querySelector('.detail-value.connection-type');
        if (connectionElement) {
            connectionElement.textContent = type;
        }

        this.logger.debug('Connection type updated', { type });
    }

    /**
     * Reset operation statistics
     */
    resetOperationStats() {
        this.stats = {
            processed: 0,
            success: 0,
            failed: 0,
            skipped: 0,
            total: 0
        };

        this.updateStatsDisplay();
        this.logger.debug('Operation statistics reset');
    }

    /**
     * Format duration in milliseconds to human readable string
     * @param {number} milliseconds - Duration in milliseconds
     * @returns {string} Formatted duration string
     */
    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
        } else if (minutes > 0) {
            return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Set progress callback function
     * @param {Function} callback - Progress callback function
     */
    setProgressCallback(callback) {
        this.progressCallback = callback;
        this.logger.debug('Progress callback set');
    }

    /**
     * Set completion callback function
     * @param {Function} callback - Completion callback function
     */
    setCompleteCallback(callback) {
        this.completeCallback = callback;
        this.logger.debug('Completion callback set');
    }

    /**
     * Set cancel callback function
     * @param {Function} callback - Cancel callback function
     */
    setCancelCallback(callback) {
        this.cancelCallback = callback;
        this.logger.debug('Cancel callback set');
    }

    /**
     * Debug logging for development
     * @param {string} area - Debug area
     * @param {string} message - Debug message
     */
    debugLog(area, message) {
        if (DEBUG_MODE) {
            this.logger.debug(`[${area}] ${message}`);
        }
    }

    /**
     * Clean up resources and destroy the progress manager
     */
    destroy() {
        // Stop timing updates
        if (this.timingInterval) {
            clearInterval(this.timingInterval);
            this.timingInterval = null;
        }

        // Close connections
        this.closeConnections();

        // Clear callbacks
        this.progressCallback = null;
        this.completeCallback = null;
        this.cancelCallback = null;

        // Reset state
        this.isActive = false;
        this.currentOperation = null;
        this.currentSessionId = null;

        this.logger.info('Progress manager destroyed');
    }
}

// Create and export default instance
const progressManager = new ProgressManager();

// Export the class and instance
export default progressManager;
export { ProgressManager }; 