import { z } from 'zod';

export const startEmailSignUpSchema = z.object({
  email: z.string().trim().email('Email is invalid'),
});

export const verifyEmailSignUpOTPSchema = z.object({
  email: z.string().trim().email('Email is invalid'),
  otp: z.string().trim().length(6, 'OTP must be 6 digits'),
});

export const completeEmailSignUpSchema = z.object({
  signupToken: z.string().trim().min(1, 'Signup token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type StartEmailSignUpDto = z.infer<typeof startEmailSignUpSchema>;
export type VerifyEmailSignUpOTPDto = z.infer<
  typeof verifyEmailSignUpOTPSchema
>;
export type CompleteEmailSignUpDto = z.infer<typeof completeEmailSignUpSchema>;
