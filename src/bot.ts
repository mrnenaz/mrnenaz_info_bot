import { Bot, session, SessionFlavor } from 'grammy';
import { SessionData, initialSession } from './types/session';
import { registerAdminHandlers } from './handlers/admin';
import { registerCallbackHandlers } from './handlers/callbacks';
import { config } from './config';

export type MyContext = import('grammy').Context & SessionFlavor<SessionData>;

export function createBot(): Bot<MyContext> {
  const bot = new Bot<MyContext>(config.botToken);

  // Session middleware (in-memory; replace with MongoDB adapter if needed)
  bot.use(
    session({
      initial: initialSession,
    })
  );

  // Register handlers
  registerAdminHandlers(bot);
  registerCallbackHandlers(bot as unknown as Bot);

  // Error handler
  bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`❌ Error for update ${ctx.update.update_id}:`, err.error);
  });

  return bot;
}
