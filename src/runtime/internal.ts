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

export const repr = (
  value: AiScriptValue,
  literalLike = false,
  seen = new Set<AiScriptValue>(),
): string => {
  if (value === null) return "null";

  switch (typeof value) {
    case "boolean":
    case "number":
      return value.toString();
    case "string": {
      if (literalLike) {
        const escapedContent = value.replace(/["\\\r\n]/g, char => `\\${char}`);
        return `"${escapedContent}"`;
      }
      return value;
    }
    case "function":
      return "@(?) { ? }";
    case "object": {
      if (seen.has(value)) return "...";
      seen.add(value);

      if (Array.isArray(value)) {
        const elements = value.map(element => repr(element, true, seen));
        return `[ ${elements.join(", ")} ]`;
      }

      if (value instanceof Map) {
        const entries = [...value].map(
          ([key, val]) => `${key}: ${repr(val, true, seen)}`,
        );
        return `{ ${entries.join(", ")} }`;
      }

      return "?";
    }
    default:
      return "?";
  }
};
