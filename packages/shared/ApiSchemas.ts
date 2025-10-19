import { z } from 'zod';

export const ImportMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  model: z.string().optional(),
  timestamp: z.string().optional(),
  metadata: z.object({
    // 外部URLだけでなく data: や blob: も許容
    imageUrls: z.array(z.string().min(1)).optional(),
    imageDataUrls: z.array(z.string().min(1)).optional(),
  }).passthrough().optional(),
});

export const ImportBodySchema = z.object({
  threadId: z.string().min(1),
  title: z.string().min(1),
  model: z.string().optional(),
  messages: z.array(ImportMessageSchema).min(1),
  createdAt: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  userName: z.string().optional(),
  chatTitle: z.string().optional(),
}).passthrough();

export type ImportBody = z.infer<typeof ImportBodySchema>;


