export type AiScriptValue =
  | null
  | boolean
  | number
  | string
  | AiScriptValue[]
  | Map<string, AiScriptValue>
  | ((...args: AiScriptValue[]) => AiScriptValue | Promise<AiScriptValue>)
  | {
      type: "error";
      name: string;
      info: AiScriptValue | undefined;
    };

export const error = (name: string, info?: AiScriptValue): AiScriptValue => ({
  type: "error",
  name,
  info,
});

export type AiScriptValueTypeName =
  | "null"
  | "bool"
  | "num"
  | "str"
  | "arr"
  | "obj"
  | "fn"
  | "error";

// Core:type
export const typeOf = (value: AiScriptValue): AiScriptValueTypeName => {
  if (value === null) return "null";

  switch (typeof value) {
    case "boolean":
      return "bool";
    case "number":
      return "num";
    case "string":
      return "str";
    case "function":
      return "fn";
    case "object": {
      if (Array.isArray(value)) return "arr";
      if (value instanceof Map) return "obj";
      return value.type;
    }
    default:
      throw new Error("Unknown type.");
  }
};

export type AssertFunction<T extends AiScriptValue> = (
  value: AiScriptValue,
) => asserts value is T;

export const assertBoolean: AssertFunction<number> = value => {
  if (typeof value !== "boolean") {
    throw new Error();
  }
};

export const assertNumber: AssertFunction<number> = value => {
  if (typeof value !== "number") {
    throw new Error();
  }
};

export const assertString: AssertFunction<string> = value => {
  if (typeof value !== "string") {
    throw new Error();
  }
};

export const assertArray: AssertFunction<AiScriptValue[]> = value => {
  if (!Array.isArray(value)) {
    throw new Error();
  }
};

export const assertArrayOf: <T extends AiScriptValue>(
  value: AiScriptValue,
  assert: (value: AiScriptValue) => asserts value is T,
) => asserts value is T[] = <T extends AiScriptValue>(
  value: AiScriptValue,
  assert: (value: AiScriptValue) => asserts value is T,
) => {
  assertArray(value);
  for (const element of value) {
    assert(element);
  }
};

export const assertObject: AssertFunction<
  Map<string, AiScriptValue>
> = value => {
  if (!(value instanceof Map)) {
    throw new Error();
  }
};

export const assertFn: AssertFunction<
  Extract<AiScriptValue, () => unknown>
> = value => {
  if (typeof value !== "function") {
    throw new Error();
  }
};
