/**
 * [PROVIDES]: Request Log 常量（分页、保留期、截断）
 * [DEPENDS]: none
 * [POS]: Request Log 模块常量入口
 */

export const REQUEST_LOG_DEFAULT_PAGE = 1;
export const REQUEST_LOG_DEFAULT_LIMIT = 20;
export const REQUEST_LOG_MAX_LIMIT = 100;
export const REQUEST_LOG_DEFAULT_RANGE_DAYS = 7;

export const REQUEST_LOG_RETENTION_DAYS = 30;
export const REQUEST_LOG_CLEANUP_BATCH_SIZE = 2000;
export const REQUEST_LOG_CLEANUP_CRON = '0 3 * * *';

export const REQUEST_LOG_MAX_ERROR_MESSAGE_LENGTH = 512;
export const REQUEST_LOG_MAX_USER_AGENT_LENGTH = 512;
export const REQUEST_LOG_MAX_PATH_LENGTH = 512;
export const REQUEST_LOG_MAX_ROUTE_GROUP_LENGTH = 64;
