import type { Ast } from "@syuilo/aiscript";
import { builders as b } from "ast-types";
import type * as K from "ast-types/gen/kinds";
import type { Scope } from "../scope";
import { generateAssignDest, generateDefinitionDest } from "./dest";
import { generateExpression, generateRef } from "./expression";
import {
  type CodeGenerator,
  callInternal,
  createAssertion,
  createThrowError,
  randId,
} from "./utils";

export function* generateStatementList(
  statements: (Ast.Statement | Ast.Expression)[],
  scope: Scope,
): CodeGenerator {
  for (const statement of statements.slice(0, -1)) {
    const expression = yield* generateStatement(statement, scope);
    if (expression != null) {
      yield b.expressionStatement(expression);
    }
  }

  const last = statements.at(-1);
  if (last) {
    const expression = yield* generateStatement(last, scope);
    if (expression != null) {
      const result = b.identifier(`__run_result_${randId()}__`);
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
): CodeGenerator {
  switch (node.type) {
    case "def":
      yield* generateDefinitionDest(
        node.dest,
        (yield* generateExpression(node.expr, scope)) ?? b.literal(null),
        scope,
        node.mut,
      );
      break;
    case "assign":
    case "addAssign":
    case "subAssign":
      yield* generateAssign(node, scope);
      break;
    case "return":
      yield b.returnStatement.from({
        argument: yield* generateExpression(node.expr, scope),
        loc: node.loc,
      });
      break;
    case "each":
      yield* generateEach(node, scope);
      break;
    case "for":
      yield* generateFor(node, scope);
      break;
    case "loop":
      yield b.whileStatement.from({
        test: b.literal(true),
        body: b.blockStatement([
          ...generateStatementList(node.statements, scope.child()),
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
      return yield* generateExpression(node, scope);
    }
  }

  return null;
}

function* generateAssign(
  node: Ast.Assign | Ast.AddAssign | Ast.SubAssign,
  scope: Scope,
): Generator<K.StatementKind, void> {
  const right =
    (yield* generateExpression(node.expr, scope)) ?? b.literal(null);

  if (node.type === "assign") {
    yield* generateAssignDest(node.dest, right, scope);
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
        const target = yield* generateRef(node.dest.target, scope);
        const index = yield* generateRef(node.dest.index, scope);

        const get = callInternal("get_index", [target, index]);
        const newValue = b.binaryExpression(operator, get, right);
        yield b.expressionStatement(
          callInternal("set_index", [target, index, newValue]),
        );
        break;
      }
      case "prop": {
        const target = yield* generateRef(node.dest.target, scope);
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
): Generator<K.StatementKind, void> {
  const items = yield* generateRef(node.items, scope);
  yield createAssertion("array", items);

  const element = b.identifier(`__each_element_${randId()}__`);

  const eachScope = scope.child();

  yield b.forOfStatement.from({
    left: b.variableDeclaration("const", [b.variableDeclarator(element)]),
    right: items,
    body: b.blockStatement([
      ...generateDefinitionDest(node.var!, element, eachScope),
      ...generateStatement(node.for, eachScope),
    ]),
    loc: node.loc,
  });
}

function* generateFor(
  node: Ast.For,
  scope: Scope,
): Generator<K.StatementKind, void> {
  if (node.times) {
    const times = yield* generateRef(node.times, scope);
    yield createAssertion("number", times);

    const index = b.identifier(`__for_index_${randId()}__`);

    yield b.forStatement.from({
      init: b.variableDeclaration("let", [
        b.variableDeclarator(index, b.literal(0)),
      ]),
      test: b.binaryExpression("<", index, times),
      update: b.updateExpression("++", index, false),
      body: b.blockStatement([...generateStatement(node.for, scope)]),
    });
  } else {
    const from = yield* generateRef(node.from!, scope);
    const to = yield* generateRef(node.to!, scope);

    yield createAssertion("number", from);
    yield createAssertion("number", to);

    const forScope = scope.child();
    const jsName = forScope.define(node.var!);

    const index = b.identifier(jsName);

    yield b.forStatement.from({
      init: b.variableDeclaration("let", [b.variableDeclarator(index, from)]),
      test: b.binaryExpression("<", index, b.binaryExpression("+", from, to)),
      update: b.updateExpression("++", index, false),
      body: b.blockStatement([...generateStatement(node.for, forScope)]),
    });
  }
}
