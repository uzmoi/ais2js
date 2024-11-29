import type { Ast } from "@syuilo/aiscript";
import { NODE } from "@syuilo/aiscript/parser/utils.js";
import { builders as b, namedTypes as n } from "ast-types";
import type * as K from "ast-types/gen/kinds";
import type { Scope } from "../scope";
import { generateDefinitionDest } from "./dest";
import { generateStatement, generateStatementList } from "./statement";
import {
  type CodeGenerator,
  callInternal,
  createAssertion,
  createBlock,
  createIife,
  createThrowError,
  randId,
} from "./utils";

export type Ref = n.Identifier | n.Literal;

export function* generateRef(
  node: Ast.Expression,
  scope: Scope,
): Generator<K.StatementKind, Ref> {
  const result = yield* generateExpression(node, scope);
  if (result == null) {
    return b.literal(null);
  }

  if (n.Identifier.check(result)) {
    return result;
  }

  if (
    n.Literal.check(result) &&
    (result.value === null || typeof result.value === "boolean")
  ) {
    return result;
  }

  const identifier = b.identifier(`__ref_${randId()}__`);

  yield b.variableDeclaration("const", [
    b.variableDeclarator(identifier, result),
  ]);

  return identifier;
}

export function* generateExpression(
  node: Ast.Expression,
  scope: Scope,
): CodeGenerator {
  switch (node.type) {
    // Literals
    case "null":
      return b.literal.from({ value: null, loc: node.loc });
    case "bool":
    case "num":
    case "str":
      return b.literal.from({ value: node.value, loc: node.loc });
    case "tmpl":
      return yield* generateTmpl(node, scope);
    case "arr":
      return yield* generateArray(node, scope);
    case "obj":
      return yield* generateObject(node, scope);

    // Flows
    case "and":
    case "or":
      return yield* generateLogicalOperator(node, scope);
    case "if":
      return yield* generateIf(node, scope);
    case "match": {
      throw new Error("Not implemented yet.");
    }
    case "block": {
      return yield* generateStatementList(node.statements, scope.child());
    }
    case "fn":
      return yield* generateFn(node, scope);
    case "call":
      return yield* generateCall(node, scope);

    // Operation
    case "exists":
      throw new Error("Not implemented yet.");
    case "identifier": {
      const jsName = scope.ref(node.name);
      if (jsName == null) {
        return createIife(
          b.blockStatement([
            createThrowError(b.literal(`Undefined variable: ${node.name}`)),
          ]),
        );
      }
      return b.identifier.from({
        name: jsName,
        loc: node.loc,
      });
    }
    case "plus":
    case "minus": {
      const expression = yield* generateRef(node.expr, scope);
      yield createAssertion("number", expression);
      return b.unaryExpression.from({
        operator: node.type === "plus" ? "+" : "-",
        argument: expression,
        loc: node.loc,
      });
    }
    case "not": {
      const expression = yield* generateRef(node.expr, scope);
      yield createAssertion("boolean", expression);
      return b.unaryExpression.from({
        operator: "!",
        argument: expression,
        loc: node.loc,
      });
    }
    case "pow":
    case "mul":
    case "div":
    case "rem":
    case "add":
    case "sub":
    case "lt":
    case "lteq":
    case "gt":
    case "gteq":
    case "eq":
    case "neq": {
      const left = yield* generateRef(node.left, scope);
      const right = yield* generateRef(node.right, scope);
      yield createAssertion("number", left);
      yield createAssertion("number", right);
      return b.binaryExpression.from({
        operator: binaryOperatorsMap[node.type],
        left,
        right,
        loc: node.loc,
      });
    }
    case "index": {
      const target = yield* generateRef(node.target, scope);
      const index = yield* generateExpression(node.index, scope);
      return callInternal("get_index", [target, index ?? b.literal(null)]);
    }
    case "prop": {
      const target = yield* generateExpression(node.target, scope);
      return callInternal("get_prop", [
        target ?? b.literal(null),
        b.literal(node.name),
      ]);
    }
    default:
      throw new Error(
        `Unknown node type: ${(node satisfies never as { type: string }).type}`,
      );
  }
}

const binaryOperatorsMap = {
  pow: "**",
  mul: "*",
  div: "/",
  rem: "%",
  add: "+",
  sub: "-",
  lt: "<",
  lteq: "<=",
  gt: ">",
  gteq: ">=",
  eq: "===",
  neq: "!==",
} as const;

