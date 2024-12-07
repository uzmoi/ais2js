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

export const createGlobalScope = (globalsMap?: Map<string, AiScriptValue>) => {
  const scope = Scope.createRoot();

  const globals = Object.fromEntries(internals) as unknown as Record<
    string,
    AiScriptValue
  >;

  if (globalsMap) {
    for (const [name, value] of globalsMap) {
      const jsName = scope.define(name, { mutable: false });
      globals[jsName] = value;
    }
  }

  return [scope, globals] as const;
};

export interface Options {
  globals?: Map<string, AiScriptValue>;
}

export const createFunction = (
  source: string,
  options?: Options,
): (() => void) => {
  const [scope, globals] = createGlobalScope(options?.globals);

  const fn = Function(
    `{${[...scope.usedJsNames].join(",")}}`,
    transform(source, scope),
  );

  return fn.bind(null, globals);
};
