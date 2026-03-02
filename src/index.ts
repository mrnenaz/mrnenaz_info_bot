import { connectDB } from './db/connection';
import { createBot } from './bot';

async function main(): Promise<void> {
  console.log('🚀 Starting Telegram Channel Bot...');

  await connectDB();

  const bot = createBot();

  // Graceful shutdown
  process.once('SIGINT', () => bot.stop());
  process.once('SIGTERM', () => bot.stop());

  await bot.start({
    onStart: (info) => {
      console.log(`✅ Bot @${info.username} is running`);
    },
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
