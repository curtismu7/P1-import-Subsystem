/**
 * Example Page - User Management
 * 
 * Demonstrates how to create pages using the new structure
 * Uses consolidated services and components
 */

// Import from organized structure
import { UserCard } from '../components/example-user-card.js';
import { appState, actions, selectors } from '../state/app-state.js';
import { apiClient } from '../services/api-client.js';
import { CoreUtils } from '../utils/core-utils.js';

export class UserManagementPage {
  constructor() {
    this.users = [];
    this.userCards = new Map();
    this.container = null;
    
    // Use consolidated utilities
    this.logger = CoreUtils.createLogger('UserManagementPage');
    this.eventManager = CoreUtils.getEventManager();
    
    // Subscribe to state changes
    this.setupStateSubscriptions();
  }
  
  /**
   * Initialize the page
   */
  async init(container) {
    this.container = container;
    
    try {
      // Show loading state
      actions.setLoading(true);
      
      // Load users
      await this.loadUsers();
      
      // Render page
      this.render();
      
      // Setup event listeners
      this.setupEventListeners();
      
      actions.setLoading(false);
      this.logger.info('User management page initialized');
      
    } catch (error) {
      this.logger.error('Failed to initialize page:', error);
      actions.addError('Failed to load user management page');
      actions.setLoading(false);
    }
  }
  
  /**
   * Setup state subscriptions
   */
  setupStateSubscriptions() {
    // Subscribe to user data changes
    appState.subscribe('users', (state) => {
      if (state.users !== this.users) {
        this.users = state.users;
        this.refreshUserList();
      }
    });
    
    // Subscribe to loading state
    appState.subscribe('loading', (state) => {
      this.updateLoadingState(state.loading);
    });
  }
  
  /**
   * Load users from API
   */
  async loadUsers() {
    const response = await apiClient.get('/api/users', {
      showLoading: false, // We're handling loading ourselves
      showErrors: true
    });
    
    if (response.isSuccess()) {
      this.users = response.getData();
      actions.setUsers(this.users);
    } else {
      throw new Error(response.getError().message);
    }
  }
  
  /**
   * Render the page
   */
  render() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="user-management-page">
        <div class="page-header">
          <h1>User Management</h1>
          <div class="page-actions">
            <button class="btn btn-primary" id="add-user-btn">
              <i class="fas fa-plus"></i> Add User
            </button>
            <button class="btn btn-secondary" id="refresh-btn">
              <i class="fas fa-refresh"></i> Refresh
            </button>
          </div>
        </div>
        
        <div class="page-content">
          <div class="users-grid" id="users-grid">
            <!-- User cards will be rendered here -->
          </div>
          
          <div class="loading-state" id="loading-state" style="display: none;">
            <div class="spinner-border" role="status">
              <span class="sr-only">Loading...</span>
            </div>
            <p>Loading users...</p>
          </div>
          
          <div class="empty-state" id="empty-state" style="display: none;">
            <i class="fas fa-users fa-3x text-muted"></i>
            <h3>No Users Found</h3>
            <p>Get started by adding your first user.</p>
            <button class="btn btn-primary">Add User</button>
          </div>
        </div>
      </div>
    `;
    
    this.renderUserCards();
  }
  
  /**
   * Render user cards
   */
  renderUserCards() {
    const grid = this.container.querySelector('#users-grid');
    if (!grid) return;
    
    // Clear existing cards
    this.userCards.clear();
    grid.innerHTML = '';
    
    if (this.users.length === 0) {
      this.showEmptyState();
      return;
    }
    
    // Create user cards
    this.users.forEach(user => {
      const userCard = new UserCard(user);
      const cardElement = userCard.render();
      
      grid.appendChild(cardElement);
      this.userCards.set(user.id, userCard);
    });
    
    this.hideEmptyState();
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Add user button
    const addUserBtn = this.container.querySelector('#add-user-btn');
    if (addUserBtn) {
      addUserBtn.addEventListener('click', () => this.showAddUserModal());
    }
    
    // Refresh button
    const refreshBtn = this.container.querySelector('#refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshUsers());
    }
  }
  
  /**
   * Show add user modal
   */
  async showAddUserModal() {
    try {
      const { ModalManager } = await import('../services/ui-management.js');
      const modal = new ModalManager();
      
      const userData = await modal.showAddUserModal();
      if (userData) {
        await this.createUser(userData);
      }
    } catch (error) {
      this.logger.error('Failed to show add user modal:', error);
      actions.addError('Failed to open add user dialog');
    }
  }
  
  /**
   * Create new user
   */
  async createUser(userData) {
    try {
      const response = await apiClient.post('/api/users', userData, {
        showLoading: true,
        showErrors: true
      });
      
      if (response.isSuccess()) {
        const newUser = response.getData();
        this.users.push(newUser);
        actions.setUsers(this.users);
        actions.addNotification('User created successfully', 'success');
      }
    } catch (error) {
      this.logger.error('Failed to create user:', error);
      actions.addError('Failed to create user');
    }
  }
  
  /**
   * Refresh users
   */
  async refreshUsers() {
    try {
      await this.loadUsers();
      actions.addNotification('Users refreshed', 'info');
    } catch (error) {
      this.logger.error('Failed to refresh users:', error);
      actions.addError('Failed to refresh users');
    }
  }
  
  /**
   * Refresh user list
   */
  refreshUserList() {
    this.renderUserCards();
  }
  
  /**
   * Update loading state
   */
  updateLoadingState(loading) {
    const loadingState = this.container?.querySelector('#loading-state');
    const usersGrid = this.container?.querySelector('#users-grid');
    
    if (loadingState) {
      loadingState.style.display = loading ? 'block' : 'none';
    }
    
    if (usersGrid) {
      usersGrid.style.display = loading ? 'none' : 'block';
    }
  }
  
  /**
   * Show empty state
   */
  showEmptyState() {
    const emptyState = this.container?.querySelector('#empty-state');
    const usersGrid = this.container?.querySelector('#users-grid');
    
    if (emptyState) emptyState.style.display = 'block';
    if (usersGrid) usersGrid.style.display = 'none';
  }
  
  /**
   * Hide empty state
   */
  hideEmptyState() {
    const emptyState = this.container?.querySelector('#empty-state');
    const usersGrid = this.container?.querySelector('#users-grid');
    
    if (emptyState) emptyState.style.display = 'none';
    if (usersGrid) usersGrid.style.display = 'block';
  }
  
  /**
   * Destroy the page
   */
  destroy() {
    // Clean up user cards
    this.userCards.forEach(card => card.destroy());
    this.userCards.clear();
    
    // Clean up event listeners
    this.eventManager.removeAllListeners('UserManagementPage');
    
    this.container = null;
    this.logger.info('User management page destroyed');
  }
}