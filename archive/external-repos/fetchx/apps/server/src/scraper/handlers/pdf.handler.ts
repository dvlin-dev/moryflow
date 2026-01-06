/**
 * [INPUT]: Page, PdfOptions - Browser page and PDF generation config
 * [OUTPUT]: PdfResult - PDF URL and metadata
 * [POS]: PDF generation from rendered page with R2 storage
 *
 * [PROTOCOL]: When this file changes, update this header and src/scraper/CLAUDE.md
 */
import { Injectable, Logger } from '@nestjs/common';
import type { Page } from 'playwright';
import { R2Service } from '../../storage/r2.service';
import { ScrapeErrorCode } from '../../common/constants/error-codes';
import {
  generateFilePath,
  calculateFileExpiresAt,
  R2_SCRAPER_USER_ID,
  R2_SCRAPER_VAULT_ID,
} from '../scraper.constants';
import type { ScrapeOptions, PdfOptions } from '../dto/scrape.dto';
import type { PdfResult } from '../scraper.types';

const DEFAULT_PDF_OPTIONS: PdfOptions = {
  format: 'A4',
  landscape: false,
  scale: 1,
  printBackground: true,
};

export interface PdfHandlerResult extends PdfResult {
  uploadMs: number;
}

@Injectable()
export class PdfHandler {
  private readonly logger = new Logger(PdfHandler.name);

  constructor(private r2Service: R2Service) {}

  async process(
    page: Page,
    jobId: string,
    options: ScrapeOptions,
    tier: string,
  ): Promise<PdfHandlerResult> {
    const pdfOptions = { ...DEFAULT_PDF_OPTIONS, ...options.pdfOptions };

    // 1. 生成 PDF
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await page.pdf({
        format: pdfOptions.format,
        landscape: pdfOptions.landscape,
        margin: pdfOptions.margin,
        scale: pdfOptions.scale,
        printBackground: pdfOptions.printBackground,
      });
    } catch (error) {
      const pdfError = new Error(
        `PDF generation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      (pdfError as Error & { code: ScrapeErrorCode }).code =
        ScrapeErrorCode.BROWSER_ERROR;
      throw pdfError;
    }

    // 2. 上传到 R2
    const uploadStart = Date.now();
    const filePath = generateFilePath(jobId, 'pdf');

    try {
      await this.r2Service.uploadFile(
        R2_SCRAPER_USER_ID,
        R2_SCRAPER_VAULT_ID,
        filePath,
        pdfBuffer,
        'application/pdf',
      );
    } catch (error) {
      const uploadError = new Error(
        `PDF upload failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      (uploadError as Error & { code: ScrapeErrorCode }).code =
        ScrapeErrorCode.STORAGE_ERROR;
      throw uploadError;
    }
    const uploadMs = Date.now() - uploadStart;

    // 3. 生成 CDN URL 和过期时间
    const fileUrl = this.r2Service.getPublicUrl(R2_SCRAPER_USER_ID, R2_SCRAPER_VAULT_ID, filePath);
    const expiresAt = calculateFileExpiresAt(tier);
    const pageCount = this.getPageCount(pdfBuffer);

    this.logger.debug(
      `PDF generated: ${filePath}, size: ${pdfBuffer.length}, pages: ${pageCount}`,
    );

    return {
      url: fileUrl,
      pageCount,
      fileSize: pdfBuffer.length,
      expiresAt,
      uploadMs,
    };
  }

  /**
   * 估算 PDF 页数（基于 /Type /Page 对象数量）
   */
  private getPageCount(buffer: Buffer): number {
    const content = buffer.toString('binary');
    const matches = content.match(/\/Type\s*\/Page[^s]/g);
    return matches ? matches.length : 1;
  }
}
