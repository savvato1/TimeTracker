'use strict';
const vscode = require('vscode');

const TimeStore = require('./src/TimeStore');
const StatusBar = require('./src/StatusBar');
const ActivityMonitor = require('./src/ActivityMonitor');
const WebviewManager = require('./src/WebviewManager');
const LocalizationManager = require('./src/LocalizationManager');

let monitor;
let statusBar;
let webviewManager;
let locManager;

function activate(context) {
  console.log('ECM TimeTracker is now active!');

  // Initialize Components
  const store = new TimeStore(context);
  locManager = new LocalizationManager(context);
  statusBar = new StatusBar(locManager); // Pass locManager
  webviewManager = new WebviewManager(context, store, locManager); // Pass locManager

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
    vscode.window.showInformationMessage(isPaused ? locManager.t('paused') : locManager.t('resumed'));
    monitor._updateUI(); // Immediate update
  }));

  context.subscriptions.push(vscode.commands.registerCommand('ecm_timetracker.stopAndFinish', () => {
    store.setPaused(true);
    monitor._updateUI();
    webviewManager.showFinishTask();
  }));

  context.subscriptions.push(vscode.commands.registerCommand('ecm_timetracker.resetTimer', async () => {
    const choice = await vscode.window.showWarningMessage(locManager.t('resetWarning'), locManager.t('yes'), locManager.t('no'));
    if (choice === locManager.t('yes')) {
      store.resetCurrentTime();
      monitor._updateUI();
    }
  }));

  context.subscriptions.push(vscode.commands.registerCommand('ecm_timetracker.finishTask', () => {
    webviewManager.showFinishTask();
  }));

  context.subscriptions.push(vscode.commands.registerCommand('ecm_timetracker.logAiTask', async () => {
    const task = await vscode.window.showInputBox({
      placeHolder: locManager.t('enterTask'),
      prompt: locManager.t('logPrompt')
    });
    if (task) {
      store.addLogEntry(task);
      vscode.window.showInformationMessage(locManager.t('taskLogged'));
    }
  }));

  context.subscriptions.push(vscode.commands.registerCommand('ecm_timetracker.setLanguage', async () => {
    const lang = await vscode.window.showQuickPick([
      { label: 'English', code: 'en' },
      { label: 'Russian (Русский)', code: 'ru' },
      { label: 'Ukrainian (Українська)', code: 'uk' }
    ], {
      placeHolder: 'Select Language / Оберите мову / Выберите язык'
    });
    if (lang) {
      await locManager.setLanguage(lang.code);
      const reload = await vscode.window.showInformationMessage('Language updated. Reload window to apply changes fully?', 'Reload', 'Later');
      if (reload === 'Reload') {
        vscode.commands.executeCommand('workbench.action.reloadWindow');
      }
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
