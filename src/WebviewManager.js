const vscode = require('vscode');

class WebviewManager {
    constructor(context, timeStore) {
        this.context = context;
        this.store = timeStore;
        this.statsPanel = null;
        this.finishPanel = null;
    }

    showStats() {
        if (this.statsPanel) {
            this.statsPanel.reveal();
            return;
        }

        this.statsPanel = vscode.window.createWebviewPanel(
            'ecm_timetracker.stats',
            'ECM Statistics',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        this.updateStatsHtml();

        // Update stats periodically if open? 
        // For now, let's just update on focus or data change if we hooked it up, 
        // but simpler is just static until refreshed or re-opened.
        // Actually, let's make it refreshable or at least load once.

        this.statsPanel.onDidDispose(() => {
            this.statsPanel = null;
        });

        this.statsPanel.webview.onDidReceiveMessage(msg => {
            if (msg.command === 'finish_request') {
                this.showFinishTask();
            } else if (msg.command === 'filter_date') {
                // Update view with new date
                const stats = this.store.getStats(msg.date);
                this.statsPanel.webview.html = this._getStatsHtml(stats);
            }
        });
    }

    updateStatsHtml() {
        if (!this.statsPanel) return;
        const stats = this.store.getStats();
        this.statsPanel.webview.html = this._getStatsHtml(stats);
    }

    async showFinishTask() {
        if (this.finishPanel) {
            this.finishPanel.reveal();
            return;
        }

        this.finishPanel = vscode.window.createWebviewPanel(
            'ecm_timetracker.finish',
            'ECM Finish Task',
            vscode.ViewColumn.Two,
            { enableScripts: true }
        );

        // Show loading state first
        this.finishPanel.webview.html = `<!DOCTYPE html><html><body style="font-family:sans-serif; padding:20px;"><h1>Generating Report...</h1><p>Analyzing file changes...</p></body></html>`;

        const html = await this._getFinishTaskHtmlResolver();
        if (this.finishPanel) {
            this.finishPanel.webview.html = html;
        }

        this.finishPanel.onDidDispose(() => {
            this.finishPanel = null;
        });

        this.finishPanel.webview.onDidReceiveMessage(msg => {
            if (msg.command === 'submit_finish') {
                const entry = this.store.finishTask(msg.title, msg.description);
                vscode.window.showInformationMessage(`Task finished: ${entry.title} (${this._formatTime(entry.activeSeconds)})`);
                this.finishPanel.dispose();
                this.showReport(entry);
                // Also update stats if open
                if (this.statsPanel) {
                    this.updateStatsHtml();
                }
            }
        });
    }

    showReport(entry) {
        // Re-use finish panel or create new? User requirement: "При нажатии на нее, должна открытся страница с описанием что было сделано по задаче и затраченное время на выполнение"
        // Logic: Button -> Input Description -> Submit -> Show Report.
        // Let's create a report panel.
        const panel = vscode.window.createWebviewPanel(
            'ecm_timetracker.report',
            'ECM Task Report',
            vscode.ViewColumn.Active,
            {}
        );
        panel.webview.html = this._getReportHtml(entry);
    }

    _formatTime(sec) {
        if (!sec) return '0s';
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        return `${h}h ${m}m ${s}s`;
    }

    _getCss() {
        return `
            :root {
                --primary: var(--vscode-button-background);
                --text: var(--vscode-foreground);
                --bg: var(--vscode-editor-background);
                --card-bg: var(--vscode-editorWidget-background);
            }
            body { font-family: var(--vscode-font-family); padding: 20px; color: var(--text); background: var(--bg); }
            .card { background: var(--card-bg); padding: 15px; border-radius: 6px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
            h1, h2, h3 { margin-top: 0; }
            button {
                background: var(--primary); color: var(--vscode-button-foreground); border: none; padding: 8px 16px; cursor: pointer; border-radius: 2px; font-size: 14px;
            }
            button:hover { opacity: 0.9; }
            table { width: 100%; border-collapse: collapse; }
            th, td { text-align: left; padding: 8px; border-bottom: 1px solid var(--vscode-widget-border); }
            .bar-container { background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; height: 8px; width: 100%; }
            .bar-fill { height: 100%; background: var(--primary); }
            textarea { width: 100%; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); padding: 8px; font-family: inherit; margin-bottom: 10px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .stat-value { font-size: 24px; font-weight: bold; color: var(--primary); }
        `;
    }

    _generatePieChart(data, size = 150) {
        const total = Object.values(data).reduce((a, b) => a + b, 0);
        if (total === 0) return '';

        // Handle single item case perfectly
        if (Object.keys(data).length === 1) {
            const color = '#4ec9b0';
            const key = Object.keys(data)[0];
            return `<svg width="${size}" height="${size}" viewBox="-1 -1 2 2" style="transform: rotate(-90deg); border-radius: 50%;">
                <circle cx="0" cy="0" r="1" fill="${color}" title="${key} (100%)"></circle>
            </svg>
            <div style="display:flex; flex-wrap:wrap; margin-top:10px; justify-content:center;">
                <div style="display:flex; align-items:center; margin-right:10px; font-size:12px;">
                    <span style="width:10px; height:10px; background:${color}; display:inline-block; margin-right:5px;"></span>
                    ${key}
                </div>
            </div>`;
        }

        let cumulativePercent = 0;
        const colors = ['#4ec9b0', '#ce9178', '#9cdcfe', '#dcdcaa', '#c586c0'];

        const slices = Object.entries(data).map(([key, value], idx) => {
            const percent = value / total;
            const headers = this._getCoordinatesForPercent(cumulativePercent);
            const startX = headers[0];
            const startY = headers[1];

            cumulativePercent += percent;

            const tails = this._getCoordinatesForPercent(cumulativePercent);
            const endX = tails[0];
            const endY = tails[1];

            const largeArcFlag = percent > 0.5 ? 1 : 0;
            const pathData = [
                `M ${startX} ${startY}`, // Start at circumference
                `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`, // Arc to end
                `L 0 0`, // Line to center
            ].join(' ');

            return `<path d="${pathData}" fill="${colors[idx % colors.length]}" title="${key} (${Math.round(percent * 100)}%)"></path>`;
        }).join('');

        return `<svg viewBox="-1 -1 2 2" style="transform: rotate(-90deg); width: ${size}px; height: ${size}px; border-radius: 50%;">
            ${slices}
        </svg>
        <div style="display:flex; flex-wrap:wrap; margin-top:10px; justify-content:center;">
             ${Object.entries(data).map(([key, val], idx) => `
                <div style="display:flex; align-items:center; margin-right:10px; font-size:12px;">
                    <span style="width:10px; height:10px; background:${colors[idx % colors.length]}; display:inline-block; margin-right:5px;"></span>
                    ${key}
                </div>
             `).join('')}
        </div>`;
    }

    _getCoordinatesForPercent(percent) {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    }

    // Helper to get simple diff
    async _getGitDiffs(files) {
        const cp = require('child_process');
        let diffText = '';

        for (const file of files) {
            try {
                // Try to get diff of the file. 
                // We use 'git diff HEAD -- file' to see unstaged changes + 'git diff --cached -- file' ?
                // Simply 'git diff' works for unstaged.
                const cmd = `git diff "${file}"`;
                const cwd = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(file))?.uri.fsPath;

                if (cwd) {
                    const diff = await new Promise((resolve) => {
                        cp.exec(cmd, { cwd, maxBuffer: 1024 * 1024 }, (err, stdout) => {
                            if (err) resolve('');
                            else resolve(stdout);
                        });
                    });

                    if (diff && diff.trim().length > 0) {
                        const simpleDiff = diff.split('\n')
                            .filter(line => line.startsWith('+') || line.startsWith('-'))
                            .filter(line => !line.startsWith('---') && !line.startsWith('+++'))
                            .slice(0, 20) // Limit lines
                            .join('\n');

                        diffText += `\nChanges in ${file.replace(/\\/g, '/').split('/').pop()}:\n${simpleDiff}\n`;
                    }
                }
            } catch (e) {
                // Ignore git errors
            }
        }
        return diffText;
    }

