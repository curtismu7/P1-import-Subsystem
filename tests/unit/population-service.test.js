/**
 * Population Service Unit Tests
 * 
 * Tests for the PopulationService class that centralizes all population-related API interactions.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import PopulationService from '../../public/js/modules/population-service.js';

describe('PopulationService', () => {
    let populationService;
    let mockApiClient;
    let mockTokenManager;
    let mockLogger;
    
    // Sample population data for testing
    const samplePopulations = {
        _embedded: {
            populations: [
                {
                    id: 'pop1',
                    name: 'Population 1',
                    description: 'Test population 1',
                    userCount: 100,
                    createdAt: '2023-01-01T00:00:00Z',
                    updatedAt: '2023-01-02T00:00:00Z'
                },
                {
                    id: 'pop2',
                    name: 'Population 2',
                    description: 'Test population 2',
                    userCount: 200,
                    createdAt: '2023-01-03T00:00:00Z',
                    updatedAt: '2023-01-04T00:00:00Z'
                },
                {
                    id: 'pop3',
                    name: 'Population 3',
                    description: null,
                    userCount: null,
                    createdAt: '2023-01-05T00:00:00Z',
                    updatedAt: '2023-01-06T00:00:00Z'
                }
            ]
        }
    };
    
    // Sample population for getPopulationById
    const samplePopulation = {
        id: 'pop1',
        name: 'Population 1',
        description: 'Test population 1',
        userCount: 100,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z'
    };
    
    beforeEach(() => {
        // Create mock API client
        mockApiClient = {
            getPopulations: sinon.stub(),
            request: sinon.stub(),
            settings: {
                environmentId: 'test-env-id'
            }
        };
        
        // Create mock token manager
        mockTokenManager = {
            getAccessToken: sinon.stub().resolves('test-token')
        };
        
        // Create mock logger
        mockLogger = {
            info: sinon.stub(),
            debug: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub()
        };
        
        // Create PopulationService instance with mocks
        populationService = new PopulationService(mockApiClient, mockTokenManager, mockLogger);
    });
    
    afterEach(() => {
        // Restore all stubs
        sinon.restore();
    });
    
    describe('constructor', () => {
        it('should throw an error if apiClient is not provided', () => {
            expect(() => new PopulationService()).to.throw('API client is required');
        });
        
        it('should initialize with default values if optional dependencies are not provided', () => {
            const service = new PopulationService(mockApiClient);
            expect(service.tokenManager).to.be.null;
            expect(service.logger).to.equal(console);
        });
        
        it('should initialize cache correctly', () => {
            expect(populationService.cache).to.deep.equal({
                populations: {
                    all: null,
                    byId: {}
                },
                lastFetched: 0
            });
        });
    });
    
    describe('getPopulations', () => {
        it('should return cached populations if available and not expired', async () => {
            // Set up cache
            populationService.cache.populations.all = [{ id: 'cached-pop', name: 'Cached Population' }];
            populationService.cache.lastFetched = Date.now();
            
            const result = await populationService.getPopulations();
            
            expect(result).to.deep.equal([{ id: 'cached-pop', name: 'Cached Population' }]);
            expect(mockApiClient.getPopulations.called).to.be.false;
        });
        
        it('should fetch populations from API if cache is empty', async () => {
            // Set up API response
            const mockResponse = {
                ok: true,
                json: sinon.stub().resolves(samplePopulations)
            };
            mockApiClient.getPopulations.resolves(mockResponse);
            
            const result = await populationService.getPopulations();
            
            expect(mockApiClient.getPopulations.calledOnce).to.be.true;
            expect(result).to.have.lengthOf(3);
            expect(result[0].id).to.equal('pop1');
            expect(result[0].name).to.equal('Population 1');
        });
        
        it('should fetch populations from API if cache is expired', async () => {
            // Set up expired cache
            populationService.cache.populations.all = [{ id: 'cached-pop', name: 'Cached Population' }];
            populationService.cache.lastFetched = Date.now() - (populationService.cacheExpirationTime + 1000);
            
            // Set up API response
            const mockResponse = {
                ok: true,
                json: sinon.stub().resolves(samplePopulations)
            };
            mockApiClient.getPopulations.resolves(mockResponse);
            
            const result = await populationService.getPopulations();
            
            expect(mockApiClient.getPopulations.calledOnce).to.be.true;
            expect(result).to.have.lengthOf(3);
        });
        
        it('should fetch populations from API if forceRefresh is true', async () => {
            // Set up cache
            populationService.cache.populations.all = [{ id: 'cached-pop', name: 'Cached Population' }];
            populationService.cache.lastFetched = Date.now();
            
            // Set up API response
            const mockResponse = {
                ok: true,
                json: sinon.stub().resolves(samplePopulations)
            };
            mockApiClient.getPopulations.resolves(mockResponse);
            
            const result = await populationService.getPopulations({}, true);
            
            expect(mockApiClient.getPopulations.calledOnce).to.be.true;
            expect(result).to.have.lengthOf(3);
        });
        
        it('should handle API error gracefully', async () => {
            mockApiClient.getPopulations.rejects(new Error('API error'));
            
            try {
                await populationService.getPopulations();
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.include('Error fetching populations');
                expect(error.originalError.message).to.equal('API error');
            }
        });
        
        it('should handle invalid response format gracefully', async () => {
            // Set up invalid API response
            const mockResponse = {
                ok: true,
                json: sinon.stub().resolves({ invalid: 'format' })
            };
            mockApiClient.getPopulations.resolves(mockResponse);
            
            try {
                await populationService.getPopulations();
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.include('Invalid response format');
            }
        });
        
        it('should sort populations by name', async () => {
            // Set up API response with unsorted populations
            const unsortedPopulations = {
                _embedded: {
                    populations: [
                        { id: 'pop3', name: 'Z Population' },
                        { id: 'pop1', name: 'A Population' },
                        { id: 'pop2', name: 'M Population' }
                    ]
                }
            };
            
            const mockResponse = {
                ok: true,
                json: sinon.stub().resolves(unsortedPopulations)
            };
            mockApiClient.getPopulations.resolves(mockResponse);
            
            const result = await populationService.getPopulations();
            
            expect(result[0].name).to.equal('A Population');
            expect(result[1].name).to.equal('M Population');
            expect(result[2].name).to.equal('Z Population');
        });
    });
    
    describe('getPopulationById', () => {
        it('should throw an error if populationId is not provided', async () => {
            try {
                await populationService.getPopulationById();
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.include('Population ID is required');
            }
        });
        
        it('should return cached population if available', async () => {
            // Set up cache
            populationService.cache.populations.byId = {
                'pop1': { id: 'pop1', name: 'Cached Population' }
            };
            
            const result = await populationService.getPopulationById('pop1');
            
            expect(result).to.deep.equal({ id: 'pop1', name: 'Cached Population' });
            expect(mockApiClient.request.called).to.be.false;
        });
        
        it('should find population in all populations cache if available', async () => {
            // Set up cache
            populationService.cache.populations.all = [
                { id: 'pop1', name: 'Population 1' },
                { id: 'pop2', name: 'Population 2' }
            ];
            populationService.cache.lastFetched = Date.now();
            
            const result = await populationService.getPopulationById('pop2');
            
            expect(result).to.deep.equal({ id: 'pop2', name: 'Population 2' });
            expect(mockApiClient.request.called).to.be.false;
            // Should also update byId cache
            expect(populationService.cache.populations.byId['pop2']).to.deep.equal({ id: 'pop2', name: 'Population 2' });
        });
        
        it('should fetch population from API if not in cache', async () => {
            // Set up API response
            const mockResponse = {
                ok: true,
                json: sinon.stub().resolves(samplePopulation)
            };
            mockApiClient.request.resolves(mockResponse);
            
            const result = await populationService.getPopulationById('pop1');
            
            expect(mockApiClient.request.calledOnce).to.be.true;
            expect(mockApiClient.request.firstCall.args[0]).to.include('/populations/pop1');
            expect(result.id).to.equal('pop1');
            expect(result.name).to.equal('Population 1');
        });
        
        it('should handle 404 error gracefully', async () => {
            // Set up 404 API response
            const mockResponse = {
                ok: false,
                status: 404,
                text: sinon.stub().resolves('Not found')
            };
            mockApiClient.request.resolves(mockResponse);
            
            try {
                await populationService.getPopulationById('non-existent');
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.include('Population with ID non-existent not found');
            }
        });
        
        it('should handle other API errors gracefully', async () => {
            // Set up error API response
            const mockResponse = {
                ok: false,
                status: 500,
                text: sinon.stub().resolves('Server error')
            };
            mockApiClient.request.resolves(mockResponse);
            
            try {
                await populationService.getPopulationById('pop1');
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.include('Failed to fetch population: 500');
            }
        });
    });
    
    describe('populateDropdown', () => {
        let dropdownElement;
        
        beforeEach(() => {
            // Create a dropdown element for testing
            dropdownElement = document.createElement('select');
            dropdownElement.id = 'test-dropdown';
            document.body.appendChild(dropdownElement);
            
            // Stub getPopulations to return test data
            sinon.stub(populationService, 'getPopulations').resolves([
                { id: 'pop1', name: 'Population 1', userCount: 100 },
                { id: 'pop2', name: 'Population 2', userCount: 200 }
            ]);
        });
        
        afterEach(() => {
            // Remove the dropdown element
            if (dropdownElement && dropdownElement.parentNode) {
                dropdownElement.parentNode.removeChild(dropdownElement);
            }
        });
        
        it('should throw an error if dropdownId is not provided', async () => {
            try {
                await populationService.populateDropdown();
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.include('Dropdown ID is required');
            }
        });
        
        it('should throw an error if dropdown element is not found', async () => {
            try {
                await populationService.populateDropdown('non-existent-dropdown');
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.include('Dropdown element with ID "non-existent-dropdown" not found');
            }
        });
        
        it('should populate dropdown with populations', async () => {
            const result = await populationService.populateDropdown('test-dropdown');
            
            expect(result).to.be.true;
            expect(dropdownElement.options.length).to.equal(3); // 2 populations + empty option
            expect(dropdownElement.options[0].value).to.equal('');
            expect(dropdownElement.options[0].text).to.equal('Select a population');
            expect(dropdownElement.options[1].value).to.equal('pop1');
            expect(dropdownElement.options[1].text).to.equal('Population 1 (100 users)');
            expect(dropdownElement.options[2].value).to.equal('pop2');
            expect(dropdownElement.options[2].text).to.equal('Population 2 (200 users)');
        });
        
        it('should not include empty option when includeEmpty is false', async () => {
            const result = await populationService.populateDropdown('test-dropdown', { includeEmpty: false });
            
            expect(result).to.be.true;
            expect(dropdownElement.options.length).to.equal(2); // 2 populations, no empty option
            expect(dropdownElement.options[0].value).to.equal('pop1');
        });
        
        it('should customize empty option text', async () => {
            const result = await populationService.populateDropdown('test-dropdown', { emptyText: 'Custom empty text' });
            
            expect(result).to.be.true;
            expect(dropdownElement.options[0].text).to.equal('Custom empty text');
        });
        
        it('should select specified population', async () => {
            const result = await populationService.populateDropdown('test-dropdown', { selectedId: 'pop2' });
            
            expect(result).to.be.true;
            expect(dropdownElement.value).to.equal('pop2');
        });
        
        it('should handle error when fetching populations', async () => {
            // Make getPopulations throw an error
            populationService.getPopulations.restore();
            sinon.stub(populationService, 'getPopulations').rejects(new Error('Failed to fetch populations'));
            
            try {
                await populationService.populateDropdown('test-dropdown');
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.include('Error populating dropdown');
                expect(dropdownElement.disabled).to.be.false;
                expect(dropdownElement.innerHTML).to.include('Error loading populations');
            }
        });
    });
    
    describe('clearCache', () => {
        beforeEach(() => {
            // Set up cache
            populationService.cache.populations.all = [
                { id: 'pop1', name: 'Population 1' },
                { id: 'pop2', name: 'Population 2' }
            ];
            populationService.cache.populations.byId = {
                'pop1': { id: 'pop1', name: 'Population 1' },
                'pop2': { id: 'pop2', name: 'Population 2' }
            };
            populationService.cache.lastFetched = Date.now();
        });
        
        it('should clear the entire cache when no populationId is provided', () => {
            populationService.clearCache();
            
            expect(populationService.cache.populations.all).to.be.null;
            expect(populationService.cache.populations.byId).to.deep.equal({});
            expect(populationService.cache.lastFetched).to.equal(0);
        });
        
        it('should clear a specific population from the cache when populationId is provided', () => {
            populationService.clearCache('pop1');
            
            expect(populationService.cache.populations.all).to.have.lengthOf(1);
            expect(populationService.cache.populations.all[0].id).to.equal('pop2');
            expect(populationService.cache.populations.byId).to.not.have.property('pop1');
            expect(populationService.cache.populations.byId).to.have.property('pop2');
        });
    });
    
    describe('_formatPopulationForDisplay', () => {
        it('should return empty string for null population', () => {
            expect(populationService._formatPopulationForDisplay(null)).to.equal('');
        });
        
        it('should include user count if available', () => {
            const population = { name: 'Test Population', userCount: 100 };
            expect(populationService._formatPopulationForDisplay(population)).to.equal('Test Population (100 users)');
        });
        
        it('should not include user count if not available', () => {
            const population = { name: 'Test Population' };
            expect(populationService._formatPopulationForDisplay(population)).to.equal('Test Population');
        });
    });
    
    describe('_sortPopulations', () => {
        it('should return empty array for non-array input', () => {
            expect(populationService._sortPopulations(null)).to.deep.equal([]);
            expect(populationService._sortPopulations({})).to.deep.equal([]);
            expect(populationService._sortPopulations('string')).to.deep.equal([]);
        });
        
        it('should sort populations by name case-insensitively', () => {
            const populations = [
                { name: 'Zebra' },
                { name: 'apple' },
                { name: 'Banana' }
            ];
            
            const sorted = populationService._sortPopulations(populations);
            
            expect(sorted[0].name).to.equal('apple');
            expect(sorted[1].name).to.equal('Banana');
            expect(sorted[2].name).to.equal('Zebra');
        });
        
        it('should handle populations with null or undefined names', () => {
            const populations = [
                { name: 'Zebra' },
                { name: null },
                { name: undefined },
                { name: 'Apple' }
            ];
            
            const sorted = populationService._sortPopulations(populations);
            
            expect(sorted[0].name).to.be.oneOf([null, undefined, '']);
            expect(sorted[1].name).to.be.oneOf([null, undefined, '']);
            expect(sorted[2].name).to.equal('Apple');
            expect(sorted[3].name).to.equal('Zebra');
        });
    });
});