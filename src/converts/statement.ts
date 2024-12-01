import type { Ast } from "@syuilo/aiscript";
import { builders as b } from "ast-types";
import type * as K from "ast-types/gen/kinds";
import type { Context } from "../context";
import type { Scope } from "../scope";
import { generateAssignDest, generateDefinitionDest } from "./dest";
import { generateExpression, generateRef } from "./expression";
import {
  type CodeGenerator,
  callInternal,
  createAssertion,
  createThrowError,
} from "./utils";

export function* generateStatementList(
  statements: (Ast.Statement | Ast.Expression)[],
  scope: Scope,
  ctx: Context,
): CodeGenerator {
  for (const statement of statements.slice(0, -1)) {
    const expression = yield* generateStatement(statement, scope, ctx);
    if (expression != null) {
      yield b.expressionStatement(expression);
    }
  }

  const last = statements.at(-1);
  if (last) {
    const expression = yield* generateStatement(last, scope, ctx);
    if (expression != null) {
      const result = b.identifier(scope.newId("__run_result__"));
      yield b.variableDeclaration("const", [
        b.variableDeclarator(result, expression),
      ]);
      return result;
    }
  }

  return null;
}

export function* generateStatement(
  node: Ast.Statement | Ast.Expression,
  scope: Scope,
  ctx: Context,
): CodeGenerator {
  switch (node.type) {
    case "def":
      yield* generateDefinitionDest(
        node.dest,
        (yield* generateExpression(node.expr, scope, ctx)) ?? b.literal(null),
        scope,
        node.mut,
      );
      break;
    case "assign":
    case "addAssign":
    case "subAssign":
      yield* generateAssign(node, scope, ctx);
      break;
    case "return":
      yield b.returnStatement.from({
        argument: yield* generateExpression(node.expr, scope, ctx),
        loc: node.loc,
      });
      break;
    case "each":
      yield* generateEach(node, scope, ctx);
      break;
    case "for":
      yield* generateFor(node, scope, ctx);
      break;
    case "loop":
      yield b.whileStatement.from({
        test: b.literal(true),
        body: b.blockStatement([
          ...generateStatementList(node.statements, scope.child(), ctx),
        ]),
        loc: node.loc,
      });
      break;
    case "break":
      yield b.breakStatement.from({ loc: node.loc });
      break;
    case "continue":
      yield b.continueStatement.from({ loc: node.loc });
      break;
    default: {
      return yield* generateExpression(node, scope, ctx);
    }
  }

  return null;
}

function* generateAssign(
  node: Ast.Assign | Ast.AddAssign | Ast.SubAssign,
  scope: Scope,
  ctx: Context,
): Generator<K.StatementKind, void> {
  const right =
    (yield* generateExpression(node.expr, scope, ctx)) ?? b.literal(null);

  if (node.type === "assign") {
    yield* generateAssignDest(node.dest, right, scope, ctx);
  } else {
    const operator = node.type === "addAssign" ? "+" : "-";

    switch (node.dest.type) {
      case "identifier": {
        const jsName = scope.ref(node.dest.name);
        if (jsName == null) {
          yield createThrowError(
            b.literal(`Undefined variable: ${node.dest.name}`),
          );
        } else {
          yield b.expressionStatement(
            b.assignmentExpression.from({
              operator: `${operator}=`,
              left: b.identifier.from({
                name: jsName,
                loc: node.dest.loc,
              }),
              right,
              loc: node.loc,
            }),
          );
        }
        break;
      }
      case "index": {
        const target = yield* generateRef(node.dest.target, scope, ctx);
        const index = yield* generateRef(node.dest.index, scope, ctx);

        const get = callInternal("get_index", [target, index]);
        const newValue = b.binaryExpression(operator, get, right);
        yield b.expressionStatement(
          callInternal("set_index", [target, index, newValue]),
        );
        break;
      }
      case "prop": {
        const target = yield* generateRef(node.dest.target, scope, ctx);
        const name = b.literal(node.dest.name);

        const get = callInternal("get_prop", [target, name]);
        const newValue = b.binaryExpression(operator, get, right);
        yield b.expressionStatement(
          callInternal("set_prop", [target, name, newValue]),
        );
        break;
      }
      case "arr":
      case "obj": {
        yield createThrowError(b.literal(`Invalid dest: ${node.dest.type}`));
        break;
      }
      default:
        throw new Error("Invalid dest?");
    }
  }
}

function* generateEach(
  node: Ast.Each,
  scope: Scope,
  ctx: Context,
): Generator<K.StatementKind, void> {
  const items = yield* generateRef(node.items, scope, ctx);
  yield createAssertion("array", items);

  const element = b.identifier(scope.newId("__each_element__"));

  const eachScope = scope.child();

  yield b.forOfStatement.from({
    left: b.variableDeclaration("const", [b.variableDeclarator(element)]),
    right: items,
    body: b.blockStatement([
      ...generateDefinitionDest(node.var!, element, eachScope),
      ...generateStatement(node.for, eachScope, ctx),
    ]),
    loc: node.loc,
  });
}

function* generateFor(
  node: Ast.For,
  scope: Scope,
  ctx: Context,
): Generator<K.StatementKind, void> {
  if (node.times) {
    const times = yield* generateRef(node.times, scope, ctx);
    yield createAssertion("number", times);

    const index = b.identifier(scope.newId("__for_index__"));

    yield b.forStatement.from({
      init: b.variableDeclaration("let", [
        b.variableDeclarator(index, b.literal(0)),
      ]),
      test: b.binaryExpression("<", index, times),
      update: b.updateExpression("++", index, false),
      body: b.blockStatement([...generateStatement(node.for, scope, ctx)]),
    });
  } else {
    const from = yield* generateRef(node.from!, scope, ctx);
    const to = yield* generateRef(node.to!, scope, ctx);

    yield createAssertion("number", from);
    yield createAssertion("number", to);

    const forScope = scope.child();
    const jsName = forScope.define(node.var!);

    const index = b.identifier(jsName);

    yield b.forStatement.from({
      init: b.variableDeclaration("let", [b.variableDeclarator(index, from)]),
      test: b.binaryExpression("<", index, b.binaryExpression("+", from, to)),
      update: b.updateExpression("++", index, false),
      body: b.blockStatement([...generateStatement(node.for, forScope, ctx)]),
    });
  }
}
