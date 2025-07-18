# Population Subsystem

## Overview

The Population Subsystem in the PingOne Import Tool provides a centralized way to manage and interact with PingOne populations. It consists of two main components:

1. **PopulationService**: A low-level service that handles direct API interactions with the PingOne API for population-related operations.
2. **PopulationManager**: A higher-level manager that uses the PopulationService and provides a simplified interface for common population-related operations.

## Architecture

The Population Subsystem follows a layered architecture:

```
┌─────────────────────┐
│     App.js          │
│  (UI Components)    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  PopulationManager  │
│  (Business Logic)   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  PopulationService  │
│   (API Interface)   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│    PingOne API      │
└─────────────────────┘
```

## Key Features

- **Centralized API Interactions**: All population-related API calls are handled by the PopulationService.
- **In-Memory Caching**: Populations are cached to improve performance and reduce API calls.
- **Dropdown Population**: Easy population of dropdown elements with population data.
- **Error Handling**: Consistent error handling and meaningful error messages.
- **Sorting**: Automatic sorting of populations by name for consistent UI display.

## Components

### PopulationService

The PopulationService is responsible for direct interactions with the PingOne API for population-related operations. It provides methods for fetching populations, retrieving individual populations by ID, populating UI dropdowns, and managing population data caching.

See [PopulationService Documentation](./population-service.md) for more details.

### PopulationManager

The PopulationManager provides a higher-level interface for working with populations. It delegates the actual API interactions to the PopulationService and provides a simplified interface for common population-related operations.

See [PopulationManager Documentation](./population-manager.md) for more details.

## Integration Points

The Population Subsystem integrates with the following components:

- **App.js**: Uses the PopulationService directly for population-related functionality.
- **Import/Export/Modify/Delete Pages**: Use the PopulationManager to initialize and manage population dropdowns.
- **API Client**: Used by the PopulationService to make API calls to the PingOne API.
- **Token Manager**: Used by the PopulationService for authentication.
- **Logger**: Used by both components for logging.

## Usage Examples

### Initializing a Population Dropdown

```javascript
// Using PopulationManager (recommended)
import populationManager from './modules/population-manager.js';

await populationManager.initPopulationDropdown('population-dropdown', {
  includeEmpty: true,
  emptyText: 'Select a population',
  selectedId: 'existing-population-id'
});

// Using PopulationService directly
import PopulationService from './modules/population-service.js';

const populationService = new PopulationService(apiClient, tokenManager, logger);
await populationService.populateDropdown('population-dropdown', {
  includeEmpty: true,
  emptyText: 'Select a population',
  selectedId: 'existing-population-id'
});
```

### Selecting a Population

```javascript
// Using PopulationManager (recommended)
const population = await populationManager.selectPopulation('population-id');

// Using PopulationService directly
const population = await populationService.getPopulationById('population-id');
```

### Refreshing Populations

```javascript
// Using PopulationManager (recommended)
await populationManager.refreshPopulations('population-dropdown');

// Using PopulationService directly
populationService.clearCache();
await populationService.populateDropdown('population-dropdown');
```