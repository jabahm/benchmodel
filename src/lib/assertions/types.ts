import type { AssertionInput } from '../collections/schema';

export type Assertion = AssertionInput;

export interface AssertionResult {
  type: Assertion['type'];
  passed: boolean;
  message?: string;
}
