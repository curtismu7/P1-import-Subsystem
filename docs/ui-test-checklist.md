# UI Functionality Test Checklist

This checklist helps verify that all UI functionality works correctly with the optimized bundle.

## 1. Core Functionality

- [x] 1.1. Application loads without errors
- [x] 1.2. Startup screen appears and then disappears
- [x] 1.3. Navigation between views works (Home, Import, Export, etc.)
- [x] 1.4. Sidebar navigation highlights active view
- [ ] 1.5. Token status indicator shows correct status
- [ ] 1.6. Global status bar shows messages correctly

## 2. Import Functionality

- [ ] 2.1. Import view loads correctly
- [ ] 2.2. File upload via button works
- [ ] 2.3. Drag and drop file upload works
- [ ] 2.4. Population dropdown loads and is selectable
- [ ] 2.5. Import options (skip duplicates) can be toggled
- [ ] 2.6. Start Import button enables when file and population are selected
- [ ] 2.7. Progress UI appears and updates during import

## 3. Export Functionality

- [ ] 3.1. Export view loads correctly
- [ ] 3.2. Population dropdown loads and is selectable
- [ ] 3.3. Export options can be configured
- [ ] 3.4. Start Export button works
- [ ] 3.5. Export progress is displayed
- [ ] 3.6. Download link appears after export completes

## 4. Settings Functionality

- [ ] 4.1. Settings view loads correctly
- [ ] 4.2. API credentials can be entered
- [ ] 4.3. Environment ID field works
- [ ] 4.4. Region dropdown works
- [ ] 4.5. Test Connection button works
- [ ] 4.6. Get Token button works
- [ ] 4.7. Save Settings button works
- [ ] 4.8. Toggle Secret visibility button works

## 5. Modal Functionality

- [ ] 5.1. Disclaimer modal appears on first load
- [ ] 5.2. Credentials modal appears when needed
- [ ] 5.3. Error modals display correctly
- [ ] 5.4. Confirmation modals work properly
- [ ] 5.5. Modal loading overlay appears during transitions

## 6. Advanced Features

- [ ] 6.1. Real-time updates work via Socket.IO
- [ ] 6.2. Token refresh works automatically
- [ ] 6.3. Error handling shows appropriate messages
- [ ] 6.4. History view shows past operations
- [ ] 6.5. Logs view displays application logs

## Notes

- Add any observations or issues here
- Include browser and environment details
