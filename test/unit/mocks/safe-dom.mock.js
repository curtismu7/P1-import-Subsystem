/**
 * Mock for SafeDOM class
 */
import { jest } from '@jest/globals';

export const safeDOMInstance = {
  select: jest.fn((selector, parent = document) => parent.querySelector(selector)),
  updateElement: jest.fn((selector, text, className) => {
    const element = document.querySelector(selector);
    if (element) {
      if (text !== undefined) element.textContent = text;
      if (className !== undefined) element.className = className;
    }
    return element;
  }),
  createElement: jest.fn((tagName, className, html) => {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (html) element.innerHTML = html;
    return element;
  }),
  append: jest.fn((parent, child) => {
    if (parent && child) {
      parent.appendChild(child);
    }
    return parent;
  }),
  remove: jest.fn((element) => {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  })
};

// Export a class constructor that properly handles 'new' keyword
export class SafeDOM {
  constructor() {
    // Return all the mock methods by copying them to this instance
    Object.assign(this, safeDOMInstance);
    return this;
  }
}
