import type { Ast } from "@syuilo/aiscript";
import { builders as b } from "ast-types";
import type * as K from "ast-types/gen/kinds";
import type { Scope } from "../scope";
import { generateExpression, generateRef } from "./expression";
import { type CodeGenerator, createAssertion, randId } from "./utils";

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
      yield* generateDefinition(node, scope);
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

function* generateDefinition(
  node: Ast.Definition,
  scope: Scope,
): Generator<K.StatementKind, void> {
  const init = yield* generateExpression(node.expr, scope);

  // TODO: destに対応させる
  yield b.variableDeclaration.from({
    kind: node.mut ? "let" : "const",
    declarations: [
      b.variableDeclarator(
        b.identifier((node.dest as Ast.Identifier).name),
        init,
      ),
    ],
    loc: node.loc,
  });
}

function* generateAssign(
  node: Ast.Assign | Ast.AddAssign | Ast.SubAssign,
  scope: Scope,
): Generator<K.StatementKind, void> {
  const operator =
    node.type === "addAssign" ? "+=" : node.type === "subAssign" ? "-=" : "=";

  // TODO: destに対応させる
  const left = b.identifier((node.dest as Ast.Identifier).name);
  const right = yield* generateExpression(node.expr, scope);

  yield b.expressionStatement(
    b.assignmentExpression.from({
      operator,
      left,
      right: right ?? b.literal(null),
      loc: node.loc,
    }),
  );
}

function* generateEach(
  node: Ast.Each,
  scope: Scope,
): Generator<K.StatementKind, void> {
  const items = yield* generateRef(node.items, scope);
  yield createAssertion("array", items);

  const eachScope = scope.child();

  // TODO: destに対応させる
  yield b.forOfStatement.from({
    left: b.identifier((node.var! as Ast.Identifier).name),
    right: items,
    body: b.blockStatement([...generateStatement(node.for, eachScope)]),
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
