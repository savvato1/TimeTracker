# Руководство по отладке API интеграции

## Как открыть консоль разработчика в VS Code

1. **Открыть Developer Tools:**
   - Нажмите `Ctrl+Shift+I` (Windows/Linux) или `Cmd+Option+I` (Mac)
   - Или через меню: `Help` → `Toggle Developer Tools`

2. **Перейти на вкладку Console**

## Отладка выбора проектов

### Признаки проблемы:
- При выборе проекта из выпадающего списка ничего не происходит
- Задачи не загружаются

### Что проверить:

#### 1. Проверьте настройки API
Откройте настройки:
- Command Palette (`Ctrl+Shift+P`)
- Введите: `ECM TimeTracker: Open Settings`
- Проверьте:
  - API Endpoint (например: `https://taskhub.loc`)
  - API Key или Username/Password
  - Нажмите **"Test Connection"** - должно появиться зеленое сообщение "✓ Connection successful!"

#### 2. Проверьте консоль при открытии формы завершения задачи

Откройте форму finish task и следите за console:

```
[TimeTracker] Projects loaded: X  <-- Должно показать количество проектов
```

Если показывает 0, значит:
- API не настроен
- API не возвращает проекты
- Проблемы с соединением

#### 3. Проверьте консоль при выборе проекта

Выберите проект из dropdown, в консоли должно появиться:

```
[TimeTracker] selectProject called, value: 1
[TimeTracker] Loading tasks for project: 1
[TimeTracker] Loading tasks for project: 1  <-- на стороне расширения
[TimeTracker] Tasks loaded from API: X
[TimeTracker] Message received: {command: "tasks_loaded", tasks: Array(X)}
[TimeTracker] Tasks loaded: X
```

### Возможные ошибки:

#### Ошибка: "Failed to parse response"
- API возвращает невалидный JSON
- Проверьте API endpoint

#### Ошибка: "HTTP 401" или "HTTP 403"
- Неверный API Key или credentials
- Проверьте настройки авторизации

#### Ошибка: "Request failed: connect ECONNREFUSED"
- API endpoint недоступен
- Проверьте URL (должен быть HTTPS или HTTP)
- Проверьте, работает ли сервер

#### Ошибка: TypeError в консоли
- Проверьте формат данных от API
- API должно возвращать:
  ```json
  {
    "success": true,
    "data": [
      {"id": 1, "name": "Project Name"},
      ...
    ]
  }
  ```

## Проверка Settings WebView

### Кнопка "Test Connection" не видна

**Проверьте:**
1. Открыта ли форма настроек правильно
2. Прокрутите вниз - кнопки находятся внизу формы
3. Проверьте console на ошибки загрузки WebView

### Кнопка есть, но не работает

В консоли должно появиться при нажатии:
```
Testing connection...
```

Затем либо:
```
✓ Connection successful!
```

Или:
```
✗ Connection failed
<текст ошибки>
```

## Быстрая проверка работоспособности

### Шаг 1: Откройте настройки
```
Command Palette → ECM TimeTracker: Open Settings
```

### Шаг 2: Заполните поля
- API Endpoint: `https://taskhub.loc`
- Authentication Method: выберите "API Key"
- API Key: вставьте ваш ключ

### Шаг 3: Нажмите "Test Connection"
- Должно появиться зеленое сообщение ✓
- Если красное ✗ - смотрите текст ошибки

### Шаг 4: Нажмите "Save Settings"
- Должно появиться уведомление "Settings saved successfully!"

### Шаг 5: Проверьте выбор проектов
```
Command Palette → ECM TimeTracker: Finish Task
```
- В поле "Project" должен быть dropdown справа
- Выберите проект
- Название проекта должно появиться в текстовом поле
- В dropdown "Task" должны загрузиться задачи проекта

## Общие решения проблем

### Проблема: Настройки не сохраняются
**Решение:** Проверьте права доступа к настройкам VS Code

### Проблема: Проекты не загружаются
**Решение:**
1. Проверьте API endpoint
2. Проверьте API key
3. Проверьте формат ответа API (должен быть JSON)
4. Посмотрите в console на точную ошибку

### Проблема: API работает в браузере, но не в расширении
**Решение:**
- Проверьте CORS настройки API
- Проверьте SSL сертификаты (для HTTPS)
- VS Code может блокировать самоподписанные сертификаты

## Сбор информации для отчета об ошибке

Если проблема не решается, соберите следующую информацию:

1. **Версия расширения:** 0.2.0
2. **Версия VS Code:** Help → About
3. **Консоль разработчика:**
   - Скопируйте все сообщения с префиксом `[TimeTracker]`
   - Скопируйте все ошибки (красный текст)
4. **Настройки API:**
   - API Endpoint (без ключа!)
   - Метод авторизации
5. **Тестовый запрос:**
   ```bash
   curl -X GET "https://your-api-endpoint/api/v1/projects" \
     -H "X-API-Key: YOUR_KEY"
   ```
   Результат этой команды
