import type { Assertion, AssertionResult } from './types';
import { evaluateContains } from './contains';
import { evaluateRegex } from './regex';
import { evaluateJsonSchema } from './json-schema';

export function evaluateAssertion(output: string, assertion: Assertion): AssertionResult {
  switch (assertion.type) {
    case 'contains':
      return evaluateContains(output, assertion.value, assertion.caseSensitive);
    case 'regex':
      return evaluateRegex(output, assertion.pattern, assertion.flags);
    case 'json_schema':
      return evaluateJsonSchema(output, assertion.schema);
    default: {
      const exhaustive: never = assertion;
      throw new Error(`unknown assertion type: ${String(exhaustive)}`);
    }
  }
}

export function evaluateAll(output: string, assertions: Assertion[] | undefined): {
  passed: boolean;
  results: AssertionResult[];
} {
  if (!assertions || assertions.length === 0) return { passed: true, results: [] };
  const results = assertions.map((a) => evaluateAssertion(output, a));
  const passed = results.every((r) => r.passed);
  return { passed, results };
}

export type { Assertion, AssertionResult };
