import type { AiScriptValue } from "../internal";
import { stdCore } from "./core";
import { stdDate } from "./date";
import { stdMath } from "./math";
import { stdArr, stdError, stdNum, stdObj, stdStr } from "./value";

export const stdPresetBase = (): Record<string, AiScriptValue> => ({
  ...stdCore(),

  ...stdNum(),
  ...stdStr(),
  ...stdObj(),
  ...stdArr(),
  ...stdError(),

  ...stdMath(),
  ...stdDate(),
});
