const vscode = require('vscode');

class ActivityMonitor {
    constructor(timeStore, statusBar, config = {}) {
        this.store = timeStore;
        this.statusBar = statusBar;
        this.idleThreshold = config.idleThreshold || 60;
        this.checkIntervalMs = 1000;
        this.pendingSeconds = 0; // Track how much we speculatively added

        this.disposables = [];
        this._setupListeners();
        this._startTicker();

        // Initial update
        this._updateUI();
    }

    _setupListeners() {
        // Generic activity handler for timer purposes
        const onEvent = (e) => {
            let doc = null;
            if (e && e.document) doc = e.document;
            else if (vscode.window.activeTextEditor) doc = vscode.window.activeTextEditor.document;
            this._onUserActivity(doc);
        };

        // Specific actions for logging context (saves and focus shifts)
        this.disposables.push(vscode.workspace.onDidSaveTextDocument(doc => {
            // Log full path for diffing, UI will handle basename display
            this.store.logAutoAction('Saved', doc.uri.fsPath);
            this._onUserActivity(doc);
        }));

        this.disposables.push(vscode.window.onDidChangeActiveTextEditor(e => {
            if (e && e.document) {
                this.store.logAutoAction('Focused', e.document.uri.fsPath);
                onEvent(e);
            }
        }));

        this.disposables.push(vscode.workspace.onDidChangeTextDocument(e => onEvent(e)));
        this.disposables.push(vscode.window.onDidChangeTextEditorSelection(e => onEvent(e)));

        // Window focus tracking
        this.disposables.push(vscode.window.onDidChangeWindowState(e => {
            if (e.focused) {
                this._onUserActivity();
            }
        }));
    }

    _getBasename(p) {
        try { const parts = p.replace(/\\/g, '/').split('/'); return parts[parts.length - 1]; } catch (e) { return p; }
    }

    _onUserActivity(doc) {
        const current = this.store.getCurrentSession();
        // If we were idle, we are back
        if (current.idle) {
            this.store.setIdle(false);
        }

        // Activity confirmed, so the pending time is now valid/committed
        // Reset pending counter for the new idle-window
        this.pendingSeconds = 0;

        // Update file info if available
        let filePath = current.file;
        let language = current.language;

        if (doc) {
            filePath = doc.uri.fsPath;
            language = doc.languageId;
        }

        this.store.registerUserActivity(filePath, language);
        this._updateUI();
    }

    _startTicker() {
        this.interval = setInterval(() => {
            const current = this.store.getCurrentSession();

            // If already idle, nothing to add
            if (current.idle) {
                this._updateUI();
                return;
            }

            const now = Date.now();
            const lastAct = current.lastActivity;
            const delta = Math.floor((now - lastAct) / 1000);

            if (delta >= this.idleThreshold) {
                // User has been inactive for too long.
                // Mark as idle.
                this.store.setIdle(true);

                // Rollback strictly what we added during this specific idle wait period
                // This prevents "negative time" bugs if the interval lagged
                if (this.pendingSeconds > 0) {
                    this.store.addActiveTime(-this.pendingSeconds);
                    this.pendingSeconds = 0;
                }
            } else {
                // User is considered active within the threshold window.
                // Speculatively add time.
                this.store.addActiveTime(1);
                this.pendingSeconds += 1;
            }
            this._updateUI();
        }, this.checkIntervalMs);
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
