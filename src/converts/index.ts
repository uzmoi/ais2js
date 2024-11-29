import type { Ast } from "@syuilo/aiscript";
import { builders as b, type namedTypes as n } from "ast-types";
import type { Scope } from "../scope";
import { generateStatementList } from "./statement";

export const createProgram = (node: Ast.Node[], scope: Scope): n.Program =>
  b.program([
    ...generateStatementList(node as (Ast.Statement | Ast.Expression)[], scope),
  ]);