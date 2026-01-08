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

const githubRepoRegex = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export const createProjectSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(50),
  description: z.string().max(500).optional(),
  githubRepo: z
    .string()
    .regex(githubRepoRegex, 'Invalid GitHub repository format'),
  deploymentProvider: z.enum(['cloudflare', 'netlify']),
});

export const updateProjectSchema = z
  .object({
    name: z.string().min(3, 'Name must be at least 3 characters').max(50).optional(),
    description: z.string().max(500).optional(),
  })
  .strict();

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GithubAuthInput = z.infer<typeof githubAuthSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
