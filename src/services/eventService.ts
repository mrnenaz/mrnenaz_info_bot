import { Bot, InlineKeyboard } from "grammy";
import { v4 as uuidv4 } from "uuid";
import { Event } from "../db/models/Event";
import { config } from "../config";

interface EventInput {
  title: string;
  description: string;
  location?: string;
  eventDate: Date;
  photoFileId?: string;
}

function formatEventText(input: EventInput): string {
  const dateStr = input.eventDate.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  });

  let text = `📅 <b>${input.title}</b>\n\n`;
  text += `🕐 <b>Дата и время:</b> ${dateStr}\n`;
  if (input.location) text += `📍 <b>Место:</b> ${input.location}\n`;
  text += `\n${input.description}`;
  return text;
}

export async function publishEvent(
  bot: Bot<any>,
  input: EventInput,
): Promise<void> {
  const callbackData = `event_${uuidv4()}`;
  const text = formatEventText(input);

  const keyboard = new InlineKeyboard().text("ℹ️ Подробнее", callbackData);

  let telegramMessageId: number;

  if (input.photoFileId) {
    const msg = await bot.api.sendPhoto(config.channelId, input.photoFileId, {
      caption: text,
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
    telegramMessageId = msg.message_id;
  } else {
    const msg = await bot.api.sendMessage(config.channelId, text, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
    telegramMessageId = msg.message_id;
  }

  await Event.create({
    telegramMessageId,
    channelId: config.channelId,
    callbackData,
    ...input,
  });
}
