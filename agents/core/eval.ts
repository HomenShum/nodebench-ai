// agents/core/eval.ts
// Lightweight validation helpers (shape/regex/assertions)

export const assertions = {
  assert(condition: any, message = 'Assertion failed'): void {
    if (!condition) throw new Error(message);
  },
  assertIncludes(haystack: string, needle: string): void {
    if (!haystack.includes(needle)) throw new Error(`Expected output to include: ${needle}`);
  },
  matchRegex(text: string, regex: RegExp): void {
    if (!regex.test(text)) throw new Error(`Expected text to match: ${regex}`);
  },
};

