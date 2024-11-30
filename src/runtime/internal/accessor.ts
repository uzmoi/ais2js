import { repr } from "./repr";
import {
  type AiScriptValue,
  assertNumber,
  assertObject,
  assertString,
  typeOf,
} from "./types";

export const getProp = (target: AiScriptValue, name: string): AiScriptValue => {
  if (target instanceof Map) {
    return target.get(name) ?? null;
  }

  return builtinProperty(target, name);
};

export const setProp = (
  target: AiScriptValue,
  name: string,
  value: AiScriptValue,
): void => {
  assertObject(target);

  target.set(name, value);
};

export const getIndex = (
  target: AiScriptValue,
  index: AiScriptValue,
): AiScriptValue => {
  if (Array.isArray(target)) {
    assertNumber(index);
    if (!(0 <= index && index < target.length)) {
      throw new Error("Index out of range.");
    }
    return target[index]!;
  }

  if (target instanceof Map) {
    assertString(index);
    return target.get(index) ?? null;
  }

  throw new Error(`Cannot read prop (${repr(index)}) of ${typeOf(target)}.`);
};

export const setIndex = (
  target: AiScriptValue,
  index: AiScriptValue,
  value: AiScriptValue,
): void => {
  if (Array.isArray(target)) {
    assertNumber(index);
    if (!(0 <= index && index < target.length)) {
      throw new Error("Index out of range.");
    }
    target[index] = value;
    return;
  }

  if (target instanceof Map) {
    assertString(index);
    target.set(index, value);
    return;
  }

  throw new Error(`Cannot read prop (${repr(index)}) of ${typeOf(target)}.`);
};
