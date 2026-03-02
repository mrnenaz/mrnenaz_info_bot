import { Bot, InlineKeyboard } from "grammy";
import { v4 as uuidv4 } from "uuid";
import { Poll, IPoll } from "../db/models/Poll";
import { config } from "../config";

interface PollInput {
  question: string;
  options: string[];
  isAnonymous: boolean;
  closesAt?: Date;
}

function buildPollText(poll: IPoll): string {
  const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0);
  let text = `📊 <b>${poll.question}</b>\n\n`;

  poll.options.forEach((opt) => {
    const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
    const bar =
      "█".repeat(Math.round(pct / 10)) + "░".repeat(10 - Math.round(pct / 10));
    text += `${opt.text}\n${bar} ${pct}% (${opt.votes})\n\n`;
  });

  text += `👥 Всего голосов: ${totalVotes}`;
  if (poll.isClosed) text += "\n\n🔒 Голосование завершено";
  return text;
}

function buildPollKeyboard(poll: IPoll): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (!poll.isClosed) {
    poll.options.forEach((opt) => {
      kb.text(opt.text, opt.callbackData).row();
    });
  }
  return kb;
}

export async function publishPoll(
  bot: Bot<any>,
  input: PollInput,
): Promise<void> {
  const pollDoc = new Poll({
    channelId: config.channelId,
    question: input.question,
    isAnonymous: input.isAnonymous,
    isClosed: false,
    closesAt: input.closesAt,
    options: input.options.map((text) => ({
      text,
      callbackData: `poll_${uuidv4()}`,
      votes: 0,
      voterIds: [],
    })),
  });

  const text = buildPollText(pollDoc);
  const keyboard = buildPollKeyboard(pollDoc);

  const msg = await bot.api.sendMessage(config.channelId, text, {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });

  pollDoc.telegramMessageId = msg.message_id;
  await pollDoc.save();
}

export async function handlePollVote(
  bot: Bot<any>,
  callbackData: string,
  userId: number,
): Promise<string> {
  const poll = await Poll.findOne({ "options.callbackData": callbackData });
  if (!poll) return "❌ Голосование не найдено";
  if (poll.isClosed) return "🔒 Голосование уже завершено";

  // Check if user already voted
  const alreadyVoted = poll.options.some((o) => o.voterIds.includes(userId));
  if (!poll.isAnonymous && alreadyVoted) return "⚠️ Вы уже голосовали";

  // Find option and increment
  const optionIndex = poll.options.findIndex(
    (o) => o.callbackData === callbackData,
  );
  if (optionIndex === -1) return "❌ Вариант не найден";

  poll.options[optionIndex].votes += 1;
  if (!poll.isAnonymous) poll.options[optionIndex].voterIds.push(userId);
  await poll.save();

  // Update the message
  const text = buildPollText(poll);
  const keyboard = buildPollKeyboard(poll);

  if (poll.telegramMessageId) {
    try {
      await bot.api.editMessageText(
        config.channelId,
        poll.telegramMessageId,
        text,
        {
          parse_mode: "HTML",
          reply_markup: keyboard,
        },
      );
    } catch {
      // Message not modified is fine
    }
  }

  return `✅ Ваш голос за «${poll.options[optionIndex].text}» учтён!`;
}

export async function closePoll(bot: Bot<any>, pollId: string): Promise<void> {
  const poll = await Poll.findById(pollId);
  if (!poll) throw new Error("Poll not found");

  poll.isClosed = true;
  await poll.save();

  if (poll.telegramMessageId) {
    const text = buildPollText(poll);
    const keyboard = buildPollKeyboard(poll);
    await bot.api.editMessageText(
      config.channelId,
      poll.telegramMessageId,
      text,
      {
        parse_mode: "HTML",
        reply_markup: keyboard,
      },
    );
  }
}
