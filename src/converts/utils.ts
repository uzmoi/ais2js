import { builders as b, type namedTypes as n } from "ast-types";
import type * as K from "ast-types/gen/kinds";
import type { Ref } from "./expression";

export type CodeGenerator = Iterable<K.StatementKind, K.ExpressionKind | null>;

export const randId = () =>
  Math.random().toString(32).slice(2, 10).padEnd(8, "0").toUpperCase();

function* flatResult<T, R extends {}>(
  generator: Iterable<T, R | null | undefined>,
  f: (result: R) => T,
): Generator<T, void> {
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

export type InternalName =
  | "repr"
  | "get_prop"
  | "set_prop"
  | "get_index"
  | "set_index"
  | `assert_${AiScriptTypeName}`;

export const callInternal = (name: InternalName, args: K.ExpressionKind[]) =>
  b.callExpression(b.identifier(`__${name}`), args);

type AiScriptTypeName =
  | "boolean"
  | "number"
  | "string"
  | "array"
  | "object"
  | "function";

export const createAssertion = (type: AiScriptTypeName, ref: Ref) =>
  b.expressionStatement(callInternal(`assert_${type}`, [ref]));
