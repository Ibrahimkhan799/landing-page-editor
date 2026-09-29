import type { LandingPage, PageElement, PageSection, ValueSchema, VariableDefinition } from "@/lib/types";

const BLOCKED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const MAX_DEPTH = 64;

export function sectionElements(section: PageSection): PageElement[] {
  return [
    ...Object.entries(section.slots ?? {}).flatMap(([key, value]) =>
      key.startsWith("frame:") ? [] : Array.isArray(value) ? value : value && typeof value === "object" ? [value] : [],
    ),
    ...(section.elements ?? []),
  ];
}

export function findElementPath(elements: PageElement[], nodeId: string): PageElement[] | null {
  for (const element of elements) {
    if (element.id === nodeId) return [element];
    const path = findElementPath(element.children ?? [], nodeId);
    if (path) return [element, ...path];
  }
  return null;
}

/** Outer-to-inner, including the node itself. Names shadow; explicit IDs can still address outer declarations. */
export function getScopedVariables(page: LandingPage, nodeId?: string): VariableDefinition[] {
  const globals = [...(page.variables ?? [])];
  if (!nodeId || nodeId === page.id) return globals;
  for (const section of page.sections) {
    if (section.id === nodeId) return [...globals, ...(section.variables ?? [])];
    const path = findElementPath(sectionElements(section), nodeId);
    if (path) return [...globals, ...(section.variables ?? []), ...path.flatMap((node) => node.variables ?? [])];
  }
  // Unknown IDs must not accidentally gain access to another section's locals.
  return globals;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

/** Reads data only: never inherited properties, accessors, functions, or prototype escape hatches. */
export function readValueProperty(value: unknown, key: string | number): unknown {
  const name = String(key);
  if (BLOCKED_KEYS.has(name)) throw new Error(`Property "${name}" is not allowed.`);
  if (typeof value === "string") {
    if (name === "length") return value.length;
    return /^(0|[1-9]\d*)$/.test(name) ? value[Number(name)] : undefined;
  }
  if (!Array.isArray(value) && !isPlainObject(value)) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, name);
  const result: unknown = descriptor && "value" in descriptor ? descriptor.value : undefined;
  return typeof result === "function" ? undefined : result;
}

/** Dot paths and numeric/quoted bracket indexes; malformed or unsafe paths resolve to undefined. */
export function resolveVariablePath(value: unknown, path?: string): unknown {
  if (!path?.trim()) return value;
  const source = path.trim();
  const token = /(?:^([A-Za-z_$][\w$]*|\d+)|\.([A-Za-z_$][\w$]*|\d+)|\[\s*(\d+|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\])/y;
  let position = 0;
  let result = value;
  try {
    while (position < source.length) {
      token.lastIndex = position;
      const match = token.exec(source);
      if (!match) return undefined;
      const raw = match[1] ?? match[2] ?? match[3];
      const key = raw.startsWith('"') ? JSON.parse(raw) as string
        : raw.startsWith("'") ? raw.slice(1, -1).replace(/\\(['\\])/g, "$1") : raw;
      result = readValueProperty(result, key);
      position = token.lastIndex;
    }
    return result;
  } catch {
    return undefined;
  }
}

export function inferValueSchema(value: unknown): ValueSchema {
  const seen = new Set<object>();
  function infer(candidate: unknown, depth: number): ValueSchema {
    if (depth > MAX_DEPTH) throw new Error("Value exceeds the maximum schema depth (64).");
    if (typeof candidate === "string") return { type: "text" };
    if (typeof candidate === "boolean") return { type: "boolean" };
    if (typeof candidate === "number" && Number.isFinite(candidate)) return { type: "number" };
    if (!Array.isArray(candidate) && !isPlainObject(candidate)) {
      throw new Error("Values must be text, finite numbers, booleans, arrays, or plain objects; null is not a supported variable type.");
    }
    if (seen.has(candidate)) throw new Error("Circular values cannot have a variable schema.");
    seen.add(candidate);
    let schema: ValueSchema;
    if (Array.isArray(candidate)) {
      const schemas = Array.from({ length: candidate.length }, (_, index) => infer(readValueProperty(candidate, index), depth + 1));
      const first = schemas[0];
      // The contract has no union type. Heterogeneous arrays retain only their array constraint.
      schema = { type: "array", ...(first && schemas.every((item) => sameSchema(first, item)) ? { items: first } : {}) };
    } else {
      const fields: Record<string, ValueSchema> = Object.create(null);
      for (const key of Object.keys(candidate)) {
        if (BLOCKED_KEYS.has(key)) throw new Error(`Property "${key}" is not allowed.`);
        const descriptor = Object.getOwnPropertyDescriptor(candidate, key)!;
        if (!("value" in descriptor)) throw new Error(`Accessor property "${key}" is not supported.`);
        fields[key] = infer(descriptor.value, depth + 1);
      }
      schema = { type: "object", fields };
    }
    seen.delete(candidate);
    return schema;
  }
  return infer(value, 0);
}

function sameSchema(a: ValueSchema, b: ValueSchema): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "array") return !a.items || !b.items ? a.items === b.items : sameSchema(a.items, b.items);
  if (a.type !== "object") return true;
  const keys = Object.keys(a.fields ?? {});
  return keys.length === Object.keys(b.fields ?? {}).length && keys.every((key) =>
    Object.hasOwn(b.fields ?? {}, key) && sameSchema(a.fields![key], b.fields![key]),
  );
}

/** No coercion. Object fields are required and closed; absent items/fields permit any safe data of that shape. */
export function validateVariableValue(schema: ValueSchema, value: unknown): string | null {
  const seen = new Set<object>();
  function validate(expected: ValueSchema | undefined, candidate: unknown, path: string, depth: number): string | null {
    if (depth > MAX_DEPTH) return `${path}: maximum nesting depth is 64.`;
    const type = expected?.type;
    const actual = typeof candidate === "string" ? "text" : typeof candidate === "boolean" ? "boolean"
      : typeof candidate === "number" && Number.isFinite(candidate) ? "number"
      : Array.isArray(candidate) ? "array" : isPlainObject(candidate) ? "object" : null;
    if (!actual || (type && type !== actual)) return `${path}: expected ${type ?? "safe JSON data (no null/non-finite values)"}.`;
    if (actual !== "array" && actual !== "object") return null;
    const object = candidate as Record<string, unknown>;
    if (seen.has(object)) return `${path}: circular values are not supported.`;
    seen.add(object);
    if (actual === "array") {
      const array = candidate as unknown[];
      for (let index = 0; index < array.length; index++) {
        const error = validate(expected?.items, readValueProperty(array, index), `${path}[${index}]`, depth + 1);
        if (error) return error;
      }
    } else {
      for (const key of Object.keys(expected?.fields ?? {})) {
        if (!Object.hasOwn(object, key)) return `${path}.${key}: required field is missing.`;
      }
      for (const key of Object.keys(object)) {
        if (BLOCKED_KEYS.has(key)) return `${path}.${key}: property is not allowed.`;
        if (expected?.fields && !Object.hasOwn(expected.fields, key)) return `${path}.${key}: unexpected field.`;
        const descriptor = Object.getOwnPropertyDescriptor(object, key)!;
        if (!("value" in descriptor)) return `${path}.${key}: accessor properties are not supported.`;
        const error = validate(expected?.fields?.[key], descriptor.value, `${path}.${key}`, depth + 1);
        if (error) return error;
      }
    }
    seen.delete(object);
    return null;
  }
  return validate(schema, value, "value", 0);
}
