import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Username can only contain letters, numbers, and underscores'
    ),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const githubAuthSchema = z.object({
  code: z.string().min(1, 'GitHub authorization code is required'),
});

export const webhookConfigSchema = z.object({
  defaultBranch: z.string().min(1, 'Default branch is required').max(50, 'Branch name too long'),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GithubAuthInput = z.infer<typeof githubAuthSchema>;
export type WebhookConfigInput = z.infer<typeof webhookConfigSchema>;
