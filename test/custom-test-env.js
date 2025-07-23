import NodeEnvironment from 'jest-environment-jsdom';
import { TextEncoder, TextDecoder } from 'util';

export default class CustomTestEnvironment extends NodeEnvironment {
  async setup() {
    await super.setup();
    this.global.TextEncoder = TextEncoder;
    this.global.TextDecoder = TextDecoder;
  }
}
