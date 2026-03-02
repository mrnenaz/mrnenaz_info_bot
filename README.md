# 📢 Telegram Channel Bot

Бот для управления Telegram-каналом. Node.js + TypeScript + MongoDB.

## Возможности

| Команда | Описание |
|---|---|
| `/post` | 📝 Текстовый пост в канал |
| `/photopost` | 🖼 Пост с фотографией и подписью |
| `/buttonpost` | 🔘 Пост с inline-кнопками и попапами |
| `/event` | 📅 Анонс события |
| `/poll` | 📊 Кастомное голосование с live-обновлением |
| `/cancel` | ❌ Отмена текущего действия |

## Быстрый старт

### 1. Установка зависимостей
```bash
npm install
```

### 2. Настройка окружения
```bash
cp .env.example .env
```

Заполните `.env`:
```
BOT_TOKEN=       # Токен от @BotFather
MONGODB_URI=     # URI подключения к MongoDB
ADMIN_TELEGRAM_ID=  # Ваш Telegram ID (узнать у @userinfobot)
CHANNEL_ID=      # @username канала или -100xxxxxxxxxx
```

> ⚠️ Бот должен быть **администратором** канала с правом публикации сообщений.

### 3. Запуск в dev-режиме
```bash
npm run dev
```

### 4. Сборка и запуск в production
```bash
npm run build
npm start
```

---

## Как работают кнопки и попапы

1. Создаёте пост через `/buttonpost`
2. Задаёте кнопки в JSON-формате:
```json
[
  {"label": "Цена", "popupText": "Стоимость участия: 1000₽"},
  {"label": "Регистрация", "popupText": "Заполните форму", "popupUrl": "https://example.com/form"}
]
```
3. Данные сохраняются в MongoDB — кнопки работают **навсегда**, даже после перезапуска бота.

---

## Структура базы данных

### Коллекция `posts`
```
{
  telegramMessageId: Number,    // ID сообщения в Telegram
  channelId: String,            // ID канала
  type: 'text' | 'photo' | 'button_post' | 'event',
  text: String,
  photoFileId: String,
  buttons: [{
    label: String,
    callbackData: String,       // уникальный ключ
    popupText: String,
    popupUrl: String (optional)
  }],
  createdAt, updatedAt
}
```

### Коллекция `events`
```
{
  title, description, location,
  eventDate: Date,
  callbackData: String,         // уникальный ключ для попапа
  telegramMessageId, channelId,
  createdAt, updatedAt
}
```

### Коллекция `polls`
```
{
  question: String,
  options: [{
    text, callbackData,
    votes: Number,
    voterIds: [Number]
  }],
  isAnonymous: Boolean,
  isClosed: Boolean,
  closesAt: Date,
  createdAt, updatedAt
}
```

---

## Особенности голосования

- Результаты отображаются в реальном времени — сообщение обновляется после каждого голоса
- В анонимном режиме один пользователь может голосовать несколько раз
- В неанонимном — защита от повторного голосования
- Визуальные прогресс-бары в процентах

---

## Production: pm2

```bash
npm install -g pm2
npm run build
pm2 start dist/index.js --name tg-bot
pm2 save
```
