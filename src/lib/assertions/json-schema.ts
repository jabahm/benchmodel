import Ajv from 'ajv';
import type { AssertionResult } from './types';

const ajv = new Ajv({ allErrors: true, strict: false });

function extractJson(output: string): unknown {
  try {
    return JSON.parse(output);
  } catch {
    const match = output.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) throw new Error('no json found in output');
    return JSON.parse(match[0]);
  }
}

export function evaluateJsonSchema(
  output: string,
  schema: Record<string, unknown>,
): AssertionResult {
  let data: unknown;
  try {
    data = extractJson(output);
  } catch (err) {
    return {
      type: 'json_schema',
      passed: false,
      message: `output is not valid json: ${(err as Error).message}`,
    };
  }
  try {
    const validate = ajv.compile(schema);
    const passed = validate(data);
    if (passed) return { type: 'json_schema', passed: true };
    const errors = (validate.errors ?? [])
      .map((e) => `${e.instancePath || '/'} ${e.message ?? ''}`.trim())
      .join('; ');
    return { type: 'json_schema', passed: false, message: errors || 'schema validation failed' };
  } catch (err) {
    return {
      type: 'json_schema',
      passed: false,
      message: `schema compile error: ${(err as Error).message}`,
    };
  }
}
