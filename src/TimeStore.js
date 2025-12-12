const vscode = require('vscode');

class TimeStore {
    constructor(context) {
        this.context = context;
        this.currentKey = 'ecm_timetracker.current';
        this.historyKey = 'ecm_timetracker.history';

        this.current = this._loadCurrent();
    }

    _loadCurrent() {
        const stored = this.context.globalState.get(this.currentKey);
        if (stored) {
            return stored;
        }
        return this._createNewSession();
    }

    _createNewSession() {
        return {
            start: Date.now(),
            activeSeconds: 0,
            lastActivity: Date.now(),
            file: null,
            language: null,
            project: this._getCurrentProjectName(),
            idle: false,
            touchedFiles: [], // Array of strings to store unique file paths
            touchedFiles: [], // Array of strings to store unique file paths
            aiLogs: [], // Manual logs/AI context
            autoLogs: [], // Automatic actions
            paused: false,
            userSeconds: 0,
            aiSeconds: 0
        };
    }

    _getCurrentProjectName() {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            return vscode.workspace.workspaceFolders[0].name;
        }
        return 'No Workspace';
    }

    addActiveTime(seconds) {
        if (this.current.paused) return; // Don't add time if paused

        this.current.activeSeconds += seconds;
        // Legacy support if needed, or just stop using userSeconds/aiSeconds logic
        // We'll just track total activeSeconds as the source of truth now.

        this.saveCurrent();
    }

    togglePause() {
        this.current.paused = !this.current.paused;

        // If we are starting (unpausing) a fresh session (0 time), reset the start timestamp
        // so the session time matches when work actually began.
        if (!this.current.paused && this.current.activeSeconds === 0) {
            this.current.start = Date.now();
        }

        this.saveCurrent();
        return this.current.paused;
    }

    setPaused(state) {
        this.current.paused = state;
        this.saveCurrent();
    }

    resetCurrentTime() {
        this.current.activeSeconds = 0;
        this.current.start = Date.now();
        this.saveCurrent();
    }

    isPaused() {
        return !!this.current.paused;
    }

    addLogEntry(text) {
        if (!this.current.aiLogs) this.current.aiLogs = [];
        this.current.aiLogs.push({ time: Date.now(), text });
        this.saveCurrent();
    }

    logAutoAction(action, detail) {
        if (!this.current.autoLogs) this.current.autoLogs = [];
        // simple dedup: don't repeat same action on same file within 5 seconds
        const last = this.current.autoLogs[this.current.autoLogs.length - 1];
        if (last && last.action === action && last.detail === detail && (Date.now() - last.time < 5000)) {
            return;
        }

        this.current.autoLogs.push({ time: Date.now(), action, detail });
        this.saveCurrent();
    }

    registerUserActivity(file, language) {
        this.current.lastActivity = Date.now();
        if (file) {
            this.current.file = file;
            this.current.language = language || 'Plain Text';

            // Add to touched files if new
            const currentFiles = this.current.touchedFiles || [];
            if (!currentFiles.includes(file)) {
                // Limit to avoid huge usage memory
                if (currentFiles.length < 50) {
                    currentFiles.push(file);
                    this.current.touchedFiles = currentFiles;
                }
            }

            const ws = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(file));
            this.current.project = ws ? ws.name : this.current.project;
        }
        this.saveCurrent();
    }

    setIdle(isIdle) {
        this.current.idle = isIdle;
        this.current.lastActivity = Date.now(); // reset timer reference on state change
        this.saveCurrent();
    }

    saveCurrent() {
        this.context.globalState.update(this.currentKey, this.current);
    }

    finishTask(taskTitle = '', taskDescription = '', projectName = null) {
        const history = this.getHistory();
        const entry = {
            ...this.current,
            end: Date.now(),
            title: taskTitle || 'Untitled Task',
            description: taskDescription,
            project: projectName || this.current.project // Allow override
        };
        history.push(entry);
        this.context.globalState.update(this.historyKey, history);

        // Reset current
        this.current = this._createNewSession();
        this.current.paused = true; // Start new session in PAUSED state
        this.saveCurrent();
        return entry;
    }

    deleteTask(startTime) {
        let history = this.getHistory();
        // timestamp from webview might be a string, convert to number just in case
        const time = Number(startTime);
        history = history.filter(h => h.start !== time);
        this.context.globalState.update(this.historyKey, history);
    }

    getHistory() {
        return this.context.globalState.get(this.historyKey) || [];
    }

    getAvailableDates() {
        const history = this.getHistory();
        const dates = new Set();
        // Add "Today" implicit
        dates.add(new Date().toDateString());

        history.forEach(h => {
            if (h.end) {
                dates.add(new Date(h.end).toDateString());
            } else if (h.start) {
                dates.add(new Date(h.start).toDateString());
            }
        });
        return Array.from(dates).sort((a, b) => new Date(b) - new Date(a));
    }

    getStats(dateFilterString = null) {
        let history = this.getHistory();

        // If "Today" or null, we MUST include current session in the stats
        const currentIncluded = !dateFilterString || dateFilterString === new Date().toDateString();

        let allSessions = [...history];
        if (currentIncluded) {
            // Only include current session if it has active time or activity
            // This prevents empty "ghost" tasks from appearing immediately after finishing a task
            if (this.current.activeSeconds > 0) {
                allSessions.push({ ...this.current, end: Date.now() });
            }
        }

        // Filter by date
        if (dateFilterString) {
            allSessions = allSessions.filter(s => {
                // Check start or end time
                const d = new Date(s.end || s.start).toDateString();
                return d === dateFilterString;
            });
        }

        const byLanguage = {};
        const byProject = {};
        // Hierarchy: Project -> [Tasks]
        const projectTasks = {};

        allSessions.forEach(session => {
            const lang = session.language || 'Unknown';
            const proj = session.project || 'No Workspace';
            const sec = session.activeSeconds || 0;

            byLanguage[lang] = (byLanguage[lang] || 0) + sec;
            byProject[proj] = (byProject[proj] || 0) + sec;

            // Collect tasks for hierarchy
            if (!projectTasks[proj]) projectTasks[proj] = { total: 0, tasks: [] };
            projectTasks[proj].total += sec;

            // Only add distinct tasks/sessions to list
            projectTasks[proj].tasks.push({
                description: session.description,
                duration: sec,
                time: session.end || session.start,
                startTime: session.start,
                title: session.title,
                files: session.touchedFiles,
                logs: session.aiLogs,
                autoLogs: session.autoLogs
            });
        });

        return {
            byLanguage,
            byProject,
            projectTasks,
            totalSeconds: allSessions.reduce((acc, s) => acc + (s.activeSeconds || 0), 0),
            history: history, // raw history if needed
            selectedDate: dateFilterString || new Date().toDateString()
        };
    }

    getCurrentSession() {
        return this.current;
    }
}

module.exports = TimeStore;
