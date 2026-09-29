import { readValueProperty } from "@/lib/variables";

export const EXPRESSION_FUNCTIONS = ["If", "Concat", "Length"] as const;

type Token = { text: string; value?: unknown; kind: "literal" | "name" | "symbol" | "end"; position: number };
type Expression =
  | { kind: "literal"; value: unknown }
  | { kind: "name"; name: string }
  | { kind: "member"; object: Expression; key: Expression }
  | { kind: "unary"; operator: string; operand: Expression }
  | { kind: "binary"; operator: string; left: Expression; right: Expression }
  | { kind: "call"; name: string; args: Expression[] }
  | { kind: "array"; items: Expression[] };

const PRECEDENCE: Record<string, number> = { "??": 1, "||": 2, "&&": 3, "==": 4, "===": 4, "!=": 4, "!==": 4, "<": 5, "<=": 5, ">": 5, ">=": 5, "+": 6, "-": 6, "*": 7, "/": 7, "%": 7 };

function tokenize(source: string): Token[] {
  if (source.length > 8192) throw new Error("Expression is too long (maximum 8192 characters).");
  const tokens: Token[] = [];
  let position = 0;
  while (position < source.length) {
    if (/\s/.test(source[position])) { position++; continue; }
    if (tokens.length >= 2048) throw new Error("Expression has too many tokens (maximum 2048).");
    const start = position;
    const character = source[position];
    if (character === '"' || character === "'") {
      position++;
      let value = "";
      while (position < source.length && source[position] !== character) {
        if (source[position] === "\\") {
          position++;
          const escape = source[position++];
          const escapes: Record<string, string> = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "\\": "\\", '"': '"', "'": "'", "/": "/" };
          if (escape === "u") {
            const hex = source.slice(position, position + 4);
            if (!/^[0-9a-f]{4}$/i.test(hex)) throw new Error(`Invalid Unicode escape at character ${position + 1}.`);
            value += String.fromCharCode(parseInt(hex, 16));
            position += 4;
          } else if (Object.hasOwn(escapes, escape)) value += escapes[escape];
          else throw new Error(`Invalid string escape at character ${position}.`);
        } else value += source[position++];
      }
      if (source[position] !== character) throw new Error(`Unclosed string at character ${start + 1}.`);
      position++;
      tokens.push({ kind: "literal", text: source.slice(start, position), value, position: start });
      continue;
    }
    const number = source.slice(position).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
    if (number) {
      const value = Number(number[0]);
      if (!Number.isFinite(value)) throw new Error(`Number must be finite at character ${start + 1}.`);
      tokens.push({ kind: "literal", text: number[0], value, position: start });
      position += number[0].length;
      continue;
    }
    const name = source.slice(position).match(/^[A-Za-z_$][\w$]*/);
    if (name) {
      const literals: Record<string, unknown> = { true: true, false: false, null: null, undefined: undefined };
      tokens.push(Object.hasOwn(literals, name[0])
        ? { kind: "literal", text: name[0], value: literals[name[0]], position: start }
        : { kind: "name", text: name[0], position: start });
      position += name[0].length;
      continue;
    }
    const operator = source.slice(position).match(/^(?:===|!==|==|!=|<=|>=|&&|\|\||\?\?|[+\-*/%<>!()[\].,])/);
    if (!operator) throw new Error(`Unexpected character "${character}" at character ${start + 1}. Only data expressions are allowed.`);
    tokens.push({ kind: "symbol", text: operator[0], position: start });
    position += operator[0].length;
  }
  tokens.push({ kind: "end", text: "", position });
  return tokens;
}

class Parser {
  private cursor = 0;
  private depth = 0;
  constructor(private tokens: Token[]) {}
  private peek() { return this.tokens[this.cursor]; }
  private take() { return this.tokens[this.cursor++]; }
  private accept(text: string) {
    if (this.peek().text !== text) return false;
    this.take();
    return true;
  }
  private expect(text: string) {
    if (!this.accept(text)) this.fail(`Expected "${text}"`);
  }
  private fail(message: string): never {
    throw new Error(`${message} at character ${this.peek().position + 1}.`);
  }
  parse(): Expression {
    const result = this.expression();
    if (this.peek().kind !== "end") this.fail(`Unexpected token "${this.peek().text}"`);
    return result;
  }
  private expression(minimum = 0): Expression {
    if (++this.depth > 64) this.fail("Expression nesting exceeds 64 levels");
    let left = this.primary();
    while (Object.hasOwn(PRECEDENCE, this.peek().text) && PRECEDENCE[this.peek().text] >= minimum) {
      const operator = this.take().text;
      const right = this.expression(PRECEDENCE[operator] + 1);
      left = { kind: "binary", operator, left, right };
    }
    this.depth--;
    return left;
  }
  private arguments(close: string): Expression[] {
    const args: Expression[] = [];
    if (!this.accept(close)) {
      do { args.push(this.expression()); } while (this.accept(","));
      this.expect(close);
    }
    return args;
  }
  private primary(): Expression {
    const token = this.take();
    let value: Expression;
    if (["!", "-", "+"].includes(token.text) && token.kind === "symbol") {
      value = { kind: "unary", operator: token.text, operand: this.expression(8) };
    } else if (token.kind === "literal") value = { kind: "literal", value: token.value };
    else if (token.kind === "name") {
      if (this.accept("(")) {
        if (!(EXPRESSION_FUNCTIONS as readonly string[]).includes(token.text)) {
          throw new Error(`Unknown function "${token.text}". Supported functions: ${EXPRESSION_FUNCTIONS.join(", ")}.`);
        }
        const args = this.arguments(")");
        if (token.text === "If" && args.length !== 3) throw new Error("If(condition, thenValue, elseValue) requires exactly 3 arguments.");
        if (token.text === "Length" && args.length !== 1) throw new Error("Length(value) requires exactly 1 argument.");
        value = { kind: "call", name: token.text, args };
      } else value = { kind: "name", name: token.text };
    } else if (token.text === "(") {
      value = this.expression();
      this.expect(")");
    } else if (token.text === "[") value = { kind: "array", items: this.arguments("]") };
    else throw new Error(`Expected a value at character ${token.position + 1}.`);
    while (true) {
      if (this.accept(".")) {
        const key = this.take();
        if (key.kind !== "name") throw new Error(`Expected a property name at character ${key.position + 1}.`);
        value = { kind: "member", object: value, key: { kind: "literal", value: key.text } };
      } else if (this.accept("[")) {
        const key = this.expression();
        this.expect("]");
        value = { kind: "member", object: value, key };
      } else break;
    }
    return value;
  }
}

