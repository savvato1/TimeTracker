'use strict';
const vscode = require('vscode');

const TimeStore = require('./src/TimeStore');
const StatusBar = require('./src/StatusBar');
const ActivityMonitor = require('./src/ActivityMonitor');
const WebviewManager = require('./src/WebviewManager');

let monitor;
let statusBar;
let webviewManager;

function activate(context) {
  console.log('ECM TimeTracker is now active!');

  // Initialize Components
  const store = new TimeStore(context);
  statusBar = new StatusBar();
  webviewManager = new WebviewManager(context, store);

  // Config
  const config = vscode.workspace.getConfiguration('ecm_timetracker');
  const idleThreshold = config.get('idleThreshold', 60);

  // Monitor starts tracking immediately
  monitor = new ActivityMonitor(store, statusBar, { idleThreshold });

  // Commands
  context.subscriptions.push(vscode.commands.registerCommand('ecm_timetracker.showStats', () => {
    webviewManager.showStats();
  }));

  context.subscriptions.push(vscode.commands.registerCommand('ecm_timetracker.togglePause', () => {
    const isPaused = store.togglePause();
    vscode.window.showInformationMessage(isPaused ? 'ECM TimeTracker: Paused' : 'ECM TimeTracker: Resumed');
    monitor._updateUI(); // Immediate update
  }));

  context.subscriptions.push(vscode.commands.registerCommand('ecm_timetracker.stopAndFinish', () => {
    store.setPaused(true);
    monitor._updateUI();
    webviewManager.showFinishTask();
  }));

  context.subscriptions.push(vscode.commands.registerCommand('ecm_timetracker.resetTimer', async () => {
    const choice = await vscode.window.showWarningMessage('Reset current task timer?', 'Yes', 'No');
    if (choice === 'Yes') {
      store.resetCurrentTime();
      monitor._updateUI();
    }
  }));

  context.subscriptions.push(vscode.commands.registerCommand('ecm_timetracker.finishTask', () => {
    webviewManager.showFinishTask();
  }));

  context.subscriptions.push(vscode.commands.registerCommand('ecm_timetracker.logAiTask', async () => {
    const task = await vscode.window.showInputBox({
      placeHolder: 'Enter task description or AI interaction details',
      prompt: 'Log manual task or AI prompt'
    });
    if (task) {
      store.addLogEntry(task);
      vscode.window.showInformationMessage('Task logged.');
    }
  }));

  // Add everything to subscriptions for cleanup
  context.subscriptions.push(statusBar);
  context.subscriptions.push(monitor);
}

function deactivate() {
  if (monitor) monitor.dispose();
  if (statusBar) statusBar.dispose();
}

module.exports = {
  activate,
  deactivate
};
