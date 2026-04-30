import { z } from 'zod';

export const assertionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('contains'),
    value: z.string(),
    caseSensitive: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('regex'),
    pattern: z.string(),
    flags: z.string().optional(),
  }),
  z.object({
    type: z.literal('json_schema'),
    schema: z.record(z.unknown()),
  }),
]);

export const promptSchema = z.object({
  name: z.string().min(1),
  system: z.string().optional(),
  user: z.string().min(1),
  variables: z.record(z.string()).optional(),
  assertions: z.array(assertionSchema).optional(),
});

export const collectionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  prompts: z.array(promptSchema).min(1),
});

export type AssertionInput = z.infer<typeof assertionSchema>;
export type PromptInput = z.infer<typeof promptSchema>;
export type CollectionInput = z.infer<typeof collectionSchema>;