function* generateTmpl(node: Ast.Tmpl, scope: Scope): CodeGenerator {
  const result = b.identifier(`__tmpl_${randId()}__`);
  yield b.variableDeclaration("let", [
    b.variableDeclarator(result, b.literal("")),
  ]);

  for (const templateElement of node.tmpl) {
    const expression = yield* generateExpression(templateElement, scope);
    yield b.expressionStatement(
      b.assignmentExpression(
        "+=",
        result,
        callInternal("repr", [expression ?? b.literal(null)]),
      ),
    );
  }

  return result;
  // return b.templateLiteral.from({
  //   quasis: [],
  //   expressions: [],
  //   loc: node.loc,
  // });
}

function* generateArray(node: Ast.Arr, scope: Scope) {
  const elements: K.ExpressionKind[] = [];
  for (const element of node.value) {
    elements.push(yield* generateRef(element, scope));
  }

  return b.arrayExpression.from({
    elements,
    loc: node.loc,
  });
}

function* generateObject(node: Ast.Obj, scope: Scope) {
  const properties: n.Property[] = [];
  for (const [key, value] of node.value) {
    properties.push(
      b.property("init", b.literal(key), yield* generateRef(value, scope)),
    );
  }

  return b.objectExpression.from({
    properties,
    loc: node.loc,
  });
}

function* generateFn(node: Ast.Fn, scope: Scope): CodeGenerator {
  const fnScope = scope.child();

  const params: K.PatternKind[] = [];
  const defaults: (Ref | null)[] = [];
  for (const [i, param] of node.params.entries()) {
    params.push(b.identifier(`arg_${i}`));
    if (param.default) {
      defaults.push(yield* generateRef(param.default, scope));
    } else {
      defaults.push(null);
    }
  }

  return b.arrowFunctionExpression.from({
    async: true,
    params,
    defaults,
    body: b.blockStatement([
      ...(function* generateFnBody() {
        for (const [i, param] of node.params.entries()) {
          yield* generateDefinitionDest(
            param.dest,
            b.identifier(`arg_${i}`),
            fnScope,
          );
        }

        const result = yield* generateStatementList(node.children, fnScope);

        if (result != null) {
          yield b.returnStatement(result);
        }
      })(),
    ]),
    expression: false,
    loc: node.loc,
  });
}

function* generateCall(node: Ast.Call, scope: Scope): CodeGenerator {
  const callee = yield* generateRef(node.target, scope);
  yield createAssertion("function", callee);

  const args: Ref[] = [];
  for (const arg of node.args) {
    args.push(yield* generateRef(arg, scope));
  }

  return b.awaitExpression(
    b.callExpression.from({
      callee,
      arguments: args,
      loc: node.loc,
    }),
  );
}

function* generateIf(node: Ast.If, scope: Scope): CodeGenerator {
  const test = yield* generateRef(node.cond, scope);
  yield createAssertion("boolean", test);

  const result = b.identifier(`__if_result_${randId()}__`);
  yield b.variableDeclaration("let", [
    b.variableDeclarator(result, b.literal(null)),
  ]);

  const consequent = createBlock(result, generateStatement(node.then, scope));

  const else_ = node.elseif.reduceRight((else_, { cond, then }) => {
    return NODE(
      "if",
      {
        cond,
        then,
        elseif: [],
        ...(else_ && { else: else_ }),
      },
      { line: 0, column: 0 },
      { line: 0, column: 0 },
    );
  }, node.else);

  let alternate: n.BlockStatement | null = null;
  if (else_) {
    alternate = createBlock(result, generateStatement(else_, scope));
  }

  yield b.ifStatement.from({
    test,
    consequent,
    alternate,
    loc: node.loc,
  });

  return result;
}

function* generateLogicalOperator(
  node: Ast.And | Ast.Or,
  scope: Scope,
): CodeGenerator {
  const result = b.identifier(`__${node.type}_result_${randId()}__`);

  const left = yield* generateExpression(node.left, scope);
  yield b.variableDeclaration("let", [b.variableDeclarator(result, left)]);

  const right = createBlock(result, generateExpression(node.right, scope));
  yield b.ifStatement(
    node.type === "or" ? b.unaryExpression("!", result) : result,
    right,
  );

  return result;
  // return b.logicalExpression.from({
  //   operator: node.type === "and" ? "&&" : "||",
  //   left,
  //   right,
  //   loc: node.loc,
  // });
}
