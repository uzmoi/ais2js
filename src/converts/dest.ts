import type { Ast } from "@syuilo/aiscript";
import { builders as b } from "ast-types";
import type * as K from "ast-types/gen/kinds";
import type { Context } from "../context";
import type { Scope } from "../scope";
import { generateExpression, generateRef } from "./expression";
import { callInternal, internalError, loc } from "./utils";

export function* generateDefinitionDest(
  node: Ast.Expression,
  init: K.ExpressionKind,
  scope: Scope,
  mutable = false,
): Generator<K.StatementKind, void> {
  switch (node.type) {
    case "identifier": {
      const id = b.identifier.from({
        name: scope.define(node.name, { mutable }),
        loc: node.loc,
      });
      yield b.variableDeclaration(mutable ? "let" : "const", [
        b.variableDeclarator(id, init),
      ]);
      break;
    }
    case "arr": {
      const initRef = b.identifier(scope.newId("__dest__"));
      yield b.variableDeclaration("const", [
        b.variableDeclarator(initRef, init),
      ]);

      for (const [i, element] of node.value.entries()) {
        const get = callInternal("get_index", [
          initRef,
          b.literal(i),
          loc(element),
        ]);
        yield* generateDefinitionDest(element, get, scope, mutable);
      }

      break;
    }
    case "obj": {
      const initRef = b.identifier(scope.newId("__dest__"));
      yield b.variableDeclaration("const", [
        b.variableDeclarator(initRef, init),
      ]);

      for (const [key, value] of node.value) {
        const get = callInternal("get_prop", [
          initRef,
          b.literal(key),
          loc(value), // FIXME: keyのlocを使う
        ]);
        yield* generateDefinitionDest(value, get, scope, mutable);
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
  ctx: Context,
): Generator<K.StatementKind, void> {
  switch (node.type) {
    case "identifier": {
      const entry = scope.ref(node.name);
      if (entry == null) {
        yield internalError("not_defined", b.literal(node.name), node);
      } else if (entry.mutable) {
        const identifier = b.identifier.from({
          name: entry.jsName,
          loc: node.loc,
        });
        yield b.expressionStatement(
          b.assignmentExpression("=", identifier, value),
        );
      } else {
        yield internalError("immutable_variable", b.literal(node.name), node);
      }
      break;
    }
    case "index": {
      const target = yield* generateRef(node.target, scope, ctx);
      const index = yield* generateExpression(node.index, scope, ctx);
      yield b.expressionStatement(
        callInternal("set_index", [target, index, value, loc(node)]),
      );
      break;
    }
    case "prop": {
      const target = yield* generateExpression(node.target, scope, ctx);
      const name = b.literal(node.name);
      yield b.expressionStatement(
        callInternal("set_prop", [target, name, value, loc(node)]),
      );
      break;
    }
    case "arr": {
      const valueRef = b.identifier(scope.newId("__dest__"));
      yield b.variableDeclaration("const", [
        b.variableDeclarator(valueRef, value),
      ]);

      for (const [i, element] of node.value.entries()) {
        const get = callInternal("get_index", [
          valueRef,
          b.literal(i),
          loc(element),
        ]);
        yield* generateAssignDest(element, get, scope, ctx);
      }
      break;
    }
    case "obj": {
      const valueRef = b.identifier(scope.newId("__dest__"));
      yield b.variableDeclaration("const", [
        b.variableDeclarator(valueRef, value),
      ]);

      for (const [key, dest] of node.value) {
        const get = callInternal("get_prop", [
          valueRef,
          b.literal(key),
          loc(dest), // FIXME: keyのlocを使う
        ]);
        yield* generateAssignDest(dest, get, scope, ctx);
      }
      break;
    }
    default:
      throw new Error("Invalid dest?");
  }
}