function number(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Arithmetic requires finite numbers; use Concat() to join text.");
  return value;
}

export function expressionText(value: unknown): string {
  if (value == null) return "";
  if (["string", "number", "boolean"].includes(typeof value)) return String(value);
  let budget = 10000;
  const seen = new Set<object>();
  function data(candidate: unknown, depth: number): unknown {
    if (--budget < 0 || depth > 64) throw new Error("Text value exceeds the serialization limit.");
    if (candidate === null || ["string", "boolean"].includes(typeof candidate)) return candidate;
    if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
    if (!candidate || typeof candidate !== "object") throw new Error("Only data values can be rendered as text.");
    if (seen.has(candidate)) throw new Error("Circular values cannot be rendered as text.");
    seen.add(candidate);
    let result: unknown;
    if (Array.isArray(candidate)) {
      if (candidate.length > budget) throw new Error("Text value exceeds the serialization limit.");
      result = Array.from({ length: candidate.length }, (_, index) => data(readValueProperty(candidate, index), depth + 1));
    } else {
      if (![Object.prototype, null].includes(Object.getPrototypeOf(candidate))) throw new Error("Only plain objects can be rendered as text.");
      // Copy descriptors, not property values: JSON.stringify must never invoke a getter or toJSON method.
      const object: Record<string, unknown> = Object.create(null);
      for (const key of Object.keys(candidate)) {
        const descriptor = Object.getOwnPropertyDescriptor(candidate, key)!;
        if (!("value" in descriptor)) throw new Error(`Accessor property "${key}" is not allowed.`);
        object[key] = data(readValueProperty(candidate, key), depth + 1);
      }
      result = object;
    }
    seen.delete(candidate);
    return result;
  }
  return JSON.stringify(data(value, 0));
}

/** A bounded data-language interpreter, not JavaScript. No eval, methods, globals, or prototype access. */
export function evaluateExpression(expression: string, variables: Record<string, unknown>): unknown {
  const tree = new Parser(tokenize(expression)).parse();
  let budget = 4096;
  function evaluate(node: Expression, depth = 0): unknown {
    if (--budget < 0 || depth > 128) throw new Error("Expression evaluation limit exceeded; simplify the expression.");
    const run = (child: Expression) => evaluate(child, depth + 1);
    switch (node.kind) {
      case "literal": return node.value;
      case "name": {
        if (!Object.hasOwn(variables, node.name)) throw new Error(`Unknown variable "${node.name}". Use a variable visible in this scope.`);
        return readValueProperty(variables, node.name);
      }
      case "array": return node.items.map(run);
      case "member": {
        const key = run(node.key);
        if (typeof key !== "string" && typeof key !== "number") throw new Error("Property indexes must be text or numbers.");
        const object = run(node.object);
        if (object == null) throw new Error(`Cannot read "${key}" from an empty value; guard it with If().`);
        return readValueProperty(object, key);
      }
      case "unary": {
        const operand = run(node.operand);
        return node.operator === "!" ? !operand : node.operator === "-" ? -number(operand) : number(operand);
      }
      case "call": {
        if (node.name === "If") return run(node.args[0]) ? run(node.args[1]) : run(node.args[2]);
        if (node.name === "Concat") return node.args.map((arg) => expressionText(run(arg))).join("");
        const value = run(node.args[0]);
        if (typeof value === "string" || Array.isArray(value)) return value.length;
        if (value && typeof value === "object" && [Object.prototype, null].includes(Object.getPrototypeOf(value))) return Object.keys(value).length;
        throw new Error("Length(value) expects text, an array, or an object.");
      }
      case "binary": {
        const left = run(node.left);
        if (node.operator === "&&") return left && run(node.right);
        if (node.operator === "||") return left || run(node.right);
        if (node.operator === "??") return left ?? run(node.right);
        const right = run(node.right);
        if (["==", "==="].includes(node.operator)) return left === right;
        if (["!=", "!=="].includes(node.operator)) return left !== right;
        if (["<", "<=", ">", ">="].includes(node.operator)) {
          if (!((typeof left === "number" && typeof right === "number") || (typeof left === "string" && typeof right === "string"))) throw new Error("Comparison requires two numbers or two text values.");
          if (node.operator === "<") return left < right;
          if (node.operator === "<=") return left <= right;
          if (node.operator === ">") return left > right;
          return left >= right;
        }
        if (node.operator === "+" && typeof left === "string" && typeof right === "string") return left + right;
        const a = number(left), b = number(right);
        const result = node.operator === "+" ? a + b : node.operator === "-" ? a - b : node.operator === "*" ? a * b : node.operator === "/" ? a / b : a % b;
        if (!Number.isFinite(result)) throw new Error("Arithmetic result must be finite (check division by zero).");
        return result;
      }
    }
  }
  return evaluate(tree);
}
