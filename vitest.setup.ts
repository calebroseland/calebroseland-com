import { afterEach, beforeEach, vi } from 'vitest';

// Console-error gate: unexpected console.error or console.warn fails the test.
// Tests that expect a warning call `vi.spyOn(console, "warn").mockImplementation(() => {})` themselves.
let errorSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error');
  warnSpy = vi.spyOn(console, 'warn');
});

afterEach(() => {
  const errors = errorSpy.mock.calls;
  const warns = warnSpy.mock.calls;
  errorSpy.mockRestore();
  warnSpy.mockRestore();
  if (errors.length > 0) {
    throw new Error(`Unexpected console.error:\n${errors.map(String).join('\n')}`);
  }
  if (warns.length > 0) {
    throw new Error(`Unexpected console.warn:\n${warns.map(String).join('\n')}`);
  }
});
