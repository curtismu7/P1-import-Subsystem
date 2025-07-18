# Population Selection Issue Debug Summary

## Issue Description
The user reported that imports are always using "Test" population regardless of what population is selected in the dropdown. This suggests there may be a default population being automatically selected or a fallback mechanism that's overriding the user's selection.

## Root Cause Analysis

### 1. Default Population Detection
The system has an automatic default population detection mechanism in `routes/settings.js`:

```javascript
// Helper function to fetch default population
async function fetchDefaultPopulation(environmentId, clientId, clientSecret) {
    // ... authentication and API calls ...
    
    if (populations._embedded && populations._embedded.populations && populations._embedded.populations.length > 0) {
        const defaultPopulation = populations._embedded.populations[0]; // ⚠️ First population is used as default
        logger.info('Auto-detected default population', {
            populationId: '***' + defaultPopulation.id.slice(-4),
            name: defaultPopulation.name,
            userCount: defaultPopulation.userCount || 0
        });
        return defaultPopulation.id;
    }
}
```

**Problem**: The system automatically selects the **first population** in the list as the default, which might be named "Test".

### 2. Population Selection Flow
The population selection process follows this flow:

1. **Frontend Selection**: User selects population from dropdown
2. **Storage**: Population ID and name are stored in `app.selectedPopulationId` and `app.selectedPopulationName`
3. **Import Request**: Population data is sent to server via FormData
4. **Server Processing**: Server uses the provided population data for import

### 3. Potential Issues

#### A. Default Population Override
- Settings may have a default population configured
- The system might be falling back to the first available population
- "Test" population might be the first in the list

#### B. Population Loading Issues
- Populations might not be loading correctly
- Dropdown might not be updating properly
- Selection might not be persisting

#### C. Server-Side Override
- Server might be ignoring the provided population
- Default population might be used instead

## Debugging Approach

### 1. Created Debug Test Page
**File**: `test-population-selection-issue.html`

This page provides comprehensive debugging tools:

#### A. Current State Analysis
- Checks if the app is available
- Examines current population selection
- Shows stored population ID and name
- Displays dropdown state

#### B. Population Loading Test
- Loads all available populations from API
- Displays population list with details
- Identifies if "Test" population exists
- Shows population order (first = default)

#### C. Selection Testing
- Tests population selection functionality
- Validates selection persistence
- Warns if "Test" population is selected

#### D. Import Simulation
- Simulates actual import process
- Sends population data to server
- Compares selected vs. used population
- Detects population mismatches

#### E. Settings Analysis
- Checks current application settings
- Identifies default population configuration
- Shows environment and API settings

### 2. Enhanced Error Logging
Added population information to WebSocket and Socket.IO error logs:

**Files Modified**:
- `server.js` - WebSocket error logging
- `public/js/modules/progress-manager.js` - Client-side error logging
- `public/js/app.js` - Main app error logging
- `routes/api/index.js` - SSE error logging

**Enhancement**: All error logs now include:
```javascript
{
    populationId: "selected-population-id",
    populationName: "Selected Population Name"
}
```

## Testing Instructions

### 1. Run the Debug Page
1. Navigate to: `http://127.0.0.1:4001/test-population-selection-issue.html`
2. Click "Load Populations" to see available populations
3. Check if "Test" population is first in the list
4. Test population selection and import simulation

### 2. Check Current State
1. Go to the main import page
2. Open browser console
3. Run: `window.app.getCurrentPopulationSelection()`
4. Check: `window.app.selectedPopulationId` and `window.app.selectedPopulationName`

### 3. Verify Settings
1. Check `/api/settings` endpoint
2. Look for `populationId` field
3. Verify if default population is configured

## Potential Solutions

### 1. Fix Default Population Logic
**File**: `routes/settings.js`

Instead of using the first population, implement smarter default selection:

```javascript
// Look for populations with specific names
const defaultPop = populations.find(pop => 
    pop.name.toLowerCase().includes('default') ||
    pop.name.toLowerCase().includes('main') ||
    pop.name.toLowerCase().includes('primary')
);

// If no specific default found, ask user to select
if (!defaultPop) {
    // Don't auto-select, require user choice
    return null;
}
```

### 2. Remove Auto-Default Population
**File**: `routes/settings.js`

Disable automatic default population detection:

```javascript
// Comment out or remove the default population logic
// const defaultPopulationId = await fetchDefaultPopulation(...);
// if (defaultPopulationId) {
//     settings.populationId = defaultPopulationId;
// }
```

### 3. Enhance Population Selection Validation
**File**: `public/js/app.js`

Add validation to ensure user has explicitly selected a population:

```javascript
getImportOptions() {
    const selectedPopulationId = document.getElementById('import-population-select')?.value;
    
    if (!selectedPopulationId) {
        this.uiManager.showError('No population selected', 'Please explicitly select a population before importing.');
        return null;
    }
    
    // Additional validation to prevent "Test" population if it's not intended
    const selectedPopulationName = document.getElementById('import-population-select')?.selectedOptions[0]?.text || '';
    if (selectedPopulationName === 'Test') {
        this.uiManager.showWarning('Test Population Selected', 'You have selected the "Test" population. Please confirm this is correct.');
    }
    
    // ... rest of the method
}
```

## Next Steps

1. **Run the debug page** to identify the exact issue
2. **Check if "Test" population is first** in the populations list
3. **Verify settings** for default population configuration
4. **Test import simulation** to see if population selection is working
5. **Implement appropriate fix** based on findings

## Files Created/Modified

### New Files
- `test-population-selection-issue.html` - Comprehensive debug page
- `POPULATION-SELECTION-ISSUE-DEBUG-SUMMARY.md` - This summary

### Enhanced Files
- `server.js` - Added population info to WebSocket error logs
- `public/js/modules/progress-manager.js` - Added population info to client error logs
- `public/js/app.js` - Added population info to main app error logs
- `routes/api/index.js` - Added population info to SSE error logs

The debug page will help identify whether the issue is:
- Default population being automatically selected
- Population loading problems
- Selection persistence issues
- Server-side override problems 