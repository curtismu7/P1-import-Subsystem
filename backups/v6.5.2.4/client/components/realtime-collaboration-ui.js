/**
 * Real-time Collaboration UI Component
 * 
 * Provides a comprehensive user interface for real-time collaboration features including:
 * - Live user presence indicators
 * - Collaborative operation management
 * - Real-time progress sharing
 * - Live notifications and alerts
 * - Multi-user activity dashboard
 */

export class RealtimeCollaborationUI {
    constructor(logger, eventBus, advancedRealtimeSubsystem, uiManager) {
        this.logger = logger;
        this.eventBus = eventBus;
        this.advancedRealtime = advancedRealtimeSubsystem;
        this.uiManager = uiManager;
        
        // UI state management
        this.isVisible = false;
        this.currentRoom = null;
        this.activeUsers = new Map();
        this.liveProgressStreams = new Map();
        this.notifications = [];
        
        // UI elements
        this.container = null;
        this.presencePanel = null;
        this.progressPanel = null;
        this.notificationPanel = null;
        this.collaborationPanel = null;
        
        this.logger.info('Real-time Collaboration UI initialized');
    }
    
    /**
     * Initialize the collaboration UI
     */
    async init() {
        try {
            // Create UI structure
            this.createUIStructure();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize UI components
            await this.initializeComponents();
            
            this.logger.info('Real-time Collaboration UI initialized successfully');
            
        } catch (error) {
            this.logger.error('Failed to initialize Real-time Collaboration UI', error);
            throw error;
        }
    }
    
