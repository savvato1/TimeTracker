const vscode = require('vscode');

class LocalizationManager {
    constructor(context) {
        this.context = context;
        this.langKey = 'ecm_timetracker.language';

        // Try to get stored language, otherwise detect environment language
        let stored = this.context.globalState.get(this.langKey);
        if (!stored) {
            const envLang = vscode.env.language; // e.g. "en-US", "ru", "uk-UA"
            if (envLang.startsWith('ru')) stored = 'ru';
            else if (envLang.startsWith('uk')) stored = 'uk';
            else stored = 'en';
        }

        this.currentLang = stored;

        this.translations = {
            en: {
                // Extension / Status
                paused: "ECM TimeTracker: Paused",
                resumed: "ECM TimeTracker: Resumed",
                resetWarning: "Reset current task timer?",
                yes: "Yes",
                no: "No",
                taskLogged: "Task logged.",
                enterTask: "Enter task description or AI interaction details",
                logPrompt: "Log manual task or AI prompt",
                pauseTooltip: "Pause Timer",
                resumeTooltip: "Resume Timer",
                resetTooltip: "Reset Timer",
                stopTooltip: "Stop & Finish Task",
                statsTooltip: "View Statistics",

                // Stats Page
                statsTitle: "ECM Statistics",
                allTime: "All Time",
                totalActiveTime: "Total Active Time",
                activeLanguages: "Active Languages",
                activeProjects: "Active Projects",
                historyTasks: "History & Tasks",
                total: "Total",
                finishCurrentTask: "Finish Current Task",
                deleteTaskTooltip: "Delete Task",
                deleteTaskWarning: "Delete this task record?",
                untitled: "Untitled",
                noDescription: "No description",
                files: "Files",

                // Finish Page
                finishTitle: "Finish Task",
                taskTitlePlaceholder: "Task Title (e.g. Refactor Login)",
                reviewSummary: "Review the generated summary (Diffs included if available):",
                generateButton: "Generate Report & Finish",
                generatingReport: "Generating Report...",
                analyzing: "Analyzing file changes...",

                // Report Data Headers
                project: "Project",
                duration: "Duration",
                modifiedFiles: "Modified Files",
                viewedFiles: "Viewed Files",
                aiInteractions: "AI Interactions",
                codeChanges: "Code Changes Summary",
                finalDescription: "Final Description",
                uniqueFiles: "Unique Modified/Touched Files",

                // Final Report Page
                reportTitle: "Task Activity Report",
                summarySection: "Summary",
                taskLabel: "Task",
                dateLabel: "Date",
                durationLabel: "Duration",
                projectLabel: "Project",
                descriptionSection: "Description",
                noDescProvided: "No description provided.",
                filesTouchedSection: "Files Touched",
                noFileTracked: "No specific file tracked as primary.",
                taskFinished: "Task finished",
                viewStats: "View Statistics",

                // Analytics
                userTime: "User Time",
                aiTime: "AI Time",
                totalTime: "Total Time",
                timeBreakdown: "Time Breakdown"
            },
            ru: {
                paused: "ECM TimeTracker: Пауза",
                resumed: "ECM TimeTracker: Возобновлено",
                resetWarning: "Сбросить таймер текущей задачи?",
                yes: "Да",
                no: "Нет",
                taskLogged: "Задача записана.",
                enterTask: "Введите описание задачи или детали AI",
                logPrompt: "Записать задачу вручную или AI промпт",
                pauseTooltip: "Пауза",
                resumeTooltip: "Продолжить",
                resetTooltip: "Сброс таймера",
                stopTooltip: "Стоп и Завершить",
                statsTooltip: "Статистика",

                statsTitle: "ECM Статистика",
                allTime: "За все время",
                totalActiveTime: "Активное время",
                activeLanguages: "Языки",
                activeProjects: "Проекты",
                historyTasks: "История и Задачи",
                total: "Всего",
                finishCurrentTask: "Завершить текущую задачу",
                deleteTaskTooltip: "Удалить задачу",
                deleteTaskWarning: "Удалить запись об этой задаче?",
                untitled: "Без названия",
                noDescription: "Нет описания",
                files: "Файлов",

                finishTitle: "Завершение задачи",
                taskTitlePlaceholder: "Название задачи (напр. Рефакторинг)",
                reviewSummary: "Проверьте отчет (изменения включены, если доступны):",
                generateButton: "Создать отчет и Завершить",
                generatingReport: "Создание отчета...",
                analyzing: "Анализ изменений файлов...",

                project: "Проект",
                duration: "Длительность",
                modifiedFiles: "Измененные файлы",
                viewedFiles: "Просмотренные файлы",
                aiInteractions: "Взаимодействие с AI",
                codeChanges: "Сводка изменений кода",
                finalDescription: "Итоговое описание",
                uniqueFiles: "Уникальные файлы",

                reportTitle: "Отчет об активности по задаче",
                summarySection: "Сводка",
                taskLabel: "Задача",
                dateLabel: "Дата",
                durationLabel: "Длительность",
                projectLabel: "Проект",
                descriptionSection: "Описание",
                noDescProvided: "Описание не предоставлено.",
                filesTouchedSection: "Затронутые файлы",
                noFileTracked: "Основной файл не отслеживался.",
                taskFinished: "Задача завершена",
                viewStats: "Посмотреть статистику",

                userTime: "Время пользователя",
                aiTime: "Время AI",
                totalTime: "Всего времени",
                timeBreakdown: "Распределение времени"
            },
            uk: {
                paused: "ECM TimeTracker: Пауза",
                resumed: "ECM TimeTracker: Відновлено",
                resetWarning: "Скинути таймер поточної задачі?",
                yes: "Так",
                no: "Ні",
                taskLogged: "Задачу записано.",
                enterTask: "Введіть опис задачі або деталі AI",
                logPrompt: "Записати задачу вручну або AI промпт",
                pauseTooltip: "Пауза",
                resumeTooltip: "Продовжити",
                resetTooltip: "Скинути таймер",
                stopTooltip: "Стоп та Завершити",
                statsTooltip: "Статистика",

                statsTitle: "ECM Статистика",
                allTime: "За весь час",
                totalActiveTime: "Активний час",
                activeLanguages: "Мови",
                activeProjects: "Проєкти",
                historyTasks: "Історія та Задачі",
                total: "Всього",
                finishCurrentTask: "Завершити поточну задачу",
                deleteTaskTooltip: "Видалити задачу",
                deleteTaskWarning: "Видалити запис про цю задачу?",
                untitled: "Без назви",
                noDescription: "Без опису",
                files: "Файлів",

                finishTitle: "Завершення задачі",
                taskTitlePlaceholder: "Назва задачі (напр. Рефакторинг)",
                reviewSummary: "Перевірте звіт (зміни включено, якщо доступні):",
                generateButton: "Створити звіт та Завершити",
                generatingReport: "Створення звіту...",
                analyzing: "Аналіз змін файлів...",

                project: "Проєкт",
                duration: "Тривалість",
                modifiedFiles: "Змінені файли",
                viewedFiles: "Переглянуті файли",
                aiInteractions: "Взаємодія з AI",
                codeChanges: "Зведення змін коду",
                finalDescription: "Підсумковий опис",
                uniqueFiles: "Унікальні файли",

                reportTitle: "Звіт про активність по задачі",
                summarySection: "Зведення",
                taskLabel: "Задача",
                dateLabel: "Дата",
                durationLabel: "Тривалість",
                projectLabel: "Проєкт",
                descriptionSection: "Опис",
                noDescProvided: "Опис не надано.",
                filesTouchedSection: "Зачеплені файли",
                noFileTracked: "Основний файл не відстежувався.",
                taskFinished: "Задачу завершено",
                viewStats: "Переглянути статистику",

                userTime: "Час користувача",
                aiTime: "Час AI",
                totalTime: "Всього часу",
                timeBreakdown: "Розподіл часу"
            }
        };
    }

    t(key) {
        const dict = this.translations[this.currentLang] || this.translations['en'];
        return dict[key] || key;
    }

    async setLanguage(langCode) {
        if (this.translations[langCode]) {
            this.currentLang = langCode;
            await this.context.globalState.update(this.langKey, langCode);
            // Prompt reload or just ensure dynamic updates where possible
            vscode.window.showInformationMessage(`Language set to ${langCode.toUpperCase()}`);
        }
    }
}

module.exports = LocalizationManager;
