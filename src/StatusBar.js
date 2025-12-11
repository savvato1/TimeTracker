const vscode = require('vscode');

class StatusBar {
    constructor() {
        // Main timer (clickable to open stats)
        this.timerItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.timerItem.command = 'ecm_timetracker.showStats';
        this.timerItem.show();

        // Control buttons
        this.stopItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99.5);
        this.stopItem.command = 'ecm_timetracker.stopAndFinish';
        this.stopItem.text = '$(debug-stop)';
        this.stopItem.tooltip = 'Stop & Finish Task';
        this.stopItem.show();

        this.pauseItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
        this.pauseItem.command = 'ecm_timetracker.togglePause';
        this.pauseItem.text = '$(debug-pause)';
        this.pauseItem.tooltip = 'Pause Timer';
        this.pauseItem.show();

        this.restartItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
        this.restartItem.command = 'ecm_timetracker.resetTimer';
        this.restartItem.text = '$(debug-restart)';
        this.restartItem.tooltip = 'Reset Timer';
        this.restartItem.show();

        // Explicit stats button
        this.statsItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 97);
        this.statsItem.command = 'ecm_timetracker.showStats';
        this.statsItem.text = '$(graph)';
        this.statsItem.tooltip = 'View Statistics';
        this.statsItem.show();

        this.paused = false;
    }

    update(activeSeconds, isIdle, isPaused = false) {
        this.paused = isPaused;
        const timeStr = this._formatTime(activeSeconds);

        let icon = '$(flame)';
        let color = undefined; // Default

        if (isPaused) {
            icon = '$(debug-pause)';
            color = new vscode.ThemeColor('descriptionForeground'); // Grey out
            this.pauseItem.text = '$(debug-start)'; // Show play button to resume
            this.pauseItem.tooltip = 'Resume Timer';
        } else if (isIdle) {
            icon = '$(circle-outline)';
            color = new vscode.ThemeColor('descriptionForeground');
            this.pauseItem.text = '$(debug-pause)';
            this.pauseItem.tooltip = 'Pause Timer';
        } else {
            this.pauseItem.text = '$(debug-pause)';
            this.pauseItem.tooltip = 'Pause Timer';
        }

        this.timerItem.text = `${icon} ${timeStr}`;
        this.timerItem.color = color;
    }

    _formatTime(sec) {
        sec = Math.max(0, sec);
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        const pad = (n) => n.toString().padStart(2, '0');
        return `${pad(h)}:${pad(m)}:${pad(s)} `;
    }

    dispose() {
        this.timerItem.dispose();
        this.stopItem.dispose();
        this.pauseItem.dispose();
        this.restartItem.dispose();
        this.statsItem.dispose();
    }
}

module.exports = StatusBar;
