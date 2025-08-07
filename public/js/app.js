/**
 * PingOne Import Tool - Main Application JavaScript
 * 
 * This file contains the core functionality for the PingOne user import tool,
 * including file upload handling, progress tracking, and UI management.
 * 
 * Key Features:
 * - CSV file upload and validation
 * - Real-time progress tracking via Server-Sent Events (SSE)
 * - Population management and selection
 * - Error handling and user feedback
 * - Token management and authentication
 * - Centralized state management for improved reliability
 * 
 * @version 7.2.0
 * @author PingOne Import Tool Team
 */

// Import centralized state management
import { appState, actions, selectors } from './state/app-state.js';

// Import standardized communication services
import { apiClient } from './services/standardized-api-client.js';
import { realtimeClient } from './services/realtime-client.js';

/**
 * Main Application Class
 */
export class PingOneImportApp {
  constructor() {
    this.initialized = false;
    this.socket = null;
    this.eventSource = null;
    this.currentOperation = null;
    
    // Bind methods
    this.init = this.init.bind(this);
    this.handleError = this.handleError.bind(this);
    this.setupEventListeners = this.setupEventListeners.bind(this);
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      console.log('🚀 Initializing PingOne Import Tool...');
      
      // Initialize state management
      await this.initializeState();
      
      // Setup UI components
      await this.initializeUI();
      
      // Setup real-time communication
      await this.initializeRealtime();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Load initial data
      await this.loadInitialData();
      
      this.initialized = true;
      console.log('✅ PingOne Import Tool initialized successfully');
      
      // Notify state that app is ready
      actions.setAppReady(true);
      
    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
      this.handleError(error);
    }
  }

  /**
   * Initialize state management
   */
  async initializeState() {
    // Subscribe to state changes
    appState.subscribe('error', (state) => {
      if (state.error) {
        this.displayError(state.error);
      }
    });

    appState.subscribe('loading', (state) => {
      this.updateLoadingState(state.loading);
    });

    appState.subscribe('currentOperation', (state) => {
      this.currentOperation = state.currentOperation;
      this.updateOperationUI(state.currentOperation);
    });

    console.log('✅ State management initialized');
  }

  /**
   * Initialize UI components
   */
  async initializeUI() {
    // Setup navigation
    this.setupNavigation();
    
    // Setup forms
    this.setupForms();
    
    // Setup modals
    this.setupModals();
    
    console.log('✅ UI components initialized');
  }

  /**
   * Initialize real-time communication
   */
  async initializeRealtime() {
    try {
      // Use our enhanced real-time client
      await realtimeClient.connect();
      
      // Associate with session if available
      const sessionId = this.generateSessionId();
      realtimeClient.associateSession(sessionId);
      
      // Subscribe to relevant channels
      realtimeClient.subscribe('progress');
      realtimeClient.subscribe('notifications');
      realtimeClient.subscribe('errors');
      
      console.log('✅ Enhanced real-time communication initialized');
    } catch (error) {
      console.warn('⚠️ Real-time communication failed to initialize:', error);
      // Continue without real-time features
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // File upload handling
    const fileInput = document.getElementById('csvFile');
    if (fileInput) {
      fileInput.addEventListener('change', this.handleFileSelect.bind(this));
    }

    // Form submissions
    const importForm = document.getElementById('importForm');
    if (importForm) {
      importForm.addEventListener('submit', this.handleImportSubmit.bind(this));
    }

    const exportForm = document.getElementById('exportForm');
    if (exportForm) {
      exportForm.addEventListener('submit', this.handleExportSubmit.bind(this));
    }

    // Navigation
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-page]')) {
        e.preventDefault();
        const page = e.target.getAttribute('data-page');
        this.navigateToPage(page);
      }
    });

    console.log('✅ Event listeners setup complete');
  }

  /**
   * Load initial data
   */
  async loadInitialData() {
    try {
      // Use standardized API client for consistent communication
      
      // Load settings
      const settingsResponse = await apiClient.get('/api/settings');
      if (settingsResponse.isSuccess()) {
        actions.setSettings(settingsResponse.getData());
      } else {
        console.warn('Failed to load settings:', settingsResponse.getError());
      }

      // Load populations
      const populationsResponse = await apiClient.get('/api/populations');
      if (populationsResponse.isSuccess()) {
        actions.setPopulations(populationsResponse.getData());
      } else {
        console.warn('Failed to load populations:', populationsResponse.getError());
      }

      console.log('✅ Initial data loaded with standardized API client');
    } catch (error) {
      console.error('Failed to load initial data:', error);
      actions.addError('Failed to load initial data');
    }
  }

  /**
   * Setup navigation
   */
  setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        // Remove active class from all links
        navLinks.forEach(l => l.classList.remove('active'));
        // Add active class to clicked link
        e.target.classList.add('active');
      });
    });
  }

  /**
   * Setup forms
   */
  setupForms() {
    // Add form validation and handling
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      form.addEventListener('submit', (e) => {
        if (!this.validateForm(form)) {
          e.preventDefault();
        }
      });
    });
  }

  /**
   * Setup modals
   */
  setupModals() {
    // Modal handling will be added here
  }

  /**
   * Handle file selection
   */
  handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      actions.addError('Please select a CSV file');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      actions.addError('File size must be less than 10MB');
      return;
    }

    actions.setSelectedFile(file);
    console.log('File selected:', file.name);
  }

  /**
   * Handle import form submission
   */
  async handleImportSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const file = formData.get('file');
    
    if (!file) {
      actions.addError('Please select a file to import');
      return;
    }

    try {
      actions.setCurrentOperation('import');

      // Use standardized API client for file upload
      const response = await apiClient.uploadFile('/api/import', file, {
        fields: {
          populationId: formData.get('populationId'),
          populationName: formData.get('populationName')
        },
        showLoading: true,
        showErrors: true
      });

      if (response.isSuccess()) {
        actions.addNotification('Import started successfully', 'success');
        // Progress will be updated via real-time client
      } else {
        const error = response.getError();
        actions.addError(error.message || 'Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);
      actions.addError('Import failed: ' + error.message);
    }
  }

  /**
   * Handle export form submission
   */
  async handleExportSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const exportData = Object.fromEntries(formData.entries());
    
    try {
      actions.setCurrentOperation('export');

      // Use standardized API client
      const response = await apiClient.post('/api/export', exportData, {
        showLoading: true,
        showErrors: true
      });

      if (response.isSuccess()) {
        actions.addNotification('Export started successfully', 'success');
        // Progress will be updated via real-time client
      } else {
        const error = response.getError();
        actions.addError(error.message || 'Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      actions.addError('Export failed: ' + error.message);
    }
  }

  /**
   * Navigate to a page
   */
  navigateToPage(page) {
    // Simple client-side routing
    const contentBody = document.getElementById('content-body');
    const pageTitle = document.getElementById('page-title');
    
    if (pageTitle) {
      pageTitle.textContent = page.charAt(0).toUpperCase() + page.slice(1);
    }

    // Load page content (this would be expanded with actual page loading)
    if (contentBody) {
      contentBody.innerHTML = `<div class="loading-spinner">Loading ${page}...</div>`;
      
      // Simulate loading page content
      setTimeout(() => {
        contentBody.innerHTML = `<h2>${page.charAt(0).toUpperCase() + page.slice(1)} Page</h2><p>Content for ${page} page would go here.</p>`;
      }, 500);
    }

    actions.setCurrentPage(page);
  }

  /**
   * Validate form
   */
  validateForm(form) {
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
      if (!field.value.trim()) {
        field.classList.add('is-invalid');
        isValid = false;
      } else {
        field.classList.remove('is-invalid');
      }
    });

    return isValid;
  }

  /**
   * Update loading state
   */
  updateLoadingState(loading) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
      spinner.style.display = loading ? 'block' : 'none';
    }
  }

  /**
   * Update operation UI
   */
  updateOperationUI(operation) {
    // Update UI based on current operation
    const operationElements = document.querySelectorAll('[data-operation]');
    operationElements.forEach(element => {
      const elementOperation = element.getAttribute('data-operation');
      element.style.display = elementOperation === operation ? 'block' : 'none';
    });
  }

  /**
   * Display error message
   */
  displayError(error) {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const alert = document.createElement('div');
    alert.className = 'alert alert-danger alert-dismissible fade show';
    alert.innerHTML = `
      <strong>Error:</strong> ${error}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    container.appendChild(alert);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (alert.parentNode) {
        alert.remove();
      }
    }, 5000);
  }

  /**
   * Handle application errors
   */
  handleError(error) {
    console.error('Application error:', error);
    actions.addError(error.message || 'An unexpected error occurred');
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (realtimeClient) {
      realtimeClient.disconnect();
    }
    
    if (this.eventSource) {
      this.eventSource.close();
    }
    
    this.initialized = false;
  }
}

// Create and export app instance
const app = new PingOneImportApp();

// Auto-initialize if running in browser
if (typeof window !== 'undefined') {
  // Export to global scope for debugging
  window.pingOneApp = app;
}

export default app;