    _getStatsHtml(stats) {
        // Get all available dates for dropdown
        const dates = this.store.getAvailableDates();
        const dateOptions = dates.map(d =>
            `<option value="${d}" ${d === stats.selectedDate ? 'selected' : ''}>${d}</option>`
        ).join('');

        const generateRows = (obj) => {
            return Object.entries(obj).map(([key, val]) => {
                const pct = stats.totalSeconds > 0 ? (val / stats.totalSeconds * 100).toFixed(1) : 0;
                return `
                    <tr>
                        <td>${key}</td>
                        <td>${this._formatTime(val)}</td>
                        <td width="40%">
                            <div class="bar-container"><div class="bar-fill" style="width: ${pct}%"></div></div>
                        </td>
                    </tr>`;
            }).join('');
        };

        const generateProjectDetails = (projectTasks) => {
            return Object.entries(projectTasks).map(([projName, data]) => {
                const tasksHtml = data.tasks.map((t, idx) => {
                    return `
                    <div class="task-item">
                        <div class="task-header" onclick="toggleTask('t-${projName}-${idx}')">
                            <div style="flex-grow:1; display:flex; align-items:center;">
                                <span class="arrow" id="arrow-t-${projName}-${idx}" style="margin-right:5px;">▶</span>
                                <span>${new Date(t.time).toLocaleTimeString()} - <strong>${t.title || 'Untitled'}</strong> (${this._formatTime(t.duration)})</span>
                            </div>
                            <button class="delete-btn" onclick="deleteTask(event, '${t.startTime}')" title="Delete Task">🗑️</button>
                        </div>
                        <div id="t-${projName}-${idx}" class="task-details" style="display:none;">
                            <pre>${t.description || 'No description'}</pre>
                            ${t.files && t.files.length ? `<div class="sub-info">Files: ${t.files.length}</div>` : ''}
                        </div>
                    </div>`;
                }).join('');

                return `
                <div class="project-block">
                    <h3>${projName} (${this._formatTime(data.total)})</h3>
                    <div class="tasks-container">
                        ${tasksHtml}
                    </div>
                </div>`;
            }).join('');
        };

        return `<!DOCTYPE html>
        <html>
        <head>
            <style>
                ${this._getCss()}
                .project-block { margin-top: 15px; border: 1px solid var(--vscode-widget-border); border-radius: 4px; padding: 10px; }
                .task-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; padding: 5px; background: rgba(255,255,255,0.05); margin-bottom: 2px; border-radius: 3px; }
                .task-header:hover { background: rgba(255,255,255,0.1); }
                .task-details { padding: 10px; background: rgba(0,0,0,0.1); white-space: pre-wrap; font-size: 0.9em; }
                .sub-info { opacity: 0.7; font-size: 0.85em; margin-top: 5px; }
                .chart-container { display: flex; flex-direction: column; align-items: center; padding: 20px; }
                .delete-btn { background: transparent; border: none; cursor: pointer; opacity: 0.5; padding: 2px 5px; font-size: 1.2em; }
                .delete-btn:hover { opacity: 1; transform: scale(1.1); }
                .arrow { display: inline-block; font-size: 0.8em; transition: transform 0.2s; }
            </style>
        </head>
        <body>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h1>ECM Statistics</h1>
                <select id="dateSelect" onchange="filterDate()" style="padding:5px; background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border);">
                    <option value="">All Time</option>
                    ${dateOptions}
                </select>
            </div>

            <div class="grid">
                <div class="card">
                    <h3>Total Active Time (${stats.selectedDate})</h3>
                    <div class="stat-value">${this._formatTime(stats.totalSeconds)}</div>
                </div>
            </div>

            <div class="grid">
                <div class="card chart-container">
                    <h3>Active Languages</h3>
                    ${this._generatePieChart(stats.byLanguage)}
                </div>
                <div class="card chart-container">
                    <h3>Active Projects</h3>
                    ${this._generatePieChart(stats.byProject)}
                </div>
            </div>
            
            <div class="card">
                 <h2>History & Tasks</h2>
                 <div class="stat-value" style="font-size:1em; margin-bottom:10px;">Total: ${this._formatTime(stats.totalSeconds)}</div>
                 ${generateProjectDetails(stats.projectTasks)}
            </div>

            <div class="card">
                <button onclick="requestFinish()">Finish Current Task</button>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                function requestFinish() { vscode.postMessage({ command: 'finish_request' }); }
                function filterDate() { vscode.postMessage({ command: 'filter_date', date: document.getElementById('dateSelect').value }); }
                function deleteTask(e, id) {
                    e.stopPropagation();
                    const date = document.getElementById('dateSelect').value;
                    vscode.postMessage({ command: 'delete_task', id: id, date: date });
                }
                function toggleTask(id) {
                    const el = document.getElementById(id);
                    const arrow = document.getElementById('arrow-' + id);
                    if (el.style.display === 'none') {
                        el.style.display = 'block';
                        if(arrow) arrow.style.transform = 'rotate(90deg)';
                    } else {
                        el.style.display = 'none';
                        if(arrow) arrow.style.transform = 'rotate(0deg)';
                    }
                }
            </script>
        </body>
        </html>`;
    }

