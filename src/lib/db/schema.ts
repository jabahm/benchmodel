import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const providers = sqliteTable('providers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type', { enum: ['ollama', 'openai_compat'] }).notNull(),
  baseUrl: text('base_url').notNull(),
  apiKeyEncrypted: text('api_key_encrypted'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const collections = sqliteTable('collections', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  format: text('format', { enum: ['yaml', 'json'] }).notNull(),
  sourcePath: text('source_path'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const prompts = sqliteTable('prompts', {
  id: text('id').primaryKey(),
  collectionId: text('collection_id')
    .notNull()
    .references(() => collections.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  systemPrompt: text('system_prompt'),
  userPrompt: text('user_prompt').notNull(),
  variablesJson: text('variables_json'),
  assertionsJson: text('assertions_json'),
  defaultProviderId: text('default_provider_id'),
  defaultModel: text('default_model'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const runs = sqliteTable('runs', {
  id: text('id').primaryKey(),
  promptId: text('prompt_id')
    .notNull()
    .references(() => prompts.id, { onDelete: 'cascade' }),
  providerId: text('provider_id')
    .notNull()
    .references(() => providers.id, { onDelete: 'cascade' }),
  modelName: text('model_name').notNull(),
  paramsJson: text('params_json'),
  output: text('output'),
  latencyMs: integer('latency_ms'),
  promptTokens: integer('prompt_tokens'),
  completionTokens: integer('completion_tokens'),
  costEstimate: real('cost_estimate'),
  assertionsPassed: integer('assertions_passed', { mode: 'boolean' }),
  assertionsResultJson: text('assertions_result_json'),
  seed: integer('seed'),
  compareSessionId: text('compare_session_id'),
  errorMessage: text('error_message'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const compareSessions = sqliteTable('compare_sessions', {
  id: text('id').primaryKey(),
  promptId: text('prompt_id')
    .notNull()
    .references(() => prompts.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;
export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;
export type Prompt = typeof prompts.$inferSelect;
export type NewPrompt = typeof prompts.$inferInsert;
export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;
export type CompareSession = typeof compareSessions.$inferSelect;
export type NewCompareSession = typeof compareSessions.$inferInsert;
