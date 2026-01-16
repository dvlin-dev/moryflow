/**
 * [DEFINES]: 配额状态响应 DTO
 * [USED_BY]: quota.controller.ts
 * [POS]: API 响应数据结构
 */

/** 配额状态响应 */
export class QuotaStatusDto {
  /** 月度配额信息 */
  monthly: {
    /** 月度上限 */
    limit: number;
    /** 已使用量 */
    used: number;
    /** 剩余量 */
    remaining: number;
  };

  /** 购买配额余额 */
  purchased: number;

  /** 总可用配额 */
  totalRemaining: number;

  /** 当前周期结束时间 (ISO 8601) */
  periodEndsAt: string;

  /** 当前周期开始时间 (ISO 8601) */
  periodStartsAt: string;
}

/** 配额查询 API 响应 */
export class QuotaStatusResponseDto {
  success: true;
  data: QuotaStatusDto;
}
