/**
 * Example Component - User Card
 * 
 * Demonstrates how to create components using the new structure
 * Uses the consolidated UI components and utilities
 */

// Import from the organized structure
import { UIComponents } from '../components/ui-components.js';
import { CoreUtils } from '../utils/core-utils.js';
import { appState, actions } from '../state/app-state.js';

export class UserCard {
  constructor(userData) {
    this.userData = userData;
    this.element = null;
    
    // Use consolidated utilities
    this.logger = CoreUtils.createLogger('UserCard');
    this.domUtils = CoreUtils.getDOMUtils();
  }
  
  /**
   * Render the user card component
   */
  render() {
    // Use consolidated UI components
    const cardTemplate = UIComponents.createCard({
      title: this.userData.name,
      subtitle: this.userData.email,
      content: this.renderUserDetails(),
      actions: this.renderActions()
    });
    
    this.element = this.domUtils.createElement('div', {
      className: 'user-card',
      innerHTML: cardTemplate
    });
    
    this.attachEventListeners();
    return this.element;
  }
  
  /**
   * Render user details
   */
  renderUserDetails() {
    return `
      <div class="user-details">
        <p><strong>ID:</strong> ${this.userData.id}</p>
        <p><strong>Status:</strong> ${this.userData.status}</p>
        <p><strong>Created:</strong> ${new Date(this.userData.created).toLocaleDateString()}</p>
      </div>
    `;
  }
  
  /**
   * Render action buttons
   */
  renderActions() {
    return `
      <div class="user-actions">
        <button class="btn btn-primary btn-sm" data-action="edit">Edit</button>
        <button class="btn btn-danger btn-sm" data-action="delete">Delete</button>
      </div>
    `;
  }
  
  /**
   * Attach event listeners
   */
  attachEventListeners() {
    if (!this.element) return;
    
    this.element.addEventListener('click', (e) => {
      const action = e.target.getAttribute('data-action');
      if (action) {
        this.handleAction(action);
      }
    });
  }
  
  /**
   * Handle user actions
   */
  async handleAction(action) {
    try {
      switch (action) {
        case 'edit':
          await this.editUser();
          break;
        case 'delete':
          await this.deleteUser();
          break;
        default:
          this.logger.warn('Unknown action:', action);
      }
    } catch (error) {
      this.logger.error('Action failed:', error);
      actions.addError(`Failed to ${action} user: ${error.message}`);
    }
  }
  
  /**
   * Edit user
   */
  async editUser() {
    // Use consolidated services
    const { ModalManager } = await import('../services/ui-management.js');
    const { apiClient } = await import('../services/api-client.js');
    
    const modal = new ModalManager();
    const result = await modal.showEditUserModal(this.userData);
    
    if (result) {
      const response = await apiClient.put(`/api/users/${this.userData.id}`, result);
      if (response.isSuccess()) {
        this.userData = { ...this.userData, ...result };
        this.refresh();
        actions.addNotification('User updated successfully', 'success');
      }
    }
  }
  
  /**
   * Delete user
   */
  async deleteUser() {
    const { ModalManager } = await import('../services/ui-management.js');
    const { apiClient } = await import('../services/api-client.js');
    
    const modal = new ModalManager();
    const confirmed = await modal.showConfirmDialog(
      'Delete User',
      `Are you sure you want to delete ${this.userData.name}?`
    );
    
    if (confirmed) {
      const response = await apiClient.delete(`/api/users/${this.userData.id}`);
      if (response.isSuccess()) {
        this.element.remove();
        actions.addNotification('User deleted successfully', 'success');
      }
    }
  }
  
  /**
   * Refresh the component
   */
  refresh() {
    if (this.element) {
      const newElement = this.render();
      this.element.replaceWith(newElement);
    }
  }
  
  /**
   * Destroy the component
   */
  destroy() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}