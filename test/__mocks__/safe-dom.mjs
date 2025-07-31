// Mock SafeDOM implementation for testing
export const SafeDOM = {
  // Safe element creation with error handling
  createElement: (tagName, className, html) => {
    try {
      const element = document.createElement(tagName);
      if (className) element.className = className;
      if (html) element.innerHTML = html;
      return element;
    } catch (error) {
      console.error(`Error creating element ${tagName}:`, error);
      return null;
    }
  },
  
  // Safe element selection with error handling
  select: (selector, parent = document) => {
    try {
      return parent.querySelector(selector);
    } catch (error) {
      console.error(`Error selecting element with selector ${selector}:`, error);
      return null;
    }
  },
  
  // Safe element appending with error handling
  append: (parent, child) => {
    try {
      if (parent && child) {
        parent.appendChild(child);
      }
      return parent;
    } catch (error) {
      console.error('Error appending element:', error);
      return parent;
    }
  },
  
  // Safe element removal with error handling
  remove: (element) => {
    try {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error removing element:', error);
      return false;
    }
  },
  
  // Safe text content update with error handling
  setText: (element, text) => {
    try {
      if (element) {
        element.textContent = text;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error setting text content:', error);
      return false;
    }
  },
  
  // Safe class manipulation
  addClass: (element, className) => {
    try {
      if (element && className) {
        element.classList.add(className);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error adding class:', error);
      return false;
    }
  },
  
  removeClass: (element, className) => {
    try {
      if (element && className) {
        element.classList.remove(className);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error removing class:', error);
      return false;
    }
  },
  
  // Safe attribute manipulation
  setAttribute: (element, attr, value) => {
    try {
      if (element && attr) {
        element.setAttribute(attr, value);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error setting attribute:', error);
      return false;
    }
  },
  
  // Safe element update with class and text
  updateElement: (selector, text, className) => {
    try {
      const element = document.querySelector(selector);
      if (element) {
        if (text !== undefined) {
          element.textContent = text;
        }
        if (className) {
          element.className = className;
        }
        return element;
      }
      return null;
    } catch (error) {
      console.error(`Error updating element ${selector}:`, error);
      return null;
    }
  }
};
