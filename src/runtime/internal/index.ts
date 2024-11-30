import { getIndex, getProp, setIndex, setProp } from "./accessor";
import { repr } from "./repr";
import {
  type AiScriptValue,
  assertArray,
  assertBoolean,
  assertFn,
  assertNumber,
} from "./types";

export type { AiScriptValue };

export const internals = {
  repr: (value: AiScriptValue) => repr(value),
  get_prop: getProp,
  set_prop: setProp,
  get_index: getIndex,
  set_index: setIndex,
  assert_boolean: assertBoolean,
  assert_number: assertNumber,
  assert_array: assertArray,
  assert_function: assertFn,
} as const satisfies Record<string, (...args: never[]) => void>;
