import { Context, NextFunction } from "grammy";
import { config } from "../config";

export async function adminOnly(
  ctx: Context,
  next: NextFunction,
): Promise<void> {
  const userId = ctx.from?.id;
  if (userId !== config.adminId) {
    await ctx.reply(
      "⛔ Доступ запрещён. Эта команда только для администратора.",
    );
    return;
  }
  await next();
}
