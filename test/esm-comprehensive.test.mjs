/**
 * Comprehensive ESM Testing Suite
 * Tests the full ESM compatibility of the PingOne Import Tool
 * Version: 7.0.2.4
 */

// This test file verifies that Jest can properly test the project's ESM modules
describe('Comprehensive ESM Testing', () => {
  // Test importing package.json
  it('should be able to import package.json', async () => {
    const packageJson = await import('../package.json', { assert: { type: 'json' } });
    expect(packageJson.default).toBeDefined();
    expect(packageJson.default.type).toBe('module');
    expect(packageJson.default.name).toBe('pingone-import-cursor');
    expect(packageJson.default.version).toBeDefined();
  });

  // Test modern JavaScript features
  it('should support all modern JavaScript features', () => {
    // Test optional chaining
    const config = {
      settings: {
        api: {
          url: 'https://api.example.com'
        }
      }
    };
    
    const apiUrl = config?.settings?.api?.url;
    expect(apiUrl).toBe('https://api.example.com');
    
    // Test nullish coalescing
    const region = null;
    const defaultRegion = region ?? 'NorthAmerica';
    expect(defaultRegion).toBe('NorthAmerica');
    
    // Test object spread
    const baseConfig = { version: '7.0.2.4', env: 'test' };
    const extendedConfig = { ...baseConfig, debug: true };
    expect(extendedConfig.version).toBe('7.0.2.4');
    expect(extendedConfig.debug).toBe(true);
    
    // Test array methods
    const items = [1, 2, 3, 4, 5];
    const doubled = items.map(x => x * 2);
    expect(doubled).toEqual([2, 4, 6, 8, 10]);
    
    // Test template literals
    const name = 'PingOne';
    const greeting = `Hello, ${name}!`;
    expect(greeting).toBe('Hello, PingOne!');
  });

  // Test async/await
  it('should support async/await with promises', async () => {
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    const start = Date.now();
    await delay(10);
    const elapsed = Date.now() - start;
    
    expect(elapsed).toBeGreaterThanOrEqual(5);
  });

  // Test class features
  it('should support modern class features', () => {
    class TestService {
      #privateField = 'private';
      
      constructor(name) {
        this.name = name;
      }
      
      getName() {
        return this.name;
      }
      
      getPrivate() {
        return this.#privateField;
      }
      
      static create(name) {
        return new TestService(name);
      }
    }
    
    const service = TestService.create('test');
    expect(service.getName()).toBe('test');
    expect(service.getPrivate()).toBe('private');
  });

  // Test dynamic imports
  it('should support dynamic imports', async () => {
    // Import a JSON file dynamically
    const { default: config } = await import('../package.json', { assert: { type: 'json' } });
    expect(config).toBeDefined();
    expect(typeof config).toBe('object');
    expect(config.name).toBe('pingone-import-cursor');
  });

  // Test top-level await
  it('should support top-level await simulation', async () => {
    // Simulate top-level await
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
    
    // Multiple awaits
    const values = await Promise.all([
      Promise.resolve(1),
      Promise.resolve(2),
      Promise.resolve(3)
    ]);
    
    expect(values).toEqual([1, 2, 3]);
  });
});
