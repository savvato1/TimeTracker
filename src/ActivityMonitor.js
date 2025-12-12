const vscode = require('vscode');

class ActivityMonitor {
    constructor(timeStore, statusBar, config = {}) {
        this.store = timeStore;
        this.statusBar = statusBar;
        this.idleThreshold = config.idleThreshold || 60;
        this.checkIntervalMs = 1000;
        this.pendingSeconds = 0; // Track how much we speculatively added

        this.lastUserActionTime = Date.now(); // Initialize immediately
        this.disposables = [];
        this._setupListeners();
        this._startTicker();

        // Initial update
        this._updateUI();
    }

    // startTracking removed as it was redundant/unused

    _setupListeners() {
        // User Actions (Definitely User)
        this.disposables.push(vscode.window.onDidChangeTextEditorSelection(e => this._onUserAction(e)));
        this.disposables.push(vscode.window.onDidChangeActiveTextEditor(e => this._onUserAction(e)));
        this.disposables.push(vscode.window.onDidChangeWindowState(e => {
            if (e.focused) this._onUserAction();
        }));
        this.disposables.push(vscode.workspace.onDidSaveTextDocument(doc => {
            // Filter out system files and settings
            const fsPath = doc.uri.fsPath;
            if (fsPath.endsWith('settings.json') || fsPath.endsWith('keybindings.json')) return;
            if (fsPath.includes('extension-output')) return;

            this.store.logAutoAction('Saved', fsPath);
        }));

        this.disposables.push(vscode.workspace.onDidChangeTextDocument(e => {
            if (e.contentChanges.length > 0) {
                // Content change
            }
        }));
    }

    _onUserAction(e) {
        // STRICT FILTERING
        // If it's a selection change event (has 'kind' property), we ONLY accept Keyboard or Mouse.
        if (e && typeof e.kind === 'number') {
            if (e.kind !== vscode.TextEditorSelectionChangeKind.Keyboard &&
                e.kind !== vscode.TextEditorSelectionChangeKind.Mouse) {
                return; // Ignore Command or System updates
            }
        }

        this.lastUserActionTime = Date.now();
        // Register activity
        let doc = null;
        if (e) {
            if (e.document) doc = e.document; // On change active editor, or passed manually
            else if (e.textEditor) doc = e.textEditor.document; // On selection
        }

        if (doc) {
            this.store.registerUserActivity(doc.uri.fsPath, doc.languageId);
        }
    }

    _onContentChange() {
        // No-op or remove completely
    }

    _startTicker() {
        this.interval = setInterval(() => {
            if (this.store.isPaused()) {
                this.statusBar.update(this.store.getCurrentSession().activeSeconds, false, true);
                return;
            }

            const now = Date.now();
            const timeSinceUser = (now - this.lastUserActionTime) / 1000;

            // Simple logic: If user interaction was recent, they are active.
            // "AI Time" vs "User Time" distinction is removed per user request.
            if (timeSinceUser < this.idleThreshold) {
                this.store.setIdle(false);
                this.store.addActiveTime(1); // Just add total active time
            } else {
                this.store.setIdle(true);
            }
            this._updateUI();
        }, 1000);
    }

    _updateUI() {
        const current = this.store.getCurrentSession();
        // Pass paused state to status bar for icon change
        this.statusBar.update(current.activeSeconds, current.idle, current.paused);
    }

    dispose() {
        clearInterval(this.interval);
        this.disposables.forEach(d => d.dispose());
    }
}

module.exports = ActivityMonitor;
