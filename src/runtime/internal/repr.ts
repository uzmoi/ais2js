import type { AiScriptValue } from "./types";

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
