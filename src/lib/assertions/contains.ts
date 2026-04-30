import type { AssertionResult } from './types';

export function evaluateContains(
  output: string,
  value: string,
  caseSensitive = false,
): AssertionResult {
  const haystack = caseSensitive ? output : output.toLowerCase();
  const needle = caseSensitive ? value : value.toLowerCase();
  const passed = haystack.includes(needle);
  return {
    type: 'contains',
    passed,
    message: passed ? undefined : `output does not contain "${value}"`,
  };
}
