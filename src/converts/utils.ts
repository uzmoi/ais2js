import { builders as b, type namedTypes as n } from "ast-types";
import type * as K from "ast-types/gen/kinds";
import type { internals } from "../runtime/internal";
import type { Ref } from "./expression";

export type CodeGenerator = Generator<K.StatementKind, K.ExpressionKind | null>;

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

type InternalName = keyof typeof internals;

export const callInternal = (name: InternalName, args: K.ExpressionKind[]) =>
  b.callExpression(b.identifier(name), args);

type AiScriptTypeName<A = InternalName> = A extends `assert_${infer T}`
  ? T
  : never;

export const createAssertion = (type: AiScriptTypeName, ref: Ref) =>
  b.expressionStatement(callInternal(`assert_${type}`, [ref]));
