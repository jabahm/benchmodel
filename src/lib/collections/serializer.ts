import yaml from 'js-yaml';
import type { CollectionInput } from './schema';
import type { CollectionFormat } from './parser';

export function serializeCollection(data: CollectionInput, format: CollectionFormat): string {
  if (format === 'json') return JSON.stringify(data, null, 2);
  return yaml.dump(data, { lineWidth: 100, noRefs: true });
}
