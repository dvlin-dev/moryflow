/**
 * [INPUT]: Query + Referer
 * [OUTPUT]: 支付成功 HTML（可选 postMessage）
 * [POS]: 支付回跳中转页
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Controller, Get, Header, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../auth';
import { getAllowedOrigins } from '../common/utils';
import {
  resolvePostMessageOrigin,
  serializeQueryForScript,
} from './payment.utils';

@ApiTags('Payment')
@Controller({ path: 'payment', version: '1' })
export class PaymentSuccessController {
  /**
   * GET /api/v1/payment/success
   * 支付成功页面（公开接口）
   * 返回 HTML 页面，通过 postMessage 通知父窗口（用于 iframe 嵌入支付场景）
   */
  @ApiOperation({ summary: '支付成功页面' })
  @ApiResponse({ status: 200, description: '返回支付成功 HTML 页面' })
  @Public()
  @Get('success')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getSuccessPage(@Req() req: Request, @Query() query: Record<string, string>) {
    const queryData = serializeQueryForScript(query);
    const allowedOrigins = getAllowedOrigins();
    const host = req.get('host');
    const fallbackOrigin = host ? `${req.protocol}://${host}` : undefined;
    const targetOrigin = resolvePostMessageOrigin(
      allowedOrigins,
      req.get('referer') ?? undefined,
      fallbackOrigin,
    );
    const targetOriginJson = targetOrigin
      ? JSON.stringify(targetOrigin)
      : 'null';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment successful - Moryflow</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
    }
    .container {
      text-align: center;
      padding: 40px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
      max-width: 400px;
      width: 90%;
    }
    .icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 24px;
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: scale-in 0.3s ease-out;
    }
    .icon svg {
      width: 40px;
      height: 40px;
      color: white;
    }
    h1 {
      color: #1a1a1a;
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    p {
      color: #666;
      font-size: 14px;
      line-height: 1.5;
    }
    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #e5e7eb;
      border-top-color: #22c55e;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      display: inline-block;
      vertical-align: middle;
      margin-right: 8px;
    }
    @keyframes scale-in {
      0% { transform: scale(0); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <h1>Payment successful</h1>
    <p><span class="spinner"></span>Returning to the app...</p>
  </div>
  <script>
    const targetOrigin = ${targetOriginJson};
    // 通知父窗口支付成功（iframe 场景）
    if (window.parent !== window && targetOrigin) {
      window.parent.postMessage({
        type: 'PAYMENT_SUCCESS',
        data: ${queryData}
      }, targetOrigin);
    }

    // 非 iframe 场景：跳转到 Deep Link 返回应用
    if (window.parent === window) {
      // 立即尝试跳转到 Deep Link
      window.location.href = 'moryflow://payment/success';
    }
  </script>
</body>
</html>`;
  }
}
