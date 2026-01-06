import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null = null;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not configured, email sending disabled');
    } else {
      this.resend = new Resend(apiKey);
    }
    this.from =
      this.configService.get<string>('EMAIL_FROM') ||
      'Memory <noreply@memory.dev>';
  }

  /**
   * 发送自定义邮件
   */
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn(`Email service not configured, skipping email to ${to}`);
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}, subject: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error}`);
      throw error;
    }
  }

  /**
   * 发送验证码邮件
   */
  async sendOTP(email: string, otp: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn(`Email service not configured, skipping OTP to ${email}`);
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: 'Your Verification Code',
        html: `
          <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; margin-bottom: 20px;">Verification Code</h2>
            <p style="color: #666; margin-bottom: 20px;">Your verification code is:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${otp}</span>
            </div>
            <p style="color: #999; font-size: 14px;">This code will expire in 5 minutes.</p>
            <p style="color: #999; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
          </div>
        `,
      });
      this.logger.log(`OTP email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email: ${error}`);
      throw error;
    }
  }
}
