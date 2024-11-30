import { type AiScriptValue, assertFn } from "./types";

export const call = async (
  callee: AiScriptValue,
  args: AiScriptValue[],
): Promise<AiScriptValue> => {
  assertFn(callee);

  // TODO: callStack
  return await callee(...args);
};
