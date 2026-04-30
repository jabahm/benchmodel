import type { AssertionResult } from './types';

export function evaluateRegex(output: string, pattern: string, flags?: string): AssertionResult {
  try {
    const re = new RegExp(pattern, flags);
    const passed = re.test(output);
    return {
      type: 'regex',
      passed,
      message: passed ? undefined : `output does not match /${pattern}/${flags ?? ''}`,
    };
  } catch (err) {
    return {
      type: 'regex',
      passed: false,
      message: `invalid regex: ${(err as Error).message}`,
    };
  }
}
