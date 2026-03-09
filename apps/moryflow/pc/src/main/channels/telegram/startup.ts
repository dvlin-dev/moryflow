/**
 * [INPUT]: Telegram channel service init
 * [OUTPUT]: 启动容错后的 init 结果（失败仅记录日志，不中断主流程）
 * [POS]: Telegram 作为可选模块的启动边界
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

type TelegramInitService = {
  init: () => Promise<void>;
};

type LoggerLike = Pick<Console, 'error'>;

export const initTelegramChannelForAppStartup = async (
  service: TelegramInitService,
  logger: LoggerLike = console
): Promise<void> => {
  try {
    await service.init();
  } catch (error) {
    logger.error('[telegram-channel] init failed, continuing without Telegram', error);
  }
};
