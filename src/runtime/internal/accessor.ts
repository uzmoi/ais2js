import { repr } from "./repr";
import {
  type AiScriptValue,
  assertNumber,
  assertObject,
  assertString,
  typeOf,
} from "./types";

type Pos = [line: number, column: number];

export const getProp = (
  target: AiScriptValue,
  name: string,
  pos: Pos,
): AiScriptValue => {
  if (target instanceof Map) {
    return target.get(name) ?? null;
  }

  return builtinProperty(target, name, pos);
};

export const setProp = (
  target: AiScriptValue,
  name: string,
  value: AiScriptValue,
  pos: Pos,
): void => {
  assertObject(target, pos);

  target.set(name, value);
};

export const getIndex = (
  target: AiScriptValue,
  index: AiScriptValue,
  pos: Pos,
): AiScriptValue => {
  if (Array.isArray(target)) {
    assertNumber(index, pos);
    if (!(0 <= index && index < target.length)) {
      throw new Error("Index out of range.");
    }
    return target[index]!;
  }

  if (target instanceof Map) {
    assertString(index, pos);
    return target.get(index) ?? null;
  }

  throw new Error(`Cannot read prop (${repr(index)}) of ${typeOf(target)}.`);
};

export const setIndex = (
  target: AiScriptValue,
  index: AiScriptValue,
  value: AiScriptValue,
  pos: Pos,
): void => {
  if (Array.isArray(target)) {
    assertNumber(index, pos);
    if (!(0 <= index && index < target.length)) {
      throw new Error("Index out of range.");
    }
    target[index] = value;
    return;
  }

  if (target instanceof Map) {
    assertString(index, pos);
    target.set(index, value);
    return;
  }

  throw new Error(`Cannot read prop (${repr(index)}) of ${typeOf(target)}.`);
};
