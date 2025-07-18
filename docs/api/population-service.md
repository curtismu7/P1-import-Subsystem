# Population Service

## Overview

The PopulationService is a centralized service for all population-related API interactions in the PingOne Import Tool. It provides a unified interface for fetching populations, retrieving individual populations by ID, populating UI dropdowns, and managing population data caching.

## Features

- In-memory caching of population data for improved performance
- Automatic population sorting by name for consistent UI display
- Graceful error handling with meaningful messages
- Integration with existing authentication and API client systems
- Support for populating UI dropdowns with population data

## Usage

```javascript
// Create an instance with dependencies
const populationService = new PopulationService(
  apiFactory.getPingOneClient(),
  tokenManager,
  logger
);

// Get all populations (uses cache if available)
const populations = await populationService.getPopulations();

// Get a specific population by ID
const population = await populationService.getPopulationById('populationId');

// Populate a dropdown with population data
await populationService.populateDropdown('dropdown-element-id');

// Clear the cache to force fresh data on next request
populationService.clearCache();
```

## API Reference

### Constructor

```javascript
new PopulationService(apiClient, tokenManager, logger)
```

- `apiClient` (required): API client for making requests to PingOne API
- `tokenManager` (optional): Token manager for authentication
- `logger` (optional): Logger for logging messages

### Methods

#### getPopulations

```javascript
async getPopulations(options = {}, forceRefresh = false)
```

Fetches all populations from the PingOne API.

- `options`: Query options for the API call
- `forceRefresh`: Whether to bypass cache and force a fresh API call
- Returns: Promise resolving to an array of population objects

#### getPopulationById

```javascript
async getPopulationById(populationId, forceRefresh = false)
```

Fetches a specific population by ID.

- `populationId`: ID of the population to fetch
- `forceRefresh`: Whether to bypass cache and force a fresh API call
- Returns: Promise resolving to a population object

#### populateDropdown

```javascript
async populateDropdown(dropdownId, options = {})
```

Populates a dropdown element with population data.

- `dropdownId`: ID of the dropdown element to populate
- `options`: Options for populating the dropdown
  - `includeEmpty`: Whether to include an empty option (default: true)
  - `emptyText`: Text for the empty option (default: 'Select a population')
  - `selectedId`: ID of the population to select
- Returns: Promise resolving to true if successful, false otherwise

#### clearCache

```javascript
clearCache(populationId = null)
```

Clears the population cache.

- `populationId`: Optional ID of specific population to clear from cache

## Integration with Other Components

### PopulationManager

The PopulationService is used by the PopulationManager to handle all population-related API interactions. The PopulationManager provides a higher-level interface for working with populations and is responsible for managing the selected population.

```javascript
// In PopulationManager
constructor() {
  this.populationService = new PopulationService(this.apiClient, null, logger);
}

async initPopulationDropdown(dropdownId, options = {}) {
  return this.populationService.populateDropdown(dropdownId, options);
}
```

### App.js

The App.js file uses the PopulationService directly for population-related functionality:

```javascript
// In App.js
const populationService = new PopulationService(this.pingOneClient, null, this.logger);

async loadPopulationsForDropdown(dropdownId) {
  return this.populationService.populateDropdown(dropdownId, {
    includeEmpty: true,
    emptyText: 'Select a population'
  });
}
```

## Error Handling

The PopulationService handles errors gracefully and provides meaningful error messages. All methods that make API calls return promises that reject with formatted error objects containing:

- A descriptive error message
- The original error object
- The operation that failed

```javascript
try {
  const populations = await populationService.getPopulations();
} catch (error) {
  console.error(error.message); // "Error fetching populations: API error"
  console.error(error.originalError); // Original error object
  console.error(error.operation); // "fetching populations"
}
```

## Caching

The PopulationService implements in-memory caching to optimize performance. The cache has the following structure:

```javascript
{
  populations: {
    all: Array<Population>,  // All populations
    byId: {                  // Populations indexed by ID
      [populationId]: Population
    }
  },
  lastFetched: number        // Timestamp of last fetch
}
```

The cache expires after 15 minutes by default. You can force a fresh API call by passing `true` as the `forceRefresh` parameter to `getPopulations` or `getPopulationById`.

## Population Object Structure

Population objects have the following structure:

```javascript
{
  id: string,           // Population ID
  name: string,         // Population name
  description: string,  // Population description (optional)
  userCount: number,    // Number of users in the population (optional)
  createdAt: string,    // Creation timestamp
  updatedAt: string     // Last update timestamp
}
```