import { type Ast, Parser } from "@syuilo/aiscript";
import { visitNode } from "@syuilo/aiscript/parser/visit.js";
import { generate } from "astring";
import { Context } from "./context";
import { createProgram } from "./converts";
import { type AiScriptValue, repr } from "./runtime/internal";
import { Scope } from "./scope";

//         AiScript    ESTree
// line:   1-origin -> 1-origin
// column: 1-origin -> 0-origin
const changeOrigin = ({ line, column }: Ast.Pos): Ast.Pos => {
  return { line, column: column - 1 };
};

export const transform = (source: string): string => {
  const nodes = Parser.parse(source);

  for (const node of nodes) {
    visitNode(node, node => {
      const { start, end } = node.loc;
      node.loc = {
        start: changeOrigin(start),
        end: changeOrigin(end),
      };
      return node;
    });
  }

  const context = new Context();
  const scope = new Scope(null);
  scope.define("print");

  const program = createProgram(nodes, scope, context);
  context.generateEnd();

  return generate(program);
};

export interface Options {
  print?: (value: AiScriptValue) => void | Promise<void>;
}

export const createFunction = (
  source: string,
  options?: Options,
): (() => void) => {
  const fn = Function("{print,__repr}", transform(source));

  return fn.bind(null, {
    print: options?.print,
    __repr: repr,
  });
};
