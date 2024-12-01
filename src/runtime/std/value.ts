import {
  type AiScriptValue,
  assertArrayOf,
  assertNumber,
  assertObject,
  assertString,
  error,
} from "../internal/types";

export const stdNum = (): Record<string, AiScriptValue> => ({
  "Num:from_hex"(value) {
    assertString(value);
    return Number.parseInt(value, 16);
  },
});

export const stdStr = (): Record<string, AiScriptValue> => {
  const textDecoder = new TextDecoder();
  return {
    "Str:lf": "\n",
    "Str:lt"(a, b) {
      assertString(a);
      assertString(b);
      if (a < b) return -1;
      if (a === b) return 0;
      return 1;
    },
    "Str:gt"(a, b) {
      assertString(a);
      assertString(b);
      if (a > b) return -1;
      if (a === b) return 0;
      return 1;
    },
    "Str:from_codepoint"(codePoint) {
      assertNumber(codePoint);
      return String.fromCodePoint(codePoint);
    },
    "Str:from_unicode_codepoints"(codePoints) {
      assertArrayOf(codePoints, assertNumber);
      return String.fromCodePoint(...codePoints);
    },
    "Str:from_utf8_bytes"(bytes) {
      assertArrayOf(bytes, assertNumber);
      return textDecoder.decode(Uint8Array.from(bytes));
    },
  };
};

export const stdArr = (): Record<string, AiScriptValue> => ({
  "Arr:create"(length, initial = null) {
    assertNumber(length);
    if (length < 0) {
      throw new Error("Arr:create expected non-negative number, got negative");
    }
    if (!Number.isInteger(length)) {
      throw new Error("Arr:create expected integer, got non-integer");
    }
    return Array.from<AiScriptValue>({ length }).fill(initial);
  },
});

export const stdObj = (): Record<string, AiScriptValue> => ({
  "Obj:keys"(object) {
    assertObject(object);
    return Array.from(object.keys());
  },
  "Obj:vals"(object) {
    assertObject(object);
    return Array.from(object.values());
  },
  "Obj:kvs"(object) {
    assertObject(object);
    return Array.from(object.entries());
  },
  "Obj:get"(object, key) {
    assertObject(object);
    assertString(key);
    return object.get(key) ?? null;
  },
  "Obj:set"(object, key, value) {
    assertObject(object);
    assertString(key);
    object.set(key, value);
    return null;
  },
  "Obj:has"(object, key) {
    assertObject(object);
    assertString(key);
    return object.has(key);
  },
  "Obj:copy"(object) {
    assertObject(object);
    return new Map(object);
  },
  "Obj:merge"(a, b) {
    assertObject(a);
    assertObject(b);
    return new Map([...a, ...b]);
  },
});

export const stdError = (): Record<string, AiScriptValue> => ({
  "Error:create"(name, info) {
    assertString(name);
    return error(name, info);
  },
});
