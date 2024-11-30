import { type Ast, Parser } from "@syuilo/aiscript";
import { visitNode } from "@syuilo/aiscript/parser/visit.js";
import { generate } from "astring";
import { Context } from "./context";
import { createProgram } from "./converts";
import { type AiScriptValue, internals } from "./runtime/internal";
import { Scope } from "./scope";

//         AiScript    ESTree
// line:   1-origin -> 1-origin
// column: 1-origin -> 0-origin
const changeOrigin = ({ line, column }: Ast.Pos): Ast.Pos => {
  return { line, column: column - 1 };
};

export const transform = (source: string, scope: Scope): string => {
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

  const program = createProgram(nodes, scope.child(), context);
  context.generateEnd();

  return generate(program);
};

export interface Options {
  globals?: Map<string, AiScriptValue>;
}

export const createFunction = (
  source: string,
  options?: Options,
): (() => void) => {
  const scope = new Scope(null, new Set(Object.keys(internals)));

  const globals = { ...internals } as unknown as Record<string, AiScriptValue>;

  if (options?.globals) {
    for (const [name, value] of options.globals) {
      const jsName = scope.define(name);
      globals[jsName] = value;
    }
  }

  const fn = Function(
    `{${[...scope.usedJsNames].join(",")}}`,
    transform(source, scope),
  );

  return fn.bind(null, globals);
};
