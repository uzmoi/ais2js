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
  pos?: [line: number, column: number],
) => asserts value is T;

const printPos = (pos: [line: number, column: number] | undefined) =>
  pos?.join(":") ?? "<internal>";

export const assertBoolean: AssertFunction<number> = (value, pos) => {
  if (typeof value !== "boolean") {
    throw new Error(`Expect bool at ${printPos(pos)}`);
  }
};

export const assertNumber: AssertFunction<number> = (value, pos) => {
  if (typeof value !== "number") {
    throw new Error(`Expect num at ${printPos(pos)}`);
  }
};

export const assertString: AssertFunction<string> = (value, pos) => {
  if (typeof value !== "string") {
    throw new Error(`Expect str at ${printPos(pos)}`);
  }
};

export const assertArray: AssertFunction<AiScriptValue[]> = (value, pos) => {
  if (!Array.isArray(value)) {
    throw new Error(`Expect arr at ${printPos(pos)}`);
  }
};

export const assertArrayOf: <T extends AiScriptValue>(
  value: AiScriptValue,
  assert: (value: AiScriptValue) => asserts value is T,
  pos?: [line: number, column: number],
) => asserts value is T[] = <T extends AiScriptValue>(
  value: AiScriptValue,
  assert: (value: AiScriptValue) => asserts value is T,
  pos?: [line: number, column: number],
) => {
  assertArray(value, pos);
  for (const element of value) {
    assert(element);
  }
};

export const assertObject: AssertFunction<Map<string, AiScriptValue>> = (
  value,
  pos,
) => {
  if (!(value instanceof Map)) {
    throw new Error(`Expect obj at ${printPos(pos)}`);
  }
};

export const assertFn: AssertFunction<Extract<AiScriptValue, () => unknown>> = (
  value,
  pos,
) => {
  if (typeof value !== "function") {
    throw new Error(`Expect fn at ${printPos(pos)}`);
  }
};
