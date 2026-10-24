# Быстрая инструкция по тестированию

## Шаг 1: Перезагрузите расширение

После изменений в коде:
1. Нажмите `F5` снова, или
2. В окне разработки: Developer → Reload Window (`Ctrl+R`)

## Шаг 2: Откройте консоль разработчика

**В окне, где тестируете расширение:**
- Нажмите `Ctrl+Shift+I` (Windows/Linux) или `Cmd+Option+I` (Mac)
- Или: Help → Toggle Developer Tools
- Перейдите на вкладку **Console**

## Шаг 3: Протестируйте Settings WebView

### 3.1 Откройте настройки:
```
Ctrl+Shift+P → ECM TimeTracker: Open Settings
```

### 3.2 Проверьте интерфейс:
✅ Поле "API Endpoint"  
✅ Выпадающий список "Authentication Method"  
✅ Поле "API Key" (или Username/Password для Basic Auth)  
✅ Две кнопки внизу:  
   - **"Save Settings"** (синяя)  
   - **"Test Connection"** (серая)  

### 3.3 Введите тестовые данные:
- API Endpoint: `https://taskhub.loc`
- Authentication Method: `API Key (Recommended)`
- API Key: `ваш_api_ключ`

### 3.4 Нажмите "Test Connection"

**В консоли должно появиться:**
- Либо зеленое сообщение: `✓ Connection successful!`
- Либо красное: `✗ Connection failed` + описание ошибки

### 3.5 Нажмите "Save Settings"

Должно появиться уведомление VS Code: `Settings saved successfully!`

## Шаг 4: Протестируйте выбор проектов

### 4.1 Откройте форму завершения задачи:
```
Ctrl+Shift+P → ECM TimeTracker: Finish Task
```

### 4.2 Проверьте консоль:
Должно появиться:
```
[TimeTracker] Projects loaded: X
```
где X - количество загруженных проектов

**Если показывает 0:**
- Вернитесь к Шагу 3 и проверьте настройки
- Убедитесь, что API возвращает проекты

### 4.3 Найдите dropdown "Project":
Справа от текстового поля "Project" должен быть выпадающий список

### 4.4 Выберите проект из списка

**В консоли должно появиться:**
```
[TimeTracker] selectProject called, value: 1
[TimeTracker] Loading tasks for project: 1
[TimeTracker] Loading tasks for project: 1
[TimeTracker] Tasks loaded from API: X
[TimeTracker] Message received: {command: "tasks_loaded", tasks: Array(X)}
[TimeTracker] Tasks loaded: X
```

### 4.5 Проверьте результат:
✅ Название проекта появилось в текстовом поле "Project"  
✅ В dropdown "Task" появились задачи проекта  
✅ Можно выбрать задачу из списка  
✅ Название задачи появляется в поле "Task"  

## Возможные проблемы и решения

### Проблема: "Кнопка Test Connection не видна"
**Решение:** Прокрутите форму настроек вниз - кнопки находятся внизу

### Проблема: "Projects loaded: 0"
**Решения:**
1. Проверьте API endpoint (должен быть без `/api/v1` в конце)
2. Проверьте API key
3. Нажмите Test Connection в настройках
4. Посмотрите на ошибку в консоли

### Проблема: "При выборе проекта ничего не происходит"
**Решения:**
1. Откройте консоль и посмотрите на сообщения
2. Проверьте, появляется ли `[TimeTracker] selectProject called`
3. Если есть, но задачи не загружаются - смотрите на ошибку
4. Возможно API endpoint проектов работает, а endpoint задач - нет

### Проблема: "Failed to load tasks"
**Решения:**
1. Проверьте, что API endpoint `/api/v1/projects/{id}/tasks` работает
2. Тестовая команда:
   ```bash
   curl -X GET "https://taskhub.loc/api/v1/projects/1/tasks" \
     -H "X-API-Key: ваш_ключ"
   ```
3. Проверьте формат ответа (должен быть JSON)

## Сборка VSIX

После успешного тестирования:

```bash
npx @vscode/vsce package --allow-star-activation
```

Будет создан файл: `ecm-timetracker-0.2.0.vsix`

## Полная документация

См. `DEBUGGING.md` для подробной информации по отладке.
