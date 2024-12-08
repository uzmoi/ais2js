import { type AiScriptValue, assertFn } from "./types";

export const call = async (
  callee: AiScriptValue,
  args: AiScriptValue[],
  pos: [line: number, column: number],
): Promise<AiScriptValue> => {
  assertFn(callee, pos);

  // TODO: callStack
  return await callee(...args);
};
