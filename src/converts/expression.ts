import type { Ast } from "@syuilo/aiscript";
import { NODE } from "@syuilo/aiscript/parser/utils.js";
import { builders as b, namedTypes as n } from "ast-types";
import type * as K from "ast-types/gen/kinds";
import type { Context } from "../context";
import type { Scope } from "../scope";
import { generateDefinitionDest } from "./dest";
import { generateStatement, generateStatementList } from "./statement";
import {
  callInternal,
  createAssertion,
  createBlock,
  createIife,
  createThrowError,
  loc,
} from "./utils";

type CodeGenerator = Generator<K.StatementKind, K.ExpressionKind>;

export type Ref = n.Identifier | n.Literal;

export function* generateRef(
  node: Ast.Expression,
  scope: Scope,
  ctx: Context,
): Generator<K.StatementKind, Ref> {
  const result = yield* generateExpression(node, scope, ctx);

  if (n.Identifier.check(result)) {
    return result;
  }

  if (
    n.Literal.check(result) &&
    (result.value === null || typeof result.value === "boolean")
  ) {
    return result;
  }

  const identifier = b.identifier(scope.newId("__ref__"));

  yield b.variableDeclaration("const", [
    b.variableDeclarator(identifier, result),
  ]);

  return identifier;
}

export function* generateExpression(
  node: Ast.Expression,
  scope: Scope,
  ctx: Context,
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
      return yield* generateTmpl(node, scope, ctx);
    case "arr":
      return yield* generateArray(node, scope, ctx);
    case "obj":
      return yield* generateObject(node, scope, ctx);

    // Flows
    case "and":
    case "or":
      return yield* generateLogicalOperator(node, scope, ctx);
    case "if":
      return yield* generateIf(node, scope, ctx);
    case "match": {
      throw new Error("Not implemented yet.");
    }
    case "block": {
      const result = yield* generateStatementList(
        node.statements,
        scope.child(),
        ctx,
      );
      return result ?? b.literal(null);
    }
    case "fn":
      return yield* generateFn(node, scope, ctx);
    case "call":
      return yield* generateCall(node, scope, ctx);

    // Operation
    case "exists": {
      /* FIXME: 関数の外で変数宣言をした場合の結果が @syuilo/aiscript と違う
      ECMAScript 的には Temporal Dead Zone なので typeof でもエラーが投げられる。var 使うか？
      ref. https://zenn.dev/qnighy/articles/f3d2d7adc75948
      ref. https://zenn.dev/pixiv/articles/4c7a4399f6a8c7
      ```ais
      @f() { exists hoge }
      <: f() // @syuilo/aiscript だとfalse、↓の実装だとtrue
      let hoge = 0
      ``` */
      const entry = scope.ref(node.identifier.name);
      return b.literal(entry != null);
    }
    case "identifier": {
      const entry = scope.ref(node.name);
      if (entry == null) {
        return createIife(
          b.blockStatement([
            createThrowError(b.literal(`Undefined variable: ${node.name}`)),
          ]),
        );
      }

      // FIXME: existsと同じことが変数参照でも起きる。
      // 結果的にエラーになるのは変わらないが、投げられるエラーが JavaScript の ReferenceError になる。
      return b.identifier.from({
        name: entry.jsName,
        loc: node.loc,
      });
    }
    case "plus":
    case "minus": {
      const expression = yield* generateRef(node.expr, scope, ctx);
      yield createAssertion("number", expression, node.expr);
      return b.unaryExpression.from({
        operator: node.type === "plus" ? "+" : "-",
        argument: expression,
        loc: node.loc,
      });
    }
    case "not": {
      const expression = yield* generateRef(node.expr, scope, ctx);
      yield createAssertion("boolean", expression, node.expr);
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
      const left = yield* generateRef(node.left, scope, ctx);
      const right = yield* generateRef(node.right, scope, ctx);
      if (node.type !== "eq" && node.type !== "neq") {
        yield createAssertion("number", left, node.left);
        yield createAssertion("number", right, node.right);
      }
      return b.binaryExpression.from({
        operator: binaryOperatorsMap[node.type],
        left,
        right,
        loc: node.loc,
      });
    }
    case "index": {
      const target = yield* generateRef(node.target, scope, ctx);
      const index = yield* generateExpression(node.index, scope, ctx);
      return callInternal("get_index", [target, index, loc(node)]);
    }
    case "prop": {
      const target = yield* generateExpression(node.target, scope, ctx);
      const name = b.literal(node.name);
      return callInternal("get_prop", [target, name, loc(node)]);
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

function* generateTmpl(
  node: Ast.Tmpl,
  scope: Scope,
  ctx: Context,
): CodeGenerator {
  const result = b.identifier(scope.newId("__tmpl__"));
  yield b.variableDeclaration("let", [
    b.variableDeclarator(result, b.literal("")),
  ]);

  for (const templateElement of node.tmpl) {
    const expression = yield* generateExpression(templateElement, scope, ctx);
    yield b.expressionStatement(
      b.assignmentExpression("+=", result, callInternal("repr", [expression])),
    );
  }

  return result;
  // return b.templateLiteral.from({
  //   quasis: [],
  //   expressions: [],
  //   loc: node.loc,
  // });
}

function* generateArray(
  node: Ast.Arr,
  scope: Scope,
  ctx: Context,
): CodeGenerator {
  const elements: K.ExpressionKind[] = [];
  for (const element of node.value) {
    elements.push(yield* generateRef(element, scope, ctx));
  }

  return b.arrayExpression.from({
    elements,
    loc: node.loc,
  });
}

function* generateObject(
  node: Ast.Obj,
  scope: Scope,
  ctx: Context,
): CodeGenerator {
  const properties: n.ArrayExpression[] = [];
  for (const [key, value] of node.value) {
    properties.push(
      b.arrayExpression([
        b.literal(key),
        yield* generateRef(value, scope, ctx),
      ]),
    );
  }

  return b.newExpression.from({
    callee: b.identifier("Map"),
    arguments: [b.arrayExpression(properties)],
    loc: node.loc,
  });
}

function* generateFn(node: Ast.Fn, scope: Scope, ctx: Context): CodeGenerator {
  const fnScope = scope.child();

  const params: K.PatternKind[] = [];
  const defaults: (Ref | null)[] = [];
  for (const [i, param] of node.params.entries()) {
    params.push(b.identifier(`arg_${i}`));
    if (param.default) {
      defaults.push(yield* generateRef(param.default, scope, ctx));
    } else {
      defaults.push(null);
    }
  }

  const body: K.StatementKind[] = [];

  ctx.onGenerateEnd(() => {
    function* generateFnBody() {
      for (const [i, param] of node.params.entries()) {
        yield* generateDefinitionDest(
          param.dest,
          b.identifier(`arg_${i}`),
          fnScope,
        );
      }

      const result = yield* generateStatementList(node.children, fnScope, ctx);

      yield b.returnStatement(result ?? b.literal(null));
    }
    body.push(...generateFnBody());
  });

  return b.arrowFunctionExpression.from({
    async: true,
    params,
    defaults,
    body: b.blockStatement(body),
    expression: false,
    loc: node.loc,
  });
}

function* generateCall(
  node: Ast.Call,
  scope: Scope,
  ctx: Context,
): CodeGenerator {
  const callee = yield* generateRef(node.target, scope, ctx);

  const args: Ref[] = [];
  for (const arg of node.args) {
    args.push(yield* generateRef(arg, scope, ctx));
  }

  return b.awaitExpression(
    callInternal("call", [callee, b.arrayExpression(args), loc(node)]),
  );
}

function* generateIf(node: Ast.If, scope: Scope, ctx: Context): CodeGenerator {
  const test = yield* generateRef(node.cond, scope, ctx);
  yield createAssertion("boolean", test, node.cond);

  const result = b.identifier(scope.newId("__if_result__"));
  yield b.variableDeclaration("let", [
    b.variableDeclarator(result, b.literal(null)),
  ]);

  const consequent = createBlock(
    result,
    generateStatement(node.then, scope, ctx),
  );

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
    alternate = createBlock(result, generateStatement(else_, scope, ctx));
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
  ctx: Context,
): CodeGenerator {
  const result = b.identifier(scope.newId(`__${node.type}_result__`));

  const left = yield* generateExpression(node.left, scope, ctx);
  yield b.variableDeclaration("let", [b.variableDeclarator(result, left)]);

  yield createAssertion("boolean", result, node.left);

  const right = createBlock(result, generateExpression(node.right, scope, ctx));

  right.body.push(createAssertion("boolean", result, node.right));

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
