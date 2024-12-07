import type { Ast } from "@syuilo/aiscript";
import { builders as b, type namedTypes as n } from "ast-types";
import type * as K from "ast-types/gen/kinds";
import type { Context } from "../context";
import type { Scope } from "../scope";
import { generateStatement } from "./statement";

export const createProgram = (
  nodes: Ast.Node[],
  scope: Scope,
  ctx: Context,
): n.Program => b.program([...generateToplevel(nodes, scope, ctx)]);

export function* generateToplevel(
  nodes: Ast.Node[],
  scope: Scope,
  ctx: Context,
): Generator<K.StatementKind, void> {
  for (const node of nodes) {
    if (node.type === "ns") {
      yield* generateToplevel(node.members, scope.ns(node.name), ctx);
    }
  }

  for (const node of nodes) {
    if (node.type === "ns" || node.type === "meta") continue;

    const expression = yield* generateStatement(
      node as Ast.Statement | Ast.Expression,
      scope,
      ctx,
    );
    if (expression != null) {
      yield b.expressionStatement(expression);
    }
  }
}
