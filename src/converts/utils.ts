import { builders as b, type namedTypes as n } from "ast-types";
import type * as K from "ast-types/gen/kinds";
import type { Ref } from "./expression";

export type CodeGenerator = Iterable<K.StatementKind, K.ExpressionKind | null>;

export const randId = () =>
  Math.random().toString(32).slice(2, 10).padEnd(8, "0").toUpperCase();

export function* flatResult<T, R extends {}>(
  generator: Iterable<T, R | null | undefined>,
  f: (result: R) => T,
): Generator<T> {
  const result = yield* generator;

  if (result != null) {
    yield f(result);
  }
}

export const createBlock = (
  resultIdentifier: n.Identifier,
  result: CodeGenerator,
): n.BlockStatement =>
  b.blockStatement([
    ...flatResult(result, result =>
      b.expressionStatement(
        b.assignmentExpression("=", resultIdentifier, result),
      ),
    ),
  ]);

export const createIife = (body: n.BlockStatement | K.ExpressionKind) =>
  b.callExpression(b.arrowFunctionExpression([], body), []);

export const createThrowError = (message: K.ExpressionKind) =>
  b.throwStatement(b.newExpression(b.identifier("Error"), [message]));

type AiScriptTypeName =
  | "boolean"
  | "number"
  | "string"
  | "array"
  | "object"
  | "function";

export const isA = (type: AiScriptTypeName, identifier: Ref) => {
  switch (type) {
    case "array":
      return b.callExpression(
        b.memberExpression(b.identifier("Array"), b.identifier("isArray")),
        [identifier],
      );
    case "object":
      return b.logicalExpression(
        "&&",
        b.binaryExpression("!=", identifier, b.literal(null)),
        b.binaryExpression(
          "==",
          b.unaryExpression("typeof", identifier, true),
          b.literal("object"),
        ),
      );
    default:
      return b.binaryExpression(
        "==",
        b.unaryExpression("typeof", identifier, true),
        b.literal(type),
      );
  }
};

export const createAssertion = (type: AiScriptTypeName, identifier: Ref) =>
  b.ifStatement(
    b.unaryExpression("!", isA(type, identifier)),
    createThrowError(b.literal(`Expected ${type} type.`)),
  );
