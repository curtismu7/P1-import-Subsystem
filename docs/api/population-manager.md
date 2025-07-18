# Population Manager

## Overview

The PopulationManager is a higher-level interface for working with populations in the PingOne Import Tool. It delegates the actual API interactions to the PopulationService and provides a simplified interface for common population-related operations.

## Features

- Population dropdown initialization
- Population selection
- Population refresh
- Caching management

## Usage

```javascript
// Get the singleton instance
import populationManager from './modules/population-manager.js';

// Initialize a population dropdown
await populationManager.initPopulationDropdown('population-dropdown', {
  includeEmpty: true,
  emptyText: 'Select a population',
  selectedId: 'existing-population-id'
});

// Select a population
const population = await populationManager.selectPopulation('population-id');

// Refresh populations
await populationManager.refreshPopulations('population-dropdown');

// Get the currently selected population
const selectedPopulation = populationManager.getSelectedPopulation();
```

## API Reference

### Constructor

```javascript
new PopulationManager()
```

Creates a new PopulationManager instance and initializes the PopulationService.

### Methods

#### initPopulationDropdown

```javascript
async initPopulationDropdown(dropdownId, options = {})
```

Initializes a dropdown element with population data.

- `dropdownId`: ID of the dropdown element to populate
- `options`: Options for populating the dropdown
  - `includeEmpty`: Whether to include an empty option (default: true)
  - `emptyText`: Text for the empty option (default: 'Select a population')
  - `selectedId`: ID of the population to select
- Returns: Promise resolving to true if successful, false otherwise

#### selectPopulation

```javascript
async selectPopulation(populationId)
```

Selects a population by ID.

- `populationId`: ID of the population to select
- Returns: Promise resolving to the selected population object, or null if not found

#### refreshPopulations

```javascript
async refreshPopulations(dropdownId, options = {})
```

Refreshes the populations in a dropdown element.

- `dropdownId`: ID of the dropdown element to refresh
- `options`: Options for populating the dropdown (same as initPopulationDropdown)
- Returns: Promise resolving to true if successful, false otherwise

#### getSelectedPopulation

```javascript
getSelectedPopulation()
```

Gets the currently selected population.

- Returns: The currently selected population object, or null if none selected

## Integration with PopulationService

The PopulationManager uses the PopulationService to handle all population-related API interactions. It creates an instance of the PopulationService in its constructor and delegates API calls to it.

```javascript
constructor() {
  this.populationService = new PopulationService(this.apiClient, null, logger);
}

async initPopulationDropdown(dropdownId, options = {}) {
  return this.populationService.populateDropdown(dropdownId, options);
}

async selectPopulation(populationId) {
  return this.populationService.getPopulationById(populationId);
}

async refreshPopulations(dropdownId, options = {}) {
  this.populationService.clearCache();
  return this.initPopulationDropdown(dropdownId, options);
}
```

## Error Handling

The PopulationManager handles errors gracefully and provides meaningful error messages. It catches errors from the PopulationService and displays them to the user using the UI Manager.

```javascript
try {
  await this.populationService.populateDropdown(dropdownId, options);
} catch (error) {
  logger.error(`Error populating dropdown ${dropdownId}: ${error.message}`, { error });
  uiManager.showError(`Failed to load populations: ${error.message}`);
  return false;
}
```