    async _getFinishTaskHtmlResolver() {
        const current = this.store.getCurrentSession();
        // Logs now contain FULL PATHS
        const logs = current.autoLogs || [];
        const modifiedFiles = new Set(); // Stores FULL PATHS
        const viewedFiles = new Set(); // Stores FULL PATHS

        logs.forEach(l => {
            if (l.action === 'Saved') {
                modifiedFiles.add(l.detail);
                viewedFiles.delete(l.detail);
            } else if (l.action === 'Focused') {
                if (!modifiedFiles.has(l.detail)) viewedFiles.add(l.detail);
            }
        });

        // Manual AI logs
        const aiLogs = current.aiLogs || [];

        let summary = `Project: ${current.project}\n`;
        if (current.activeSeconds > 0) {
            summary += `Duration: ${this._formatTime(current.activeSeconds)}\n`;
        }

        // Helper to get basename
        const getBase = (p) => {
            try { return p.replace(/\\/g, '/').split('/').pop(); } catch (e) { return p; }
        };

        if (modifiedFiles.size > 0) {
            summary += `\nModified Files:\n`;
            modifiedFiles.forEach(f => summary += `- ${getBase(f)}\n`);

            // Attempt to get diffs using FULL PATHS
            try {
                const diffs = await this._getGitDiffs(Array.from(modifiedFiles));
                if (diffs) {
                    summary += `\nCode Changes Summary:\n${diffs}`;
                }
            } catch (e) { }
        }

        if (viewedFiles.size > 0) {
            summary += `\nViewed Files:\n`;
            viewedFiles.forEach(f => summary += `- ${getBase(f)}\n`);
        }

        if (aiLogs.length > 0) {
            summary += `\nAI Interactions:\n`;
            aiLogs.forEach(l => summary += `- ${l.text}\n`);
        }

        summary += `\nFinal Description:\n- `;

        return `<!DOCTYPE html>
        <html>
        <head>
            <style>${this._getCss()}</style>
        </head>
        <body>
            <div class="card">
                <h1>Finish Task</h1>
                <input type="text" id="taskTitle" placeholder="Task Title (e.g. Refactor Login)" style="width:100%; padding:8px; margin-bottom:10px; background:var(--vscode-input-background); color:var(--vscode-input-foreground); border:1px solid var(--vscode-input-border);">
                <p>Review the generated summary (Diffs included if available):</p>
                <textarea id="desc" rows="20">${summary}</textarea>
                <button onclick="submit()">Generate Report & Finish</button>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                function submit() {
                    const titleInput = document.getElementById('taskTitle');
                    const descInput = document.getElementById('desc');
                    vscode.postMessage({ 
                        command: 'submit_finish', 
                        title: titleInput.value, 
                        description: descInput.value 
                    });
                }
            </script>
        </body>
        </html>`;
    }

    _getReportHtml(entry) {
        return `<!DOCTYPE html>
        <html>
        <head>
            <style>${this._getCss()}</style>
        </head>
        <body>
            <div class="card">
                <h1>Task Activity Report</h1>
                <h3>Summary</h3>
                <p><strong>Date:</strong> ${new Date(entry.end).toLocaleString()}</p>
                <p><strong>Duration:</strong> ${this._formatTime(entry.activeSeconds)}</p>
                <p><strong>Project:</strong> ${entry.project || 'N/A'}</p>
                
                <h3>Description</h3>
                <p style="white-space: pre-wrap;">${entry.description || 'No description provided.'}</p>
                
                <h3>Files Touched</h3>
                <p>${entry.file ? entry.file : 'No specific file tracked as primary.'}</p>
            </div>
        </body>
        </html>`;
    }
}

module.exports = WebviewManager;
