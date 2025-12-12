const vscode = require('vscode');

class WebviewManager {
    constructor(context, timeStore, locManager) {
        this.context = context;
        this.store = timeStore;
        this.loc = locManager;
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

        this.statsPanel.webview.onDidReceiveMessage(async msg => {
            if (msg.command === 'finish_request') {
                this.showFinishTask();
            } else if (msg.command === 'filter_date') {
                // Update view with new date
                const stats = this.store.getStats(msg.date);
                this.statsPanel.webview.html = this._getStatsHtml(stats);
            } else if (msg.command === 'delete_task') {
                const choice = await vscode.window.showWarningMessage(this.loc.t('deleteTaskWarning'), this.loc.t('yes'), this.loc.t('no'));
                if (choice === this.loc.t('yes')) {
                    this.store.deleteTask(msg.id);
                    const stats = this.store.getStats(msg.date);
                    this.statsPanel.webview.html = this._getStatsHtml(stats);
                }
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
        this.finishPanel.webview.html = `<!DOCTYPE html><html><body style="font-family:sans-serif; padding:20px;"><h1>${this.loc.t('generatingReport')}</h1><p>${this.loc.t('analyzing')}</p></body></html>`;

        const html = await this._getFinishTaskHtmlResolver();
        if (this.finishPanel) {
            this.finishPanel.webview.html = html;
        }

        this.finishPanel.onDidDispose(() => {
            this.finishPanel = null;
        });

        this.finishPanel.webview.onDidReceiveMessage(msg => {
            if (msg.command === 'submit_finish') {
                const entry = this.store.finishTask(msg.title, msg.description, msg.project);
                vscode.window.showInformationMessage(`${this.loc.t('taskFinished')}: ${entry.title} (${this._formatTime(entry.activeSeconds)})`);
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
            this.loc.t('reportTitle'),
            vscode.ViewColumn.Active,
            { enableScripts: true }
        );
        panel.webview.html = this._getReportHtml(entry);

        panel.webview.onDidReceiveMessage(msg => {
            if (msg.command === 'view_stats') {
                panel.dispose();
                this.showStats();
            }
        });
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

        let globalTaskIndex = 0; // Use global counter for SAFE DOM IDs

        const generateProjectDetails = (projectTasks) => {
            return Object.entries(projectTasks).map(([projName, data]) => {
                const tasksHtml = data.tasks.map((t) => {
                    const uiId = `task-${globalTaskIndex++}`; // Safe simple ID
                    const startTimeStr = t.startTime ? t.startTime.toString() : '';

                    return `
                    <div class="task-item">
                        <div class="task-header" onclick="toggleTask('${uiId}')">
                            <div style="flex-grow:1; display:flex; align-items:center;">
                                <span class="arrow" id="arrow-${uiId}" style="margin-right:5px;">▶</span>
                                <span>${new Date(t.time).toLocaleTimeString()} - <strong>${t.title || this.loc.t('untitled')}</strong> (${this._formatTime(t.duration)})</span>
                            </div>
                            <button class="delete-btn" onclick="deleteTask(event, '${startTimeStr}')" title="${this.loc.t('deleteTaskTooltip')}">🗑️</button>
                        </div>
                        <div id="${uiId}" class="task-details" style="display:none;">
                            <pre>${t.description || this.loc.t('noDescription')}</pre>
                            ${t.files && t.files.length ? `<div class="sub-info">${this.loc.t('files')}: ${t.files.length}</div>` : ''}
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
                .history-scroll { max-height: 500px; overflow-y: auto; padding-right: 10px; }
                .history-scroll::-webkit-scrollbar { width: 8px; }
                .history-scroll::-webkit-scrollbar-track { background: transparent; }
                .history-scroll::-webkit-scrollbar-thumb { background: var(--vscode-scrollbarSlider-background); border-radius: 4px; }
                .history-scroll::-webkit-scrollbar-thumb:hover { background: var(--vscode-scrollbarSlider-hoverBackground); }
            </style>
        </head>
        <body>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h1>${this.loc.t('statsTitle')}</h1>
                <select id="dateSelect" onchange="filterDate()" style="padding:5px; background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border);">
                    <option value="">${this.loc.t('allTime')}</option>
                    ${dateOptions}
                </select>
            </div>

            <div class="grid">
                <div class="card">
                    <h3>${this.loc.t('totalActiveTime')} (${stats.selectedDate})</h3>
                    <div class="stat-value">${this._formatTime(stats.totalSeconds)}</div>
                </div>
            </div>

            <div class="grid">
                <div class="card chart-container">
                    <h3>${this.loc.t('activeLanguages')}</h3>
                    ${this._generatePieChart(stats.byLanguage)}
                </div>
                <div class="card chart-container">
                    <h3>${this.loc.t('activeProjects')}</h3>
                    ${this._generatePieChart(stats.byProject)}
                </div>
            </div>
            
            <div class="card">
                 <h2>${this.loc.t('historyTasks')}</h2>
                 <div class="stat-value" style="font-size:1em; margin-bottom:10px;">${this.loc.t('total')}: ${this._formatTime(stats.totalSeconds)}</div>
                 <div class="history-scroll">
                    ${generateProjectDetails(stats.projectTasks)}
                 </div>
            </div>

            <div class="card">
                <button onclick="requestFinish()">${this.loc.t('finishCurrentTask')}</button>
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

        // Project Input
        let formHtml = `<label style="display:block; margin-top:10px; font-size:0.9em; opacity:0.8;">${this.loc.t('projectLabel')}:</label>
        <input type="text" id="projectName" value="${current.project || ''}" style="width:100%; padding:8px; margin-bottom:10px; background:var(--vscode-input-background); color:var(--vscode-input-foreground); border:1px solid var(--vscode-input-border);">`;

        let summary = ``;
        if (current.activeSeconds > 0) {
            summary += `${this.loc.t('duration')}: ${this._formatTime(current.activeSeconds)}\n`;
        }

        // Helper to get relative path
        const getRel = (p) => {
            try { return vscode.workspace.asRelativePath(p); } catch (e) { return p; }
        };

        if (modifiedFiles.size > 0) {
            summary += `\n${this.loc.t('modifiedFiles')}:\n`;
            modifiedFiles.forEach(f => summary += `- ${getRel(f)}\n`);

            // Attempt to get diffs using FULL PATHS
            try {
                const diffs = await this._getGitDiffs(Array.from(modifiedFiles));
                if (diffs) {
                    summary += `\n${this.loc.t('codeChanges')}:\n${diffs}`;
                }
            } catch (e) { }
        }

        if (viewedFiles.size > 0) {
            summary += `\n${this.loc.t('viewedFiles')}:\n`;
            viewedFiles.forEach(f => summary += `- ${getRel(f)}\n`);
        }

        if (aiLogs.length > 0) {
            summary += `\n${this.loc.t('aiInteractions')}:\n`;
            aiLogs.forEach(l => summary += `- ${l.text}\n`);
        }

        summary += `\n${this.loc.t('finalDescription')}:\n- `;

        return `<!DOCTYPE html>
        <html>
        <head>
            <style>${this._getCss()}</style>
        </head>
        <body>
            <div class="card">
                <h1>${this.loc.t('finishTitle')}</h1>
                
                ${formHtml}

                <label style="display:block; margin-top:10px; font-size:0.9em; opacity:0.8;">${this.loc.t('taskLabel')}:</label>
                <input type="text" id="taskTitle" placeholder="${this.loc.t('taskTitlePlaceholder')}" style="width:100%; padding:8px; margin-bottom:10px; background:var(--vscode-input-background); color:var(--vscode-input-foreground); border:1px solid var(--vscode-input-border);">
                
                <p>${this.loc.t('reviewSummary')}</p>
                <textarea id="desc" rows="20">${summary}</textarea>
                <button onclick="submit()">${this.loc.t('generateButton')}</button>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                function submit() {
                    const titleInput = document.getElementById('taskTitle');
                    const descInput = document.getElementById('desc');
                    const projInput = document.getElementById('projectName');
                    vscode.postMessage({ 
                        command: 'submit_finish', 
                        title: titleInput.value, 
                        description: descInput.value,
                        project: projInput.value
                    });
                }
            </script>
        </body>
        </html>`;
    }

    _getReportHtml(entry) {
        // Calculate modified files for the report view as well
        const logs = entry.autoLogs || [];
        const modifiedFiles = new Set();
        logs.forEach(l => {
            if (l.action === 'Saved') modifiedFiles.add(l.detail);
        });

        // Helper to get relative path or shortened external path
        const getRel = (p) => {
            try {
                const rel = vscode.workspace.asRelativePath(p);
                // If asRelativePath returns the same full path (meaning it's external), shorten it manually
                if (rel === p) {
                    // Normalize separators
                    const parts = p.replace(/\\/g, '/').split('/');
                    // Return last 3 segments e.g. .../folder/sub/file.ext
                    if (parts.length > 3) {
                        return '.../' + parts.slice(-3).join('/');
                    }
                    return p;
                }
                return rel;
            } catch (e) { return p; }
        };

        let filesHtml = this.loc.t('noFileTracked');
        if (modifiedFiles.size > 0) {
            filesHtml = '<ul>';
            modifiedFiles.forEach(f => {
                filesHtml += `<li>${getRel(f)}</li>`;
            });
            filesHtml += '</ul>';
        } else if (entry.file) {
            // Fallback to last touched if no saves recorded (e.g. read only)
            filesHtml = getRel(entry.file);
        }

        return `<!DOCTYPE html>
        <html>
        <head>
            <style>${this._getCss()}</style>
        </head>
        <body>
            <div class="card">
                <h1>${this.loc.t('reportTitle')}</h1>
                <h3>${this.loc.t('summarySection')}</h3>
                <p><strong>${this.loc.t('taskLabel')}:</strong> ${entry.title || this.loc.t('untitled')}</p>
                <p><strong>${this.loc.t('projectLabel')}:</strong> ${entry.project || 'N/A'}</p>
                <p><strong>${this.loc.t('dateLabel')}:</strong> ${new Date(entry.end).toLocaleString()}</p>
                <p><strong>${this.loc.t('durationLabel')}:</strong> ${this._formatTime(entry.activeSeconds)}</p>

                <h3>${this.loc.t('descriptionSection')}</h3>
                <p style="white-space: pre-wrap;">${entry.description || this.loc.t('noDescProvided')}</p>
                
                <h3>${this.loc.t('filesTouchedSection')} (Modified)</h3>
                ${filesHtml}

                <div style="margin-top: 20px;">
                    <button onclick="viewStats()">${this.loc.t('viewStats')}</button>
                </div>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                function viewStats() {
                    vscode.postMessage({ command: 'view_stats' });
                }
            </script>
        </body>
        </html>`;
    }
}

module.exports = WebviewManager;
