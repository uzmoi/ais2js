import type { Ast } from "@syuilo/aiscript";
import { builders as b } from "ast-types";
import type * as K from "ast-types/gen/kinds";
import type { Scope } from "../scope";
import { generateRef } from "./expression";
import { createThrowError, randId } from "./utils";

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
        yield* generateDefinitionDest(
          element,
          b.callExpression(b.identifier("getIndex_internal"), [
            initRef,
            b.literal(i),
          ]),
          scope,
          mut,
        );
      }

      break;
    }
    case "obj": {
      const initRef = b.identifier(`__${randId()}__`);
      yield b.variableDeclaration("const", [
        b.variableDeclarator(initRef, init),
      ]);

      for (const [key, value] of node.value) {
        yield* generateDefinitionDest(
          value,
          b.callExpression(b.identifier("getProp"), [initRef, b.literal(key)]),
          scope,
          mut,
        );
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
      const index = yield* generateRef(node.index, scope);

      yield b.expressionStatement(
        b.callExpression(b.identifier("setIndex"), [target, index, value]),
      );
      break;
    }
    case "prop": {
      const target = yield* generateRef(node.target, scope);
      const name = b.literal(node.name);

      yield b.expressionStatement(
        b.callExpression(b.identifier("setProp"), [target, name, value]),
      );
      break;
    }
    case "arr": {
      const valueRef = b.identifier(`__${randId()}__`);
      yield b.variableDeclaration("const", [
        b.variableDeclarator(valueRef, value),
      ]);

      for (const [i, element] of node.value.entries()) {
        yield* generateAssignDest(
          element,
          b.callExpression(b.identifier("getIndex_internal"), [
            valueRef,
            b.literal(i),
          ]),
          scope,
        );
      }
      break;
    }
    case "obj": {
      const valueRef = b.identifier(`__${randId()}__`);
      yield b.variableDeclaration("const", [
        b.variableDeclarator(valueRef, value),
      ]);

      for (const [key, dest] of node.value) {
        yield* generateAssignDest(
          dest,
          b.callExpression(b.identifier("getProp"), [valueRef, b.literal(key)]),
          scope,
        );
      }
      break;
    }
    default:
      throw new Error("Invalid dest?");
  }
}
