// Polyfill TextEncoder/TextDecoder for Node.js ESM tests
import { TextEncoder, TextDecoder } from 'util';
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Optionally polyfill setImmediate if needed
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = (cb, ...args) => setTimeout(() => cb(...args), 0);
}
