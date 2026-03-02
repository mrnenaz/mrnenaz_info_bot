import { Bot, Context, session, SessionFlavor } from "grammy";
import { SessionData, initialSession } from "../types/session";
import { adminOnly } from "../middlewares/adminOnly";
import {
  publishTextPost,
  publishPhotoPost,
  publishButtonPost,
} from "../services/postService";
import { publishEvent } from "../services/eventService";
import { publishPoll } from "../services/pollService";

type MyContext = Context & SessionFlavor<SessionData>;

function escape(text: string): string {
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function registerAdminHandlers(bot: Bot<MyContext>): void {
  // ──────────────────────────────────────────────
  // /start & /help
  // ──────────────────────────────────────────────
  bot.command("start", adminOnly, async (ctx) => {
    await ctx.reply(
      `👋 <b>Панель управления каналом</b>\n\n` +
        `Доступные команды:\n` +
        `/post — 📝 Текстовый пост\n` +
        `/photopost — 🖼 Пост с фото\n` +
        `/buttonpost — 🔘 Пост с кнопками\n` +
        `/event — 📅 Анонс события\n` +
        `/poll — 📊 Голосование\n` +
        `/cancel — ❌ Отменить действие`,
      { parse_mode: "HTML" },
    );
  });

  bot.command("cancel", adminOnly, async (ctx) => {
    ctx.session = initialSession();
    await ctx.reply("❌ Действие отменено.");
  });

  // ──────────────────────────────────────────────
  // /post — simple text post
  // ──────────────────────────────────────────────
  bot.command("post", adminOnly, async (ctx) => {
    ctx.session = { step: "post:text", draft: {} };
    await ctx.reply("📝 Введите текст поста (поддерживается HTML):");
  });

  // ──────────────────────────────────────────────
  // /photopost
  // ──────────────────────────────────────────────
  bot.command("photopost", adminOnly, async (ctx) => {
    ctx.session = { step: "photopost:photo", draft: {} };
    await ctx.reply("🖼 Отправьте фото для поста:");
  });

  // ──────────────────────────────────────────────
  // /buttonpost
  // ──────────────────────────────────────────────
  bot.command("buttonpost", adminOnly, async (ctx) => {
    ctx.session = { step: "buttonpost:photo", draft: {} };
    await ctx.reply(
      "🔘 <b>Создание поста с кнопками</b>\n\nШаг 1: Отправьте фото для поста или напишите <code>skip</code> для поста без фото.",
      { parse_mode: "HTML" },
    );
  });

  // ──────────────────────────────────────────────
  // /event
  // ──────────────────────────────────────────────
  bot.command("event", adminOnly, async (ctx) => {
    ctx.session = { step: "event:title", draft: {} };
    await ctx.reply(
      "📅 <b>Создание анонса события</b>\n\nВведите название события:",
      {
        parse_mode: "HTML",
      },
    );
  });

  // ──────────────────────────────────────────────
  // /poll
  // ──────────────────────────────────────────────
  bot.command("poll", adminOnly, async (ctx) => {
    ctx.session = { step: "poll:question", draft: {} };
    await ctx.reply("📊 <b>Создание голосования</b>\n\nВведите вопрос:", {
      parse_mode: "HTML",
    });
  });

  // ──────────────────────────────────────────────
  // Universal message handler (FSM)
  // ──────────────────────────────────────────────
  bot.on("message", adminOnly, async (ctx) => {
    const step = ctx.session.step;
    const draft = ctx.session.draft;
    const text = ctx.message.text ?? "";
    const photo = ctx.message.photo;

    // ── TEXT POST ──
    if (step === "post:text") {
      if (!text) {
        await ctx.reply("❗ Пожалуйста, отправьте текст.");
        return;
      }
      await publishTextPost(bot, text);
      ctx.session = initialSession();
      await ctx.reply("✅ Текстовый пост опубликован!");
      return;
    }

    // ── PHOTO POST ──
    if (step === "photopost:photo") {
      if (!photo) {
        await ctx.reply("❗ Отправьте фото.");
        return;
      }
      draft.photoFileId = photo[photo.length - 1].file_id;
      ctx.session.step = "photopost:caption";
      await ctx.reply(
        "✏️ Введите подпись к фото (или <code>skip</code> без подписи):",
        {
          parse_mode: "HTML",
        },
      );
      return;
    }
    if (step === "photopost:caption") {
      const caption = text === "skip" ? "" : text;
      await publishPhotoPost(bot, draft.photoFileId as string, caption);
      ctx.session = initialSession();
      await ctx.reply("✅ Пост с фото опубликован!");
      return;
    }

    // ── BUTTON POST ──
    if (step === "buttonpost:photo") {
      if (text.toLowerCase() === "skip") {
        draft.photoFileId = undefined;
      } else if (photo) {
        draft.photoFileId = photo[photo.length - 1].file_id;
      } else {
        await ctx.reply("❗ Отправьте фото или напишите <code>skip</code>.", {
          parse_mode: "HTML",
        });
        return;
      }
      ctx.session.step = "buttonpost:text";
      await ctx.reply("✏️ Введите текст поста (поддерживается HTML):");
      return;
    }
    if (step === "buttonpost:text") {
      if (!text) {
        await ctx.reply("❗ Введите текст.");
        return;
      }
      draft.text = text;
      ctx.session.step = "buttonpost:buttons";
      await ctx.reply(
        "🔘 Введите кнопки в формате JSON-массива:\n\n" +
          '<pre>[{"label":"Кнопка 1","popupText":"Текст попапа 1"},{"label":"Кнопка 2","popupText":"Текст 2","popupUrl":"https://example.com"}]</pre>',
        { parse_mode: "HTML" },
      );
      return;
    }
    if (step === "buttonpost:buttons") {
      try {
        const buttons = JSON.parse(text);
        console.log("PARSED:", buttons);
        if (!Array.isArray(buttons) || buttons.length === 0) throw new Error();
        await publishButtonPost(
          bot,
          draft.photoFileId as string | undefined,
          draft.text as string,
          buttons,
        );
        ctx.session = initialSession();
        await ctx.reply("✅ Пост с кнопками опубликован!");
      } catch (err) {
        console.log("ERROR:", err);
        await ctx.reply(
          "❌ Неверный формат JSON. Попробуйте ещё раз:\n\n" +
            '<pre>[{"label":"Название","popupText":"Текст попапа"}]</pre>',
          { parse_mode: "HTML" },
        );
      }
      return;
    }

    // ── EVENT ──
    if (step === "event:title") {
      if (!text) {
        await ctx.reply("❗ Введите название.");
        return;
      }
      draft.title = text;
      ctx.session.step = "event:description";
      await ctx.reply("📄 Введите описание события:");
      return;
    }
    if (step === "event:description") {
      if (!text) {
        await ctx.reply("❗ Введите описание.");
        return;
      }
      draft.description = text;
      ctx.session.step = "event:location";
      await ctx.reply("📍 Введите место проведения (или <code>skip</code>):", {
        parse_mode: "HTML",
      });
      return;
    }
    if (step === "event:location") {
      draft.location = text.toLowerCase() === "skip" ? undefined : text;
      ctx.session.step = "event:date";
      await ctx.reply(
        "🕐 Введите дату и время события в формате:\n<code>ДД.ММ.ГГГГ ЧЧ:ММ</code>",
        {
          parse_mode: "HTML",
        },
      );
      return;
    }
    if (step === "event:date") {
      const match = text.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/);
      if (!match) {
        await ctx.reply(
          "❗ Неверный формат. Используйте: <code>ДД.ММ.ГГГГ ЧЧ:ММ</code>",
          {
            parse_mode: "HTML",
          },
        );
        return;
      }
      const [, d, m, y, h, min] = match;
      draft.eventDate = new Date(`${y}-${m}-${d}T${h}:${min}:00+03:00`);
      ctx.session.step = "event:photo";
      await ctx.reply(
        "🖼 Отправьте фото события или напишите <code>skip</code>:",
        {
          parse_mode: "HTML",
        },
      );
      return;
    }
    if (step === "event:photo") {
      if (photo) {
        draft.photoFileId = photo[photo.length - 1].file_id;
      } else if (text.toLowerCase() !== "skip") {
        await ctx.reply("❗ Отправьте фото или напишите <code>skip</code>.", {
          parse_mode: "HTML",
        });
        return;
      }
      await publishEvent(bot, {
        title: draft.title as string,
        description: draft.description as string,
        location: draft.location as string | undefined,
        eventDate: draft.eventDate as Date,
        photoFileId: draft.photoFileId as string | undefined,
      });
      ctx.session = initialSession();
      await ctx.reply("✅ Анонс события опубликован!");
      return;
    }

    // ── POLL ──
    if (step === "poll:question") {
      if (!text) {
        await ctx.reply("❗ Введите вопрос.");
        return;
      }
      draft.question = text;
      ctx.session.step = "poll:options";
      await ctx.reply(
        "📋 Введите варианты ответа — каждый с новой строки (минимум 2):\n\n<i>Пример:</i>\n<pre>Да\nНет\nВоздержусь</pre>",
        { parse_mode: "HTML" },
      );
      return;
    }
    if (step === "poll:options") {
      const options = text
        .split("\n")
        .map((o) => o.trim())
        .filter(Boolean);
      if (options.length < 2) {
        await ctx.reply("❗ Нужно минимум 2 варианта.");
        return;
      }
      draft.options = options;
      ctx.session.step = "poll:anonymous";
      await ctx.reply(
        "👤 Анонимное голосование? Ответьте <code>да</code> или <code>нет</code>:",
        {
          parse_mode: "HTML",
        },
      );
      return;
    }
    if (step === "poll:anonymous") {
      const lower = text.toLowerCase();
      if (lower !== "да" && lower !== "нет") {
        await ctx.reply("❗ Ответьте <code>да</code> или <code>нет</code>:", {
          parse_mode: "HTML",
        });
        return;
      }
      draft.isAnonymous = lower === "да";
      ctx.session.step = "poll:closes";
      await ctx.reply(
        "⏰ Дата завершения голосования (необязательно).\nФормат: <code>ДД.ММ.ГГГГ ЧЧ:ММ</code>\nИли напишите <code>skip</code> для бессрочного:",
        { parse_mode: "HTML" },
      );
      return;
    }
    if (step === "poll:closes") {
      let closesAt: Date | undefined;
      if (text.toLowerCase() !== "skip") {
        const match = text.match(
          /^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/,
        );
        if (!match) {
          await ctx.reply(
            "❗ Неверный формат или напишите <code>skip</code>:",
            {
              parse_mode: "HTML",
            },
          );
          return;
        }
        const [, d, m, y, h, min] = match;
        closesAt = new Date(`${y}-${m}-${d}T${h}:${min}:00+03:00`);
      }
      await publishPoll(bot, {
        question: draft.question as string,
        options: draft.options as string[],
        isAnonymous: draft.isAnonymous as boolean,
        closesAt,
      });
      ctx.session = initialSession();
      await ctx.reply("✅ Голосование опубликовано!");
      return;
    }
  });
}
