import { parse } from "@babel/parser";
import { validDirectory } from "./catalog.js";

type Ast = { type?: string; [key: string]: unknown };
type Bindings = Map<string, string | string[]>;
export interface ToolDirectories { directories: string[]; tool: "exec_command"; unresolved?: boolean }
const MAX_CODE = 128 * 1024;
function stringValue(node: Ast | null | undefined, bindings: Bindings): string | null {
  if (node?.type === "StringLiteral") return node.value as string;
  if (node?.type === "Identifier") { const value = bindings.get(node.name as string); return typeof value === "string" ? value : null; }
  if (node?.type === "BinaryExpression" && node.operator === "+") {
    const left = stringValue(node.left as Ast, bindings), right = stringValue(node.right as Ast, bindings);
    return left !== null && right !== null && left.length + right.length <= 8192 ? left + right : null;
  }
  if (node?.type === "TemplateLiteral") {
    const parts = node.quasis as Array<{ value: { cooked: string | null } }>, expressions = node.expressions as Ast[];
    let value = "";
    for (let index = 0; index < parts.length; index++) {
      const text = parts[index].value.cooked; if (text === null) return null; value += text;
      if (index < expressions.length) { const expression = stringValue(expressions[index], bindings); if (expression === null) return null; value += expression; }
      if (value.length > 8192) return null;
    }
    return value;
  }
  return null;
}
function arrayValue(node: Ast | null | undefined, bindings: Bindings): string[] | null {
  if (node?.type === "Identifier") { const value = bindings.get(node.name as string); return Array.isArray(value) ? value : null; }
  if (node?.type !== "ArrayExpression") return null;
  const elements = node.elements as Ast[];
  if (elements.length > 4) return null;
  const values = elements.map(element => stringValue(element, bindings)).filter(value => value !== null);
  return values.length ? values : null;
}

export function declaredToolDirectories(payload: unknown): ToolDirectories | null {
  if (!payload || typeof payload !== "object") return null;
  const call = payload as { type?: unknown; name?: unknown; arguments?: unknown; input?: unknown };
  if (!["function_call", "custom_tool_call"].includes(String(call.type)) || typeof call.name !== "string") return null;
  const name = call.name.split(".").at(-1), directories = new Set<string>();
  let matched = false, unresolved = false;
  const add = (value: unknown) => {
    if (validDirectory(value) && directories.size < 4) directories.add(value);
    else unresolved = true;
  };
  let args: Record<string, unknown> | null = null;
  if (typeof call.arguments === "string" && call.arguments.length <= MAX_CODE) { try { args = JSON.parse(call.arguments); } catch { return null; } }
  if (name === "exec_command") { matched = true; if (args?.workdir != null) add(args.workdir); }
  else if (name === "exec") {
    const code = typeof call.input === "string" ? call.input : args?.code;
    if (typeof code !== "string" || code.length > MAX_CODE) return null;
    try {
      const ast = parse(code, { sourceType: "module", allowAwaitOutsideFunction: true });
      let visited = 0;
      const visit = (node: unknown, bindings: Bindings): void => {
        if (!node || typeof node !== "object" || ++visited > 20_000) return;
        const current = node as Ast;
        if (["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression", "ClassDeclaration", "ClassExpression"].includes(String(current.type))) return;
        if (current.type === "Program" || current.type === "BlockStatement") {
          const scope = new Map(bindings);
          for (const statement of current.body as Ast[]) {
            if (statement.type === "VariableDeclaration") for (const declaration of statement.declarations as Array<{ id: Ast }>) {
              if (declaration.id.type === "Identifier") scope.delete(declaration.id.name as string);
            }
          }
          for (const statement of current.body as Ast[]) visit(statement, scope);
          return;
        }
        if (current.type === "VariableDeclaration") {
          for (const declaration of current.declarations as Array<{ id: Ast; init: Ast | null }>) {
            if (declaration.id.type !== "Identifier") continue;
            const key = declaration.id.name as string;
            const value = current.kind === "const" ? stringValue(declaration.init, bindings) ?? arrayValue(declaration.init, bindings) : null;
            if (value === null) bindings.delete(key); else bindings.set(key, value);
            visit(declaration.init, bindings);
          }
          return;
        }
        if (current.type === "CallExpression") {
          const callee = current.callee as { type?: string; computed?: boolean; object?: { type?: string; name?: string }; property?: { name?: string } };
          const argument = (current.arguments as Ast[])[0];
          if (callee.type === "MemberExpression" && !callee.computed && callee.property?.name === "map"
            && ["ArrowFunctionExpression", "FunctionExpression"].includes(String(argument?.type))) {
            const paths = arrayValue(callee.object as Ast, bindings), params = argument.params as Ast[];
            if (paths && params.length === 1 && params[0].type === "Identifier") for (const path of paths) {
              const scope = new Map(bindings); scope.set(params[0].name as string, path); visit(argument.body, scope);
            }
          }
          if (callee.type === "MemberExpression" && !callee.computed && callee.object?.type === "Identifier"
            && ["tools", "functions"].includes(callee.object.name ?? "") && callee.property?.name === "exec_command") {
            matched = true;
            if (argument?.type !== "ObjectExpression") { unresolved = true; return; }
            const properties = argument.properties as Ast[];
            if (!properties.some(property => property.type !== "ObjectProperty" || property.computed)) {
              const property = [...properties].reverse().find(property => {
                const key = property.key as { name?: string; value?: string };
                return (key.name ?? key.value) === "workdir";
              });
              const value = property?.value as Ast | undefined;
              if (value && !(value.type === "Identifier" && value.name === "undefined" && !bindings.has("undefined"))) add(stringValue(value, bindings));
            } else unresolved = true;
          }
        }
        for (const [key, value] of Object.entries(current)) {
          if (["loc", "extra", "start", "end"].includes(key)) continue;
          if (Array.isArray(value)) for (const child of value) visit(child, bindings);
          else if (value && typeof value === "object") visit(value, bindings);
        }
      };
      visit(ast, new Map());
    } catch { return null; }
  }
  return matched ? { directories: [...directories], tool: "exec_command", ...(unresolved ? { unresolved: true } : {}) } : null;
}