    /**
     * Create the main UI structure
     */
    createUIStructure() {
        this.logger.debug('Creating real-time collaboration UI structure');
        
        // Main container
        this.container = document.createElement('div');
        this.container.id = 'realtime-collaboration-container';
        this.container.className = 'realtime-collaboration-container hidden';
        this.container.innerHTML = `
            <div class="collaboration-header">
                <h3>
                    <i class="fas fa-users"></i>
                    Real-time Collaboration
                </h3>
                <div class="collaboration-controls">
                    <button id="toggle-collaboration" class="btn btn-sm btn-outline-primary">
                        <i class="fas fa-eye"></i>
                        <span>Show</span>
                    </button>
                    <button id="minimize-collaboration" class="btn btn-sm btn-outline-secondary">
                        <i class="fas fa-minus"></i>
                    </button>
                </div>
            </div>
            
            <div class="collaboration-content">
                <!-- User Presence Panel -->
                <div class="collaboration-panel" id="presence-panel">
                    <div class="panel-header">
                        <h4><i class="fas fa-user-friends"></i> Active Users</h4>
                        <span class="user-count badge badge-primary">0</span>
                    </div>
                    <div class="panel-content">
                        <div id="active-users-list" class="users-list"></div>
                        <div class="presence-controls">
                            <button id="join-room-btn" class="btn btn-sm btn-success">
                                <i class="fas fa-sign-in-alt"></i>
                                Join Room
                            </button>
                            <button id="leave-room-btn" class="btn btn-sm btn-warning hidden">
                                <i class="fas fa-sign-out-alt"></i>
                                Leave Room
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Live Progress Panel -->
                <div class="collaboration-panel" id="progress-panel">
                    <div class="panel-header">
                        <h4><i class="fas fa-chart-line"></i> Live Progress</h4>
                        <span class="progress-count badge badge-info">0</span>
                    </div>
                    <div class="panel-content">
                        <div id="live-progress-list" class="progress-list"></div>
                        <div class="progress-controls">
                            <button id="share-progress-btn" class="btn btn-sm btn-primary">
                                <i class="fas fa-share"></i>
                                Share Progress
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Real-time Notifications Panel -->
                <div class="collaboration-panel" id="notification-panel">
                    <div class="panel-header">
                        <h4><i class="fas fa-bell"></i> Live Notifications</h4>
                        <span class="notification-count badge badge-warning">0</span>
                    </div>
                    <div class="panel-content">
                        <div id="notifications-list" class="notifications-list"></div>
                        <div class="notification-controls">
                            <button id="clear-notifications-btn" class="btn btn-sm btn-outline-secondary">
                                <i class="fas fa-trash"></i>
                                Clear All
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Collaboration Analytics Panel -->
                <div class="collaboration-panel" id="analytics-panel">
                    <div class="panel-header">
                        <h4><i class="fas fa-analytics"></i> Live Analytics</h4>
                        <button id="refresh-analytics-btn" class="btn btn-sm btn-outline-primary">
                            <i class="fas fa-sync"></i>
                        </button>
                    </div>
                    <div class="panel-content">
                        <div id="analytics-dashboard" class="analytics-dashboard">
                            <div class="metric-card">
                                <div class="metric-label">Connection Status</div>
                                <div id="connection-status" class="metric-value">Disconnected</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-label">Active Operations</div>
                                <div id="active-operations" class="metric-value">0</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-label">System Latency</div>
                                <div id="system-latency" class="metric-value">--</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(this.container);
        
        // Get panel references
        this.presencePanel = document.getElementById('presence-panel');
        this.progressPanel = document.getElementById('progress-panel');
        this.notificationPanel = document.getElementById('notification-panel');
        this.analyticsPanel = document.getElementById('analytics-panel');
        
        this.logger.debug('Real-time collaboration UI structure created');
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        this.logger.debug('Setting up real-time collaboration UI event listeners');
        
        // UI control events
        document.getElementById('toggle-collaboration')?.addEventListener('click', () => {
            this.toggleVisibility();
        });
        
        document.getElementById('minimize-collaboration')?.addEventListener('click', () => {
            this.minimize();
        });
        
        document.getElementById('join-room-btn')?.addEventListener('click', () => {
            this.showJoinRoomDialog();
        });
        
        document.getElementById('leave-room-btn')?.addEventListener('click', () => {
            this.leaveCurrentRoom();
        });
        
        document.getElementById('share-progress-btn')?.addEventListener('click', () => {
            this.showShareProgressDialog();
        });
        
        document.getElementById('clear-notifications-btn')?.addEventListener('click', () => {
            this.clearNotifications();
        });
        
        document.getElementById('refresh-analytics-btn')?.addEventListener('click', () => {
            this.refreshAnalytics();
        });
        
        // EventBus listeners for real-time updates
        this.eventBus.on('collaboration:user-joined', (data) => {
            this.handleUserJoined(data);
        });
        
        this.eventBus.on('collaboration:user-left', (data) => {
            this.handleUserLeft(data);
        });
        
        this.eventBus.on('progress-sharing:started', (data) => {
            this.handleProgressSharingStarted(data);
        });
        
        this.eventBus.on('progress-stream:update', (data) => {
            this.handleProgressStreamUpdate(data);
        });
        
        this.eventBus.on('notification:sent', (data) => {
            this.handleNotificationReceived(data);
        });
        
        this.eventBus.on('presence:updated', (data) => {
            this.handlePresenceUpdate(data);
        });
        
        this.logger.debug('Real-time collaboration UI event listeners set up');
    }
    
    /**
     * Initialize UI components
     */
    async initializeComponents() {
        this.logger.debug('Initializing real-time collaboration UI components');
        
        // Initialize analytics dashboard
        await this.initializeAnalyticsDashboard();
        
        // Set up periodic updates
        this.setupPeriodicUpdates();
        
        this.logger.debug('Real-time collaboration UI components initialized');
    }
    
    /**
     * Initialize analytics dashboard
     */
    async initializeAnalyticsDashboard() {
        try {
            const dashboardData = await this.advancedRealtime.getLiveAnalyticsDashboard();
            this.updateAnalyticsDashboard(dashboardData);
        } catch (error) {
            this.logger.error('Failed to initialize analytics dashboard', error);
        }
    }
    
    /**
     * Set up periodic updates
     */
    setupPeriodicUpdates() {
        // Update analytics every 5 seconds
        this.analyticsInterval = setInterval(() => {
            this.refreshAnalytics();
        }, 5000);
        
        // Update presence every 10 seconds
        this.presenceInterval = setInterval(() => {
            this.refreshPresence();
        }, 10000);
    }
    
    /**
     * Toggle visibility of the collaboration UI
     */
    toggleVisibility() {
        this.isVisible = !this.isVisible;
        
        if (this.isVisible) {
            this.container.classList.remove('hidden');
            document.getElementById('toggle-collaboration').innerHTML = `
                <i class="fas fa-eye-slash"></i>
                <span>Hide</span>
            `;
            this.refreshAll();
        } else {
            this.container.classList.add('hidden');
            document.getElementById('toggle-collaboration').innerHTML = `
                <i class="fas fa-eye"></i>
                <span>Show</span>
            `;
        }
        
        this.logger.debug('Collaboration UI visibility toggled', { isVisible: this.isVisible });
    }
    
    /**
     * Show join room dialog
     */
    showJoinRoomDialog() {
        const roomId = prompt('Enter Room ID to join (or leave empty for default):') || 'default-room';
        const userName = prompt('Enter your name:') || 'Anonymous User';
        
        if (roomId && userName) {
            this.joinRoom(roomId, {
                id: this.generateUserId(),
                name: userName,
                avatar: this.generateAvatar(userName),
                joinedAt: new Date()
            });
        }
    }
    
    /**
     * Join a collaboration room
     */
    async joinRoom(roomId, userInfo) {
        try {
            this.logger.info('Joining collaboration room', { roomId, userName: userInfo.name });
            
            const result = await this.advancedRealtime.joinCollaborationRoom(roomId, userInfo);
            
            if (result.success) {
                this.currentRoom = roomId;
                this.updateRoomUI(result);
                
                // Show success notification
                this.uiManager.showSuccess(`Joined room: ${roomId}`, `Connected with ${result.userCount} users`);
                
                // Update UI controls
                document.getElementById('join-room-btn').classList.add('hidden');
                document.getElementById('leave-room-btn').classList.remove('hidden');
                
                this.logger.info('Successfully joined collaboration room', result);
            }
            
        } catch (error) {
            this.logger.error('Failed to join collaboration room', error);
            this.uiManager.showError('Failed to Join Room', error.message);
        }
    }
    
    /**
     * Leave current room
     */
    async leaveCurrentRoom() {
        if (!this.currentRoom) return;
        
        try {
            const result = await this.advancedRealtime.leaveCollaborationRoom(this.currentRoom, this.getCurrentUserId());
            
            if (result.success) {
                this.uiManager.showInfo('Left Room', `Left room: ${this.currentRoom}`);
                
                this.currentRoom = null;
                this.clearRoomUI();
                
                // Update UI controls
                document.getElementById('join-room-btn').classList.remove('hidden');
                document.getElementById('leave-room-btn').classList.add('hidden');
            }
            
        } catch (error) {
            this.logger.error('Failed to leave collaboration room', error);
            this.uiManager.showError('Failed to Leave Room', error.message);
        }
    }
    
    /**
     * Show share progress dialog
     */
    showShareProgressDialog() {
        // This would typically show a modal with current operations to share
        const operationId = prompt('Enter Operation ID to share progress (or leave empty for current):') || 'current-operation';
        
        if (operationId) {
            this.startProgressSharing(operationId);
        }
    }
    
    /**
     * Start progress sharing for an operation
     */
    async startProgressSharing(operationId) {
        try {
            const result = await this.advancedRealtime.startLiveProgressSharing(operationId, {
                updateInterval: 1000,
                includeMetrics: true,
                includeErrors: true
            });
            
            if (result.success) {
                this.uiManager.showSuccess('Progress Sharing Started', `Sharing progress for: ${operationId}`);
                this.addProgressStream(operationId);
            }
            
        } catch (error) {
            this.logger.error('Failed to start progress sharing', error);
            this.uiManager.showError('Failed to Share Progress', error.message);
        }
    }
    
    /**
     * Update room UI with user information
     */
    updateRoomUI(roomData) {
        const usersList = document.getElementById('active-users-list');
        const userCount = document.querySelector('.user-count');
        
        // Update user count
        userCount.textContent = roomData.userCount;
        
        // Update users list
        usersList.innerHTML = '';
        roomData.users.forEach(user => {
            const userElement = this.createUserElement(user);
            usersList.appendChild(userElement);
        });
    }
    
    /**
     * Create user element for the users list
     */
    createUserElement(user) {
        const userElement = document.createElement('div');
        userElement.className = 'user-item';
        userElement.innerHTML = `
            <div class="user-avatar">
                <img src="${user.avatar}" alt="${user.name}" />
                <div class="user-status ${user.isActive ? 'active' : 'inactive'}"></div>
            </div>
            <div class="user-info">
                <div class="user-name">${user.name}</div>
                <div class="user-activity">${this.formatLastActivity(user.lastSeen)}</div>
            </div>
        `;
        return userElement;
    }
    
    /**
     * Add progress stream to UI
     */
    addProgressStream(operationId) {
        const progressList = document.getElementById('live-progress-list');
        const progressCount = document.querySelector('.progress-count');
        
        const progressElement = document.createElement('div');
        progressElement.className = 'progress-item';
        progressElement.id = `progress-${operationId}`;
        progressElement.innerHTML = `
            <div class="progress-header">
                <span class="progress-title">${operationId}</span>
                <span class="progress-percentage">0%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: 0%"></div>
            </div>
            <div class="progress-details">
                <span class="progress-stage">Initializing...</span>
                <span class="progress-time">Just started</span>
            </div>
        `;
        
        progressList.appendChild(progressElement);
        
        // Update count
        progressCount.textContent = progressList.children.length;
        
        this.liveProgressStreams.set(operationId, progressElement);
    }
    
    /**
     * Update analytics dashboard
     */
    updateAnalyticsDashboard(data) {
        document.getElementById('connection-status').textContent = 
            data.connectionStatus.isConnected ? 'Connected' : 'Disconnected';
        document.getElementById('connection-status').className = 
            `metric-value ${data.connectionStatus.isConnected ? 'connected' : 'disconnected'}`;
        
        document.getElementById('active-operations').textContent = data.liveProgressStreams;
        document.getElementById('system-latency').textContent = 
            data.systemMetrics.connectionLatency ? `${Math.round(data.systemMetrics.connectionLatency)}ms` : '--';
    }
    
    /**
     * Add notification to UI
     */
    addNotification(notification) {
        const notificationsList = document.getElementById('notifications-list');
        const notificationCount = document.querySelector('.notification-count');
        
        const notificationElement = document.createElement('div');
        notificationElement.className = `notification-item ${notification.type}`;
        notificationElement.innerHTML = `
            <div class="notification-header">
                <span class="notification-type">${notification.type.toUpperCase()}</span>
                <span class="notification-time">${this.formatTime(notification.timestamp)}</span>
            </div>
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
            </div>
        `;
        
        // Add to top of list
        notificationsList.insertBefore(notificationElement, notificationsList.firstChild);
        
        // Limit notifications display
        while (notificationsList.children.length > 10) {
            notificationsList.removeChild(notificationsList.lastChild);
        }
        
        // Update count
        notificationCount.textContent = notificationsList.children.length;
        
        // Store in memory
        this.notifications.unshift(notification);
        if (this.notifications.length > 100) {
            this.notifications.pop();
        }
    }
    
    // Event Handlers
    
    handleUserJoined(data) {
        this.logger.debug('User joined collaboration room', data);
        if (data.roomId === this.currentRoom) {
            this.addNotification({
                type: 'info',
                title: 'User Joined',
                message: `${data.user.name} joined the room`,
                timestamp: new Date()
            });
            this.refreshPresence();
        }
    }
    
    handleUserLeft(data) {
        this.logger.debug('User left collaboration room', data);
        if (data.roomId === this.currentRoom) {
            this.addNotification({
                type: 'info',
                title: 'User Left',
                message: `${data.user.name} left the room`,
                timestamp: new Date()
            });
            this.refreshPresence();
        }
    }
    
    handleProgressSharingStarted(data) {
        this.logger.debug('Progress sharing started', data);
        this.addProgressStream(data.operationId);
    }
    
    handleProgressStreamUpdate(data) {
        this.logger.debug('Progress stream update', data);
        this.updateProgressStream(data.operationId, data);
    }
    
    handleNotificationReceived(data) {
        this.logger.debug('Notification received', data);
        this.addNotification(data);
    }
    
    handlePresenceUpdate(data) {
        this.logger.debug('Presence update received', data);
        this.updatePresenceDisplay(data);
    }
    
    // Utility Methods
    
    async refreshAll() {
        await Promise.all([
            this.refreshAnalytics(),
            this.refreshPresence()
        ]);
    }
    
    async refreshAnalytics() {
        try {
            const data = await this.advancedRealtime.getLiveAnalyticsDashboard();
            this.updateAnalyticsDashboard(data);
        } catch (error) {
            this.logger.error('Failed to refresh analytics', error);
        }
    }
    
    async refreshPresence() {
        // This would typically fetch current room state
        if (this.currentRoom) {
            // Update presence display
        }
    }
    
    clearNotifications() {
        document.getElementById('notifications-list').innerHTML = '';
        document.querySelector('.notification-count').textContent = '0';
        this.notifications = [];
    }
    
    minimize() {
        this.container.classList.toggle('minimized');
    }
    
    clearRoomUI() {
        document.getElementById('active-users-list').innerHTML = '';
        document.querySelector('.user-count').textContent = '0';
    }
    
    updateProgressStream(operationId, data) {
        const progressElement = this.liveProgressStreams.get(operationId);
        if (progressElement) {
            const percentage = data.progress?.percentage || 0;
            const stage = data.progress?.stage || 'Unknown';
            
            progressElement.querySelector('.progress-percentage').textContent = `${percentage}%`;
            progressElement.querySelector('.progress-fill').style.width = `${percentage}%`;
            progressElement.querySelector('.progress-stage').textContent = stage;
            progressElement.querySelector('.progress-time').textContent = this.formatTime(new Date());
        }
    }
    
    updatePresenceDisplay(data) {
        // Update active users display
        this.activeUsers.clear();
        data.activeUsers.forEach(user => {
            this.activeUsers.set(user.id, user);
        });
    }
    
    generateUserId() {
        return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    getCurrentUserId() {
        // This would typically come from session or auth
        return this.currentUserId || this.generateUserId();
    }
    
    generateAvatar(name) {
        // Generate a simple avatar URL based on name
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=007bff&color=fff&size=32`;
    }
    
    formatTime(date) {
        return new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).format(date);
    }
    
    formatLastActivity(date) {
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return `${Math.floor(diff / 86400000)}d ago`;
    }
    
    /**
     * Cleanup and destroy
     */
    destroy() {
        this.logger.info('Destroying Real-time Collaboration UI');
        
        // Clear intervals
        if (this.analyticsInterval) clearInterval(this.analyticsInterval);
        if (this.presenceInterval) clearInterval(this.presenceInterval);
        
        // Remove from DOM
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        // Clear data
        this.activeUsers.clear();
        this.liveProgressStreams.clear();
        this.notifications = [];
        
        this.logger.info('Real-time Collaboration UI destroyed');
    }
}
