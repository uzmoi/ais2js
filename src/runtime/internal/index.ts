import { getIndex, getProp, setIndex, setProp } from "./accessor";
import { call } from "./call";
import { internalError } from "./error";
import { repr } from "./repr";
import {
  type AiScriptValue,
  assertArray,
  assertBoolean,
  assertNumber,
} from "./types";

export type { AiScriptValue };

export const internals = new (
  Map as new <T extends readonly [string, (...args: never[]) => void]>(
    entries: readonly T[],
  ) => ReadonlyMap<T[0], T[1]>
)([
  ["repr", (value: AiScriptValue) => repr(value)],
  ["call", call],
  ["get_prop", getProp],
  ["set_prop", setProp],
  ["get_index", getIndex],
  ["set_index", setIndex],
  ["internal_error", internalError],
  ["assert_boolean", assertBoolean],
  ["assert_number", assertNumber],
  ["assert_array", assertArray],
] as const);
