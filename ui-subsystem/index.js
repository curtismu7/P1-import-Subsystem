/**
 * UI Component Subsystem
 * 
 * Provides a unified API for UI components with consistent styling and behavior.
 * This subsystem encapsulates all UI-related functionality, providing a clean
 * interface for the rest of the application.
 * 
 * Key features:
 * - Reusable UI components
 * - Consistent styling and behavior
 * - Theme management
 * - Component lifecycle management
 * - Event handling
 * - Accessibility features
 * 
 * Usage:
 * ```javascript
 * import { Button, Modal, Notification, ThemeManager } from 'ui-subsystem';
 * 
 * // Create a button
 * const button = new Button({
 *   text: 'Click me',
 *   variant: 'primary',
 *   onClick: () => {
 *     console.log('Button clicked!');
 *   }
 * });
 * 
 * // Mount button to DOM
 * button.mount(document.getElementById('button-container'));
 * 
 * // Show a notification
 * Notification.success('Operation completed successfully!');
 * 
 * // Create and show a modal
 * const modal = new Modal({
 *   title: 'Confirm Action',
 *   content: 'Are you sure you want to proceed?',
 *   buttons: [
 *     {
 *       text: 'Cancel',
 *       variant: 'secondary',
 *       onClick: () => modal.hide()
 *     },
 *     {
 *       text: 'Confirm',
 *       variant: 'primary',
 *       onClick: () => {
 *         // Perform action
 *         modal.hide();
 *       }
 *     }
 *   ]
 * });
 * 
 * modal.show();
 * 
 * // Set up theme management
 * const themeManager = new ThemeManager({
 *   defaultTheme: 'light',
 *   persistent: true
 * });
 * 
 * // Switch theme
 * themeManager.setTheme('dark');
 * ```
 */

import BaseComponent from './components/base-component.js';
import Button from './components/button.js';
import Modal from './components/modal.js';
import Notification from './components/notification.js';
import ThemeManager from './theme/theme-manager.js';

/**
 * Create a theme manager with the provided configuration
 * @param {Object} options - Configuration options
 * @returns {ThemeManager} Configured theme manager
 */
function createThemeManager(options = {}) {
    return new ThemeManager(options);
}

/**
 * Create a button component
 * @param {Object} options - Button options
 * @returns {Button} Button component
 */
function createButton(options = {}) {
    return new Button(options);
}

/**
 * Create a modal component
 * @param {Object} options - Modal options
 * @returns {Modal} Modal component
 */
function createModal(options = {}) {
    return new Modal(options);
}

/**
 * Create a notification component
 * @param {Object} options - Notification options
 * @returns {Notification} Notification component
 */
function createNotification(options = {}) {
    return new Notification(options);
}

// Export factory functions
export { 
    createThemeManager, 
    createButton, 
    createModal, 
    createNotification 
};

// Export classes for direct instantiation
export { 
    BaseComponent, 
    Button, 
    Modal, 
    Notification, 
    ThemeManager 
};

// Export default object with factory functions
export default {
    createThemeManager,
    createButton,
    createModal,
    createNotification,
    BaseComponent,
    Button,
    Modal,
    Notification,
    ThemeManager
};