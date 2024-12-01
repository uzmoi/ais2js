import { AISCRIPT_VERSION } from "@syuilo/aiscript";
import type { AiScriptValue } from "../internal";
import { repr } from "../internal/repr";
import { assertNumber, assertString, typeOf } from "../internal/types";

export const stdCore = (): Record<string, AiScriptValue> => ({
  "Core:v": AISCRIPT_VERSION,
  // cspell:word kawaii
  "Core:ai": "kawaii",
  "Core:type": typeOf,
  "Core:to_str": value => repr(value),
  "Core:range"(a, b) {
    assertNumber(a);
    assertNumber(b);
    if (a < b) {
      return Array.from({ length: b - a + 1 }, (_, i) => i + a);
    }
    if (a > b) {
      return Array.from({ length: a - b + 1 }, (_, i) => a - i);
    }
    return [a];
  },
  async "Core:sleep"(delay) {
    assertNumber(delay);
    await new Promise(resolve => setTimeout(resolve, delay));
    return null;
  },
  "Core:abort"(message) {
    assertString(message);
    throw new Error(message);
  },
});
