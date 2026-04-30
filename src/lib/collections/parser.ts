import yaml from 'js-yaml';
import { collectionSchema, type CollectionInput } from './schema';

export type CollectionFormat = 'yaml' | 'json';

export interface ParseResult {
  format: CollectionFormat;
  data: CollectionInput;
}

export function detectFormat(source: string): CollectionFormat {
  const trimmed = source.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  return 'yaml';
}

export function parseCollection(source: string, format?: CollectionFormat): ParseResult {
  const fmt = format ?? detectFormat(source);
  let raw: unknown;
  if (fmt === 'json') {
    raw = JSON.parse(source);
  } else {
    raw = yaml.load(source);
  }
  const data = collectionSchema.parse(raw);
  return { format: fmt, data };
}
