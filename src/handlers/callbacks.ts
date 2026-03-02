import { Bot } from 'grammy';
import { Post } from '../db/models/Post';
import { Event } from '../db/models/Event';
import { handlePollVote } from '../services/pollService';

export function registerCallbackHandlers(bot: Bot): void {
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const userId = ctx.from.id;

    // --- Button post popup ---
    if (data.startsWith('btn_')) {
      const post = await Post.findOne({ 'buttons.callbackData': data });
      if (!post) {
        await ctx.answerCallbackQuery({ text: '❌ Кнопка устарела', show_alert: true });
        return;
      }
      const button = post.buttons.find((b) => b.callbackData === data);
      if (!button) {
        await ctx.answerCallbackQuery({ text: '❌ Кнопка не найдена', show_alert: true });
        return;
      }
      await ctx.answerCallbackQuery({
        text: button.popupText,
        show_alert: true,
        url: button.popupUrl,
      });
      return;
    }

    // --- Event popup ---
    if (data.startsWith('event_')) {
      const event = await Event.findOne({ callbackData: data });
      if (!event) {
        await ctx.answerCallbackQuery({ text: '❌ Событие не найдено', show_alert: true });
        return;
      }
      const dateStr = event.eventDate.toLocaleString('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Moscow',
      });
      let text = `📅 ${event.title}\n🕐 ${dateStr}`;
      if (event.location) text += `\n📍 ${event.location}`;
      text += `\n\n${event.description}`;

      await ctx.answerCallbackQuery({ text, show_alert: true });
      return;
    }

    // --- Poll vote ---
    if (data.startsWith('poll_')) {
      const result = await handlePollVote(bot, data, userId);
      await ctx.answerCallbackQuery({ text: result, show_alert: true });
      return;
    }

    await ctx.answerCallbackQuery({ text: '❓ Неизвестное действие' });
  });
}
