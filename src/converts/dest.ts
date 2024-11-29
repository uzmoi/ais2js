import type { Ast } from "@syuilo/aiscript";
import { builders as b } from "ast-types";
import type * as K from "ast-types/gen/kinds";
import type { Scope } from "../scope";
import { generateExpression, generateRef } from "./expression";
import { callInternal, createThrowError, randId } from "./utils";

export function* generateDefinitionDest(
  node: Ast.Expression,
  init: K.ExpressionKind,
  scope: Scope,
  mut = false,
): Generator<K.StatementKind, void> {
  switch (node.type) {
    case "identifier": {
      const id = b.identifier.from({
        name: scope.define(node.name),
        loc: node.loc,
      });
      yield b.variableDeclaration.from({
        kind: mut ? "let" : "const",
        declarations: [b.variableDeclarator(id, init)],
        loc: node.loc,
      });
      break;
    }
    case "arr": {
      const initRef = b.identifier(`__${randId()}__`);
      yield b.variableDeclaration("const", [
        b.variableDeclarator(initRef, init),
      ]);

      for (const [i, element] of node.value.entries()) {
        const get = callInternal("get_index", [initRef, b.literal(i)]);
        yield* generateDefinitionDest(element, get, scope, mut);
      }

      break;
    }
    case "obj": {
      const initRef = b.identifier(`__${randId()}__`);
      yield b.variableDeclaration("const", [
        b.variableDeclarator(initRef, init),
      ]);

      for (const [key, value] of node.value) {
        const get = callInternal("get_prop", [initRef, b.literal(key)]);
        yield* generateDefinitionDest(value, get, scope, mut);
      }

      break;
    }
    default:
      throw new Error("Invalid dest?");
  }
}

export function* generateAssignDest(
  node: Ast.Expression,
  value: K.ExpressionKind,
  scope: Scope,
): Generator<K.StatementKind, void> {
  switch (node.type) {
    case "identifier": {
      const jsName = scope.ref(node.name);
      if (jsName == null) {
        yield createThrowError(b.literal(`Undefined variable: ${node.name}`));
      } else {
        yield b.expressionStatement(
          b.assignmentExpression.from({
            operator: "=",
            left: b.identifier.from({
              name: jsName,
              loc: node.loc,
            }),
            right: value,
            loc: node.loc,
          }),
        );
      }
      break;
    }
    case "index": {
      const target = yield* generateRef(node.target, scope);
      const index = yield* generateExpression(node.index, scope);
      yield b.expressionStatement(
        callInternal("set_index", [target, index ?? b.literal(null), value]),
      );
      break;
    }
    case "prop": {
      const target = yield* generateExpression(node.target, scope);
      yield b.expressionStatement(
        callInternal("set_prop", [
          target ?? b.literal(null),
          b.literal(node.name),
          value,
        ]),
      );
      break;
    }
    case "arr": {
      const valueRef = b.identifier(`__${randId()}__`);
      yield b.variableDeclaration("const", [
        b.variableDeclarator(valueRef, value),
      ]);

      for (const [i, element] of node.value.entries()) {
        const get = callInternal("get_index", [valueRef, b.literal(i)]);
        yield* generateAssignDest(element, get, scope);
      }
      break;
    }
    case "obj": {
      const valueRef = b.identifier(`__${randId()}__`);
      yield b.variableDeclaration("const", [
        b.variableDeclarator(valueRef, value),
      ]);

      for (const [key, dest] of node.value) {
        const get = callInternal("get_prop", [valueRef, b.literal(key)]);
        yield* generateAssignDest(dest, get, scope);
      }
      break;
    }
    default:
      throw new Error("Invalid dest?");
  }
}
