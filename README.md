# ECM TimeTracker

Time tracking extension for Visual Studio Code with TaskHub API integration.

## Quick Start

1) Open this folder in VS Code.
2) Open Run and Debug panel → select "Launch Extension".
3) Press F5 — a new VS Code window will launch with the extension installed locally.
4) The extension will start automatically when opening a project (activationEvents: "*").
5) Status bar on the left will show `ECM hh:mm:ss` and idle indicator `(idle)`.
6) Click on the status bar to open statistics page, click "Finish Task" button to save record to history and open report.

## API Configuration

The extension supports integration with TaskHub API for project and task management.

### Settings

Go to **Settings** → **Extensions** → **ECM TimeTracker** to configure:

1. **API Endpoint** (`ecmTimeTracker.apiEndpoint`)
   - Default: `https://taskhub.loc`
   - Set your TaskHub API base URL (without `/api/v1`)

2. **API Key** (`ecmTimeTracker.apiKey`)
   - Your API key for authentication
   - Used with X-API-Key header (recommended method)

3. **Authentication Method** (`ecmTimeTracker.authMethod`)
   - `apiKey` (default) - Use API Key in X-API-Key header
   - `basic` - Use Basic Authentication with username:password

4. **Basic Auth Username** (`ecmTimeTracker.basicAuthUsername`)
   - Only required if using Basic Authentication

5. **Basic Auth Password** (`ecmTimeTracker.basicAuthPassword`)
   - Only required if using Basic Authentication

### Example Configuration

#### Using API Key (Recommended)
```json
{
  "ecmTimeTracker.apiEndpoint": "https://taskhub.loc",
  "ecmTimeTracker.apiKey": "your-api-key-here",
  "ecmTimeTracker.authMethod": "apiKey"
}
```

#### Using Basic Authentication
```json
{
  "ecmTimeTracker.apiEndpoint": "https://taskhub.loc",
  "ecmTimeTracker.authMethod": "basic",
  "ecmTimeTracker.basicAuthUsername": "your_username",
  "ecmTimeTracker.basicAuthPassword": "your_password"
}
```

### Features

- **Project Selection**: When finishing a task, you can select from API projects or enter manually
- **Task Selection**: After selecting a project, available tasks will be loaded automatically
- **Auto-fill**: Selected project and task names will be automatically filled in the form

## Files Structure

- `package.json` — extension metadata and commands
- `extension.js` — entry point: command registration and tracker creation
- `src/ApiClient.js` — API client for TaskHub integration
- `src/TimeStore.js` — time tracking and storage
- `src/StatusBar.js` — status bar UI
- `src/WebviewManager.js` — webview panels (stats, finish task, reports)
- `src/LocalizationManager.js` — i18n support (EN, RU, UK)
- `src/ActivityMonitor.js` — activity monitoring and idle detection

## Development

To extend tracking functionality, you can:
- Add OS-level activity events
- Implement task/project tags
- Add project filters
- Export reports in various formats
