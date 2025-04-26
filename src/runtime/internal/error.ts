export type ErrorCode = "not_defined" | "immutable_variable";

export const internalError = (
  code: ErrorCode,
  _options: unknown,
  pos: [number, number],
) => {
  throw new Error(`${code} at ${pos.join(":")}`);
};
