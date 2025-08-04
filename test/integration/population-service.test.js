/**
 * Population Service Integration Tests
 * 
 * Integration tests for the PopulationService class that centralizes all population-related API interactions.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import PopulationService from '../../public/js/modules/population-service.js';
import apiFactory from '../../public/js/modules/api-factory.js';
import TokenManager from '../../public/js/modules/token-manager.js';

describe('PopulationService Integration', () => {
    let populationService;
    let apiClient;
    let tokenManager;
    let sandbox;
    
    // Flag to skip tests that require a real API connection
    const shouldSkip = process.env.SKIP_INTEGRATION_TESTS === 'true' || !process.env.PINGONE_ENVIRONMENT_ID;
    
    before(function() {
        if (shouldSkip) {
            console.log('Skipping PopulationService integration tests that require API connection');
            this.skip();
        }
        
        // Create sandbox for stubs
        sandbox = sinon.createSandbox();
        
        // Get real API client
        apiClient = apiFactory.getPingOneClient();
        
        // Create token manager
        tokenManager = new TokenManager();
        
        // Create PopulationService instance with real dependencies
        populationService = new PopulationService(apiClient, tokenManager, console);
    });
    
    after(() => {
        // Restore all stubs
        sandbox.restore();
    });
    
    describe('Integration with API client and token manager', () => {
        it('should fetch populations from real API', async function() {
            this.timeout(10000); // Increase timeout for API call
            
            try {
                const populations = await populationService.getPopulations();
                
                expect(populations).to.be.an('array');
                if (populations.length > 0) {
                    expect(populations[0]).to.have.property('id');
                    expect(populations[0]).to.have.property('name');
                }
            } catch (error) {
                if (error.message.includes('401') || error.message.includes('403')) {
                    this.skip(); // Skip if unauthorized (no valid token)
                } else {
                    throw error;
                }
            }
        });
        
        it('should use cache for subsequent calls', async function() {
            this.timeout(10000); // Increase timeout for API call
            
            try {
                // First call should hit the API
                await populationService.getPopulations();
                
                // Spy on the API client
                const spy = sandbox.spy(apiClient, 'getPopulations');
                
                // Second call should use cache
                await populationService.getPopulations();
                
                expect(spy.called).to.be.false;
            } catch (error) {
                if (error.message.includes('401') || error.message.includes('403')) {
                    this.skip(); // Skip if unauthorized (no valid token)
import populationManager from '../../public/js/modules/population-manager.js';
                } else {
                    throw error;
                }
            }
        });
        
        it('should bypass cache when forceRefresh is true', async function() {
            this.timeout(10000); // Increase timeout for API call
            
            try {
                // First call to ensure cache is populated
                await populationService.getPopulations();
                
                // Spy on the API client
                const spy = sandbox.spy(apiClient, 'getPopulations');
                
                // Call with forceRefresh should bypass cache
                await populationService.getPopulations({}, true);
                
                expect(spy.calledOnce).to.be.true;
            } catch (error) {
                if (error.message.includes('401') || error.message.includes('403')) {
                    this.skip(); // Skip if unauthorized (no valid token)
                } else {
                    throw error;
                }
            }
        });
    });
    
    describe('DOM Integration', () => {
        let dropdownElement;
        
        beforeEach(() => {
            // Create a dropdown element for testing
            dropdownElement = document.createElement('select');
            dropdownElement.id = 'test-population-dropdown';
            document.body.appendChild(dropdownElement);
            
            // Stub the getPopulations method to avoid API calls
            sandbox.stub(populationService, 'getPopulations').resolves([
                { id: 'pop1', name: 'Population 1', userCount: 100 },
                { id: 'pop2', name: 'Population 2', userCount: 200 },
                { id: 'pop3', name: 'Population 3' }
            ]);
        });
        
        afterEach(() => {
            // Remove the dropdown element
            if (dropdownElement && dropdownElement.parentNode) {
                dropdownElement.parentNode.removeChild(dropdownElement);
            }
        });
        
        it('should populate a dropdown with population options', async () => {
            await populationService.populateDropdown('test-population-dropdown');
            
            expect(dropdownElement.options.length).to.equal(4); // 3 populations + empty option
            expect(dropdownElement.options[0].value).to.equal('');
            expect(dropdownElement.options[1].value).to.equal('pop1');
            expect(dropdownElement.options[1].text).to.equal('Population 1 (100 users)');
            expect(dropdownElement.options[2].value).to.equal('pop2');
            expect(dropdownElement.options[3].value).to.equal('pop3');
            expect(dropdownElement.options[3].text).to.equal('Population 3'); // No user count
        });
        
        it('should select the specified population', async () => {
            await populationService.populateDropdown('test-population-dropdown', {
                selectedId: 'pop2'
            });
            
            expect(dropdownElement.value).to.equal('pop2');
        });
        
        it('should customize the empty option text', async () => {
            await populationService.populateDropdown('test-population-dropdown', {
                emptyText: 'Custom empty text'
            });
            
            expect(dropdownElement.options[0].text).to.equal('Custom empty text');
        });
        
        it('should not include empty option when includeEmpty is false', async () => {
            await populationService.populateDropdown('test-population-dropdown', {
                includeEmpty: false
            });
            
            expect(dropdownElement.options.length).to.equal(3); // 3 populations, no empty option
            expect(dropdownElement.options[0].value).to.equal('pop1');
        });
    });
    
    describe('Integration with PopulationManager', () => {
        let populationManager;
        
        before(() => {
            // Import the PopulationManager
            try {
                import populationManager from '../../public/js/modules/population-manager.js';
            } catch (error) {
                console.log('PopulationManager not available, skipping integration tests');
                populationManager = null;
            }
        });
        
        beforeEach(() => {
            if (!populationManager) {
                this.skip();
                return;
            }
            
            // Stub the populationService methods in the manager
            sandbox.stub(populationManager.populationService, 'populateDropdown').resolves(true);
            sandbox.stub(populationManager.populationService, 'getPopulationById').resolves({
                id: 'test-pop',
                name: 'Test Population'
            });
            sandbox.stub(populationManager.populationService, 'clearCache');
        });
        
        it('should use PopulationService in initPopulationDropdown', async () => {
            if (!populationManager) this.skip();
            
            await populationManager.initPopulationDropdown('test-dropdown', {
                selectedId: 'test-pop'
            });
            
            expect(populationManager.populationService.populateDropdown.calledOnce).to.be.true;
            expect(populationManager.populationService.populateDropdown.firstCall.args[0]).to.equal('test-dropdown');
            expect(populationManager.populationService.getPopulationById.calledOnce).to.be.true;
            expect(populationManager.populationService.getPopulationById.firstCall.args[0]).to.equal('test-pop');
            expect(populationManager.selectedPopulation).to.deep.equal({
                id: 'test-pop',
                name: 'Test Population'
            });
        });
        
        it('should use PopulationService in selectPopulation', async () => {
            if (!populationManager) this.skip();
            
            const result = await populationManager.selectPopulation('test-pop');
            
            expect(populationManager.populationService.getPopulationById.calledOnce).to.be.true;
            expect(populationManager.populationService.getPopulationById.firstCall.args[0]).to.equal('test-pop');
            expect(result).to.deep.equal({
                id: 'test-pop',
                name: 'Test Population'
            });
            expect(populationManager.selectedPopulation).to.deep.equal({
                id: 'test-pop',
                name: 'Test Population'
            });
        });
        
        it('should use PopulationService in refreshPopulations', async () => {
            if (!populationManager) this.skip();
            
            await populationManager.refreshPopulations('test-dropdown', {
                selectedId: 'test-pop'
            });
            
            expect(populationManager.populationService.clearCache.calledOnce).to.be.true;
            expect(populationManager.populationService.populateDropdown.calledOnce).to.be.true;
            expect(populationManager.populationService.populateDropdown.firstCall.args[0]).to.equal('test-dropdown');
        });
    });
});