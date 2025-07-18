/**
 * Population Verification Tests
 * 
 * Comprehensive tests to verify that all population-related functionality works correctly
 * after the PopulationService integration.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import PopulationService from '../../public/js/modules/population-service.js';

describe('Population Functionality Verification', () => {
    let populationService;
    let mockApiClient;
    let mockLogger;
    let sandbox;
    
    // Sample population data for testing
    const samplePopulations = {
        _embedded: {
            populations: [
                {
                    id: 'pop1',
                    name: 'Test Population 1',
                    description: 'First test population',
                    userCount: 150,
                    createdAt: '2023-01-01T00:00:00Z',
                    updatedAt: '2023-01-02T00:00:00Z'
                },
                {
                    id: 'pop2',
                    name: 'Test Population 2',
                    description: 'Second test population',
                    userCount: 75,
                    createdAt: '2023-01-03T00:00:00Z',
                    updatedAt: '2023-01-04T00:00:00Z'
                }
            ]
        }
    };
    
    beforeEach(() => {
        // Create sandbox for stubs
        sandbox = sinon.createSandbox();
        
        // Create mock API client
        mockApiClient = {
            getPopulations: sandbox.stub(),
            request: sandbox.stub(),
            settings: {
                environmentId: 'test-env-id'
            }
        };
        
        // Create mock logger
        mockLogger = {
            info: sandbox.stub(),
            debug: sandbox.stub(),
            warn: sandbox.stub(),
            error: sandbox.stub()
        };
        
        // Create PopulationService instance
        populationService = new PopulationService(mockApiClient, null, mockLogger);
    });
    
    afterEach(() => {
        // Clean up DOM elements
        const testElements = document.querySelectorAll('[id^=\"test-\"]');
        testElements.forEach(el => el.remove());
        
        // Restore all stubs
        sandbox.restore();
    });
    
    describe('Core PopulationService Functionality', () => {
        it('should successfully fetch and cache populations', async () => {
            // Set up API response
            const mockResponse = {
                ok: true,
                json: sandbox.stub().resolves(samplePopulations)
            };
            mockApiClient.getPopulations.resolves(mockResponse);
            
            // First call should fetch from API
            const populations1 = await populationService.getPopulations();
            expect(populations1).to.have.lengthOf(2);
            expect(populations1[0].name).to.equal('Test Population 1');
            expect(mockApiClient.getPopulations.calledOnce).to.be.true;
            
            // Second call should use cache
            const populations2 = await populationService.getPopulations();
            expect(populations2).to.deep.equal(populations1);
            expect(mockApiClient.getPopulations.calledOnce).to.be.true; // Still only called once
        });
        
        it('should successfully fetch individual population by ID', async () => {
            // Set up cache first
            const mockResponse = {
                ok: true,
                json: sandbox.stub().resolves(samplePopulations)
            };
            mockApiClient.getPopulations.resolves(mockResponse);
            await populationService.getPopulations();
            
            // Get population by ID from cache
            const population = await populationService.getPopulationById('pop1');
            expect(population.id).to.equal('pop1');
            expect(population.name).to.equal('Test Population 1');
            expect(population.userCount).to.equal(150);
        });
        
        it('should clear cache correctly', async () => {
            // Set up cache
            const mockResponse = {
                ok: true,
                json: sandbox.stub().resolves(samplePopulations)
            };
            mockApiClient.getPopulations.resolves(mockResponse);
            await populationService.getPopulations();
            
            // Verify cache is populated
            expect(populationService.cache.populations.all).to.have.lengthOf(2);
            
            // Clear cache
            populationService.clearCache();
            
            // Verify cache is cleared
            expect(populationService.cache.populations.all).to.be.null;
            expect(populationService.cache.populations.byId).to.deep.equal({});
            expect(populationService.cache.lastFetched).to.equal(0);
        });
    });
    
    describe('Dropdown Population Functionality', () => {
        let dropdownElement;
        
        beforeEach(() => {
            // Create a test dropdown element
            dropdownElement = document.createElement('select');
            dropdownElement.id = 'test-population-dropdown';
            document.body.appendChild(dropdownElement);
            
            // Set up API response
            const mockResponse = {
                ok: true,
                json: sandbox.stub().resolves(samplePopulations)
            };
            mockApiClient.getPopulations.resolves(mockResponse);
        });
        
        it('should populate dropdown with populations', async () => {
            const success = await populationService.populateDropdown('test-population-dropdown');
            
            expect(success).to.be.true;
            expect(dropdownElement.options.length).to.equal(3); // 2 populations + empty option
            expect(dropdownElement.options[0].value).to.equal('');
            expect(dropdownElement.options[0].text).to.equal('Select a population');
            expect(dropdownElement.options[1].value).to.equal('pop1');
            expect(dropdownElement.options[1].text).to.equal('Test Population 1 (150 users)');
            expect(dropdownElement.options[2].value).to.equal('pop2');
            expect(dropdownElement.options[2].text).to.equal('Test Population 2 (75 users)');
            expect(dropdownElement.disabled).to.be.false;
        });
        
        it('should handle dropdown population with custom options', async () => {
            const success = await populationService.populateDropdown('test-population-dropdown', {
                includeEmpty: false,
                selectedId: 'pop2'
            });
            
            expect(success).to.be.true;
            expect(dropdownElement.options.length).to.equal(2); // No empty option
            expect(dropdownElement.value).to.equal('pop2');
        });
        
        it('should handle dropdown population with custom empty text', async () => {
            const success = await populationService.populateDropdown('test-population-dropdown', {
                emptyText: 'Choose a population'
            });
            
            expect(success).to.be.true;
            expect(dropdownElement.options[0].text).to.equal('Choose a population');
        });
        
        it('should handle errors gracefully when populating dropdown', async () => {
            // Make API call fail
            mockApiClient.getPopulations.rejects(new Error('API Error'));
            
            const success = await populationService.populateDropdown('test-population-dropdown');
            
            expect(success).to.be.false;
            expect(dropdownElement.disabled).to.be.false;
            expect(dropdownElement.options[0].text).to.equal('Error loading populations');
        });
        
        it('should handle missing dropdown element gracefully', async () => {
            const success = await populationService.populateDropdown('non-existent-dropdown');
            
            expect(success).to.be.false;
        });
    });
    
    describe('Error Handling', () => {
        it('should handle API errors with meaningful messages', async () => {
            mockApiClient.getPopulations.rejects(new Error('Network error'));
            
            try {
                await populationService.getPopulations();
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.include('Error fetching populations');
                expect(error.originalError.message).to.equal('Network error');
                expect(error.operation).to.equal('fetching populations');
            }
        });
        
        it('should handle invalid API responses', async () => {
            const mockResponse = {
                ok: true,
                json: sandbox.stub().resolves({ invalid: 'format' })
            };
            mockApiClient.getPopulations.resolves(mockResponse);
            
            try {
                await populationService.getPopulations();
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.include('Invalid response format');
            }
        });
        
        it('should handle HTTP error responses', async () => {
            const mockResponse = {
                ok: false,
                status: 500,
                text: sandbox.stub().resolves('Server Error')
            };
            mockApiClient.getPopulations.resolves(mockResponse);
            
            try {
                await populationService.getPopulations();
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.include('Failed to fetch populations: 500');
            }
        });
    });
    
    describe('Population Sorting and Formatting', () => {
        it('should sort populations by name', async () => {
            // Create unsorted populations
            const unsortedPopulations = {
                _embedded: {
                    populations: [
                        { id: 'pop3', name: 'Zebra Population', userCount: 10 },
                        { id: 'pop1', name: 'Alpha Population', userCount: 20 },
                        { id: 'pop2', name: 'Beta Population', userCount: 30 }\n                    ]\n                }\n            };\n            \n            const mockResponse = {\n                ok: true,\n                json: sandbox.stub().resolves(unsortedPopulations)\n            };\n            mockApiClient.getPopulations.resolves(mockResponse);\n            \n            const populations = await populationService.getPopulations();\n            \n            expect(populations[0].name).to.equal('Alpha Population');\n            expect(populations[1].name).to.equal('Beta Population');\n            expect(populations[2].name).to.equal('Zebra Population');\n        });\n        \n        it('should format populations for display correctly', () => {\n            const populationWithCount = { name: 'Test Pop', userCount: 100 };\n            const populationWithoutCount = { name: 'Test Pop' };\n            \n            expect(populationService._formatPopulationForDisplay(populationWithCount))\n                .to.equal('Test Pop (100 users)');\n            expect(populationService._formatPopulationForDisplay(populationWithoutCount))\n                .to.equal('Test Pop');\n            expect(populationService._formatPopulationForDisplay(null))\n                .to.equal('');\n        });\n    });\n    \n    describe('Cache Management', () => {\n        it('should respect cache expiration time', async () => {\n            // Set up initial API response\n            const mockResponse = {\n                ok: true,\n                json: sandbox.stub().resolves(samplePopulations)\n            };\n            mockApiClient.getPopulations.resolves(mockResponse);\n            \n            // First call\n            await populationService.getPopulations();\n            expect(mockApiClient.getPopulations.calledOnce).to.be.true;\n            \n            // Simulate cache expiration by setting lastFetched to past\n            populationService.cache.lastFetched = Date.now() - (populationService.cacheExpirationTime + 1000);\n            \n            // Second call should fetch from API again\n            await populationService.getPopulations();\n            expect(mockApiClient.getPopulations.calledTwice).to.be.true;\n        });\n        \n        it('should force refresh when requested', async () => {\n            // Set up API response\n            const mockResponse = {\n                ok: true,\n                json: sandbox.stub().resolves(samplePopulations)\n            };\n            mockApiClient.getPopulations.resolves(mockResponse);\n            \n            // First call\n            await populationService.getPopulations();\n            expect(mockApiClient.getPopulations.calledOnce).to.be.true;\n            \n            // Force refresh should bypass cache\n            await populationService.getPopulations({}, true);\n            expect(mockApiClient.getPopulations.calledTwice).to.be.true;\n        });\n        \n        it('should clear specific population from cache', async () => {\n            // Set up cache\n            const mockResponse = {\n                ok: true,\n                json: sandbox.stub().resolves(samplePopulations)\n            };\n            mockApiClient.getPopulations.resolves(mockResponse);\n            await populationService.getPopulations();\n            \n            // Verify cache is populated\n            expect(populationService.cache.populations.all).to.have.lengthOf(2);\n            expect(populationService.cache.populations.byId).to.have.property('pop1');\n            \n            // Clear specific population\n            populationService.clearCache('pop1');\n            \n            // Verify specific population is removed\n            expect(populationService.cache.populations.all).to.have.lengthOf(1);\n            expect(populationService.cache.populations.byId).to.not.have.property('pop1');\n            expect(populationService.cache.populations.byId).to.have.property('pop2');\n        });\n    });\n});\n