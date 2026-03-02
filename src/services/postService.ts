import { Bot, InlineKeyboard } from 'grammy';
import { v4 as uuidv4 } from 'uuid';
import { Post, IButton } from '../db/models/Post';
import { config } from '../config';

interface ButtonInput {
  label: string;
  popupText: string;
  popupUrl?: string;
}

export async function publishTextPost(bot: Bot, text: string): Promise<void> {
  const msg = await bot.api.sendMessage(config.channelId, text, { parse_mode: 'HTML' });

  await Post.create({
    telegramMessageId: msg.message_id,
    channelId: config.channelId,
    type: 'text',
    text,
    buttons: [],
  });
}

export async function publishPhotoPost(
  bot: Bot,
  photoFileId: string,
  caption: string
): Promise<void> {
  const msg = await bot.api.sendPhoto(config.channelId, photoFileId, {
    caption,
    parse_mode: 'HTML',
  });

  await Post.create({
    telegramMessageId: msg.message_id,
    channelId: config.channelId,
    type: 'photo',
    text: caption,
    photoFileId,
    buttons: [],
  });
}

export async function publishButtonPost(
  bot: Bot,
  photoFileId: string | undefined,
  text: string,
  buttonInputs: ButtonInput[]
): Promise<void> {
  const buttons: IButton[] = buttonInputs.map((b) => ({
    label: b.label,
    callbackData: `btn_${uuidv4()}`,
    popupText: b.popupText,
    popupUrl: b.popupUrl,
  }));

  const keyboard = new InlineKeyboard();
  buttons.forEach((btn) => {
    keyboard.text(btn.label, btn.callbackData).row();
  });

  let telegramMessageId: number;

  if (photoFileId) {
    const msg = await bot.api.sendPhoto(config.channelId, photoFileId, {
      caption: text,
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
    telegramMessageId = msg.message_id;
  } else {
    const msg = await bot.api.sendMessage(config.channelId, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
    telegramMessageId = msg.message_id;
  }

  await Post.create({
    telegramMessageId,
    channelId: config.channelId,
    type: 'button_post',
    text,
    photoFileId,
    buttons,
  });
}
