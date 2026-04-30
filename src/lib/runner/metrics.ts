export function now(): number {
  return Date.now();
}

export function elapsedMs(start: number): number {
  return Math.max(0, Date.now() - start);
}
