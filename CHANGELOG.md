# Changelog

## Version 0.2.0 - 2025-12-13

### Fixed
- Removed unnecessary `async` keyword from `selectProject()` function in WebView
- Added comprehensive console logging for debugging project and task selection
- Added error messages when task loading fails
- Fixed potential issues with project/task dropdown selection

### Added
- **Debugging Guide** (`DEBUGGING.md`)
  - Step-by-step troubleshooting instructions
  - Console logging reference for API integration
  - Common error solutions and fixes
  - Quick check procedures

### Enhanced
- Better error feedback for API failures with user-friendly messages
- Improved logging with `[TimeTracker]` prefix for easy filtering in console
- More detailed error information in console

## Version 0.1.0 - 2025-12-13

### Added
- **TaskHub API Integration**
  - API client for TaskHub integration
  - Support for API Key and Basic Authentication methods
  - Project selection from API in finish task form
  - Task selection from selected project
  - Auto-fill project and task names from API

- **Settings WebView**
  - User-friendly settings interface
  - API endpoint configuration
  - Authentication method selection (API Key / Basic Auth)
  - API credentials management
  - Connection test button
  - Real-time connection status feedback

### Enhanced
- Localization support for API features (EN, RU, UK)
- README with API configuration instructions
- Better error handling for API requests

### Files Added
- `src/ApiClient.js` - API client module
- `LICENSE` - MIT license
- `.vscodeignore` - VSIX packaging configuration
- `CHANGELOG.md` - This file

### Changed
- Updated `package.json` with configuration schema
- Enhanced `WebviewManager.js` with API integration
- Improved `LocalizationManager.js` with new translation keys
