/**
 * UI Logging Page Renderer
 * 
 * This module provides functionality to render logs in the UI Logging Page
 * with enhanced formatting, filtering, and grouping.
 */

import { uiLogger } from './uiLogger.js';

// Function to render logs in the UI Logging Page
export function renderUILogs(logs) {
  const logContainer = document.getElementById('log-container');
  logContainer.innerHTML = '';

  logs.forEach(log => {
    const logElement = document.createElement('div');
    logElement.className = `log-entry log-${log.level}`;
    logElement.innerHTML = `
      <div class="log-timestamp">${log.timestamp}</div>
      <div class="log-context">${log.context}</div>
      <div class="log-message">${log.message}</div>
    `;
    logContainer.appendChild(logElement);
  });
}

// Function to filter logs by level
export function filterLogsByLevel(logs, level) {
  return logs.filter(log => log.level === level);
}

// Function to group logs by operation
export function groupLogsByOperation(logs) {
  const groupedLogs = {};
  logs.forEach(log => {
    const operation = log.operation || 'General';
    if (!groupedLogs[operation]) {
      groupedLogs[operation] = [];
    }
    groupedLogs[operation].push(log);
  });
  return groupedLogs;
}
