import NodeEnvironment from 'jest-environment-jsdom';
import { TextEncoder, TextDecoder } from 'util';

export default class CustomTestEnvironment extends NodeEnvironment {
  async setup() {
    await super.setup();
    
    if (typeof this.global.TextEncoder === 'undefined') {
      this.global.TextEncoder = TextEncoder;
    }
    
    if (typeof this.global.TextDecoder === 'undefined') {
      this.global.TextDecoder = TextDecoder;
    }
  }

  async teardown() {
    await super.teardown();
  }

  runScript(script) {
    return super.runScript(script);
  }
};
