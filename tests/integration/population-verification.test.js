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
                        { id: 'pop2', name: 'Beta Population', userCount: 30 }
                    ]
                }
            };

            const mockResponse = {
                ok: true,
                json: sandbox.stub().resolves(unsortedPopulations)
            };
            mockApiClient.getPopulations.resolves(mockResponse);

            const populations = await populationService.getPopulations();

            expect(populations[0].name).to.equal('Alpha Population');
            expect(populations[1].name).to.equal('Beta Population');
            expect(populations[2].name).to.equal('Zebra Population');
        });

            it('should format populations for display correctly', () => {
                const populationWithCount = { name: 'Test Pop', userCount: 100 };
                const populationWithoutCount = { name: 'Test Pop' };

                expect(populationService._formatPopulationForDisplay(populationWithCount))
                    .to.equal('Test Pop (100 users)');
                expect(populationService._formatPopulationForDisplay(populationWithoutCount))
                    .to.equal('Test Pop');
                expect(populationService._formatPopulationForDisplay(null))
                    .to.equal('');
            });
        });

        describe('Cache Management', () => {
            it('should respect cache expiration time', async () => {
                // Set up initial API response
                const mockResponse = {
                    ok: true,
                    json: sandbox.stub().resolves(samplePopulations)
                };
                mockApiClient.getPopulations.resolves(mockResponse);

                // First call
                await populationService.getPopulations();
                expect(mockApiClient.getPopulations.calledOnce).to.be.true;

                // Simulate cache expiration by setting lastFetched to past
                populationService.cache.lastFetched = Date.now() - (populationService.cacheExpirationTime + 1000);

                // Second call should fetch from API again
                await populationService.getPopulations();
                expect(mockApiClient.getPopulations.calledTwice).to.be.true;
            });

            it('should force refresh when requested', async () => {
                // Set up API response
                const mockResponse = {
                    ok: true,
                    json: sandbox.stub().resolves(samplePopulations)
                };
                mockApiClient.getPopulations.resolves(mockResponse);

                // First call
                await populationService.getPopulations();
                expect(mockApiClient.getPopulations.calledOnce).to.be.true;

                // Force refresh should bypass cache
                await populationService.getPopulations({}, true);
                expect(mockApiClient.getPopulations.calledTwice).to.be.true;
            });

            it('should clear specific population from cache', async () => {
                // Set up cache
                const mockResponse = {
                    ok: true,
                    json: sandbox.stub().resolves(samplePopulations)
                };
                mockApiClient.getPopulations.resolves(mockResponse);
                await populationService.getPopulations();

                // Verify cache is populated
                expect(populationService.cache.populations.all).to.have.lengthOf(2);
                expect(populationService.cache.populations.byId).to.have.property('pop1');

                // Clear specific population
                populationService.clearCache('pop1');

                // Verify specific population is removed
                expect(populationService.cache.populations.all).to.have.lengthOf(1);
                expect(populationService.cache.populations.byId).to.not.have.property('pop1');
                expect(populationService.cache.populations.byId).to.have.property('pop2');
            });
        });
    });