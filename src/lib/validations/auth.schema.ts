import { z } from 'zod';
import { SPECIAL_CHAR_REGEX } from './password-requirements';

export const passwordComplexitySchema = z
  .string()
  .min(8, 'Password must be at least 8 characters in length')
  .max(100, 'Password cannot exceed 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter (A–Z)')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter (a–z)')
  .regex(/[0-9]/, 'Password must contain at least one number (0–9)')
  .regex(SPECIAL_CHAR_REGEX, 'Password must contain at least one special character (!@#$%^&*)');

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name cannot exceed 100 characters')
    .optional(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address')
    .max(255, 'Email cannot exceed 255 characters'),
  password: passwordComplexitySchema,
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address')
    .max(255, 'Email cannot exceed 255 characters'),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password cannot exceed 128 characters'),
});

export const passwordResetRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(16, 'Invalid or missing reset token'),
  newPassword: passwordComplexitySchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
