const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

class Logger {
    constructor(context) {
        this.context = context;
        this.logFile = path.join(context.globalStorageUri.fsPath, 'timetracker.log');

        // Ensure log directory exists
        this._ensureLogDirectory();
    }

    _ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    _isLoggingEnabled() {
        const config = vscode.workspace.getConfiguration('ecmTimeTracker');
        return config.get('enableLogging', false);
    }

    _formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const argsStr = args.length > 0 ? ' ' + args.map(a =>
            typeof a === 'object' ? JSON.stringify(a) : String(a)
        ).join(' ') : '';
        return `[${timestamp}] [${level}] ${message}${argsStr}\n`;
    }

    _writeToFile(message) {
        try {
            fs.appendFileSync(this.logFile, message, 'utf8');
        } catch (error) {
            // Fallback to console if file write fails
            console.error('Failed to write to log file:', error);
        }
    }

    log(message, ...args) {
        if (!this._isLoggingEnabled()) return;
        const formatted = this._formatMessage('INFO', message, ...args);
        this._writeToFile(formatted);
    }

    info(message, ...args) {
        if (!this._isLoggingEnabled()) return;
        const formatted = this._formatMessage('INFO', message, ...args);
        this._writeToFile(formatted);
    }

    warn(message, ...args) {
        if (!this._isLoggingEnabled()) return;
        const formatted = this._formatMessage('WARN', message, ...args);
        this._writeToFile(formatted);
    }

    error(message, ...args) {
        if (!this._isLoggingEnabled()) return;
        const formatted = this._formatMessage('ERROR', message, ...args);
        this._writeToFile(formatted);
    }

    debug(message, ...args) {
        if (!this._isLoggingEnabled()) return;
        const formatted = this._formatMessage('DEBUG', message, ...args);
        this._writeToFile(formatted);
    }

    clear() {
        try {
            if (fs.existsSync(this.logFile)) {
                fs.writeFileSync(this.logFile, '', 'utf8');
                this.log('Log file cleared');
            }
        } catch (error) {
            console.error('Failed to clear log file:', error);
        }
    }

    getLogFilePath() {
        return this.logFile;
    }

    openLogFile() {
        if (fs.existsSync(this.logFile)) {
            vscode.workspace.openTextDocument(this.logFile).then(doc => {
                vscode.window.showTextDocument(doc);
            });
        } else {
            vscode.window.showInformationMessage('Log file does not exist yet. Enable logging and perform some actions first.');
        }
    }

    getLogSize() {
        try {
            if (fs.existsSync(this.logFile)) {
                const stats = fs.statSync(this.logFile);
                return stats.size;
            }
        } catch (error) {
            return 0;
        }
        return 0;
    }

    getLastLines(count = 100) {
        try {
            if (fs.existsSync(this.logFile)) {
                const content = fs.readFileSync(this.logFile, 'utf8');
                const lines = content.split('\n').filter(l => l.trim());
                return lines.slice(-count).join('\n');
            }
        } catch (error) {
            return '';
        }
        return '';
    }
}

module.exports = Logger;
