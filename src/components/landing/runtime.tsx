"use client";

import { createContext, useContext, useMemo, useState, type CSSProperties, type DOMAttributes, type ReactNode } from "react";
import { applySlotOverrides } from "@/lib/component-slots";
import { evaluateExpression, expressionText } from "@/lib/expressions";
import { migratePage } from "@/lib/migrate";
import { styleToCss } from "@/lib/styles";
import { findElementPath, getScopedVariables, resolveVariablePath, sectionElements, validateVariableValue } from "@/lib/variables";
import type { InteractionBinding, InteractionTrigger, LandingPage, PageElement, StyleProps, ValueBinding, VariableDefinition, VariableType } from "@/lib/types";

export type RuntimeCondition = { variableName?: string; literal?: unknown; operator?: string; value?: unknown; binding?: ValueBinding };
export type RuntimeNode = { id: string; interactions?: InteractionBinding[] };
export type RuntimeInteractionHandlers = Pick<DOMAttributes<Element>, "onClick" | "onInput" | "onChange" | "onKeyDown" | "onDragStart" | "onDragEnd"> & { draggable?: boolean };
export type RuntimeState = {
  scope: string;
  values: Record<string, unknown>;
  removedElements: Record<string, true>;
  styleOverrides: Record<string, StyleProps>;
  errors: Record<string, string>;
};
type EventSnapshot = { value: unknown; checked?: boolean; key?: string };
type LandingRuntimeValue = {
  enabled: boolean;
  variables: Record<string, unknown>;
  errors: Record<string, string>;
  setVariable: (name: string, value: unknown) => string | null;
  toggleVariable: (name: string) => string | null;
  interpolate: (value: unknown) => string;
  resolveBinding: (binding: ValueBinding) => unknown;
  resolveElementProps: (element: PageElement) => { props: Record<string, unknown>; errors: string[]; condition?: boolean };
  evaluateCondition: (condition: RuntimeCondition) => boolean;
  isElementRemoved: (id: string) => boolean;
  styleOverrideFor: (id: string) => CSSProperties;
  runInteractions: (node: RuntimeNode, trigger: InteractionTrigger, eventOrValue?: unknown) => void;
  interactionHandlers: (node: RuntimeNode, interactive?: boolean) => RuntimeInteractionHandlers;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function textValue(value: unknown): string {
  try { return expressionText(value); } catch { return ""; }
}

/** Kept for callers of the old API; assignments are now strictly validated, never silently coerced. */
export function coerceVariableValue(type: VariableType, value: unknown): unknown {
  const error = validateVariableValue({ type }, value);
  if (error) throw new Error(error);
  return value;
}

/** Enumeration only. Never use this flattened list for scope resolution. */
export function collectRuntimeVariables(page: LandingPage): VariableDefinition[] {
  const walk = (elements: PageElement[]): VariableDefinition[] => elements.flatMap((element) => [
    ...(element.variables ?? []), ...walk(element.children ?? []),
  ]);
  return [...(page.variables ?? []), ...page.sections.flatMap((section) => [
    ...(section.variables ?? []), ...walk(sectionElements(section)),
  ])];
}

function templateLookup(variables: Record<string, unknown>, path: string) {
  const name = path.trim();
  return Object.hasOwn(variables, name) ? resolveVariablePath(variables, `[${JSON.stringify(name)}]`) : resolveVariablePath(variables, name);
}
export function interpolateVariables(value: unknown, variables: Record<string, unknown>): string {
  return textValue(value).replace(/{{\s*([^{}]+?)\s*}}/g, (token, name: string) => {
    const resolved = templateLookup(variables, name);
    return resolved === undefined ? token : textValue(resolved);
  });
}
function resolveTemplateValue(value: unknown, variables: Record<string, unknown>): unknown {
  if (typeof value === "string") {
    const exact = value.match(/^{{\s*([^{}]+?)\s*}}$/);
    if (exact) return templateLookup(variables, exact[1]);
    return interpolateVariables(value, variables);
  }
  if (Array.isArray(value)) return value.map((item) => resolveTemplateValue(item, variables));
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveTemplateValue(item, variables)]));
  return value;
}
function conditionValuesEqual(actual: unknown, expected: unknown): boolean {
  if (actual === null || expected === null || typeof actual !== "object" || typeof expected !== "object") return actual === expected;
  // The safe serializer rejects accessors/cycles; compare the resulting data without object-key-order sensitivity.
  const left: unknown = JSON.parse(expressionText(actual));
  const right: unknown = JSON.parse(expressionText(expected));
  const equal = (a: unknown, b: unknown): boolean => {
    if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return a === b;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((key) => Object.hasOwn(b, key)
      && equal((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
  };
  return equal(left, right);
}
export function evaluateVariableCondition(actual: unknown, operator = "truthy", expected?: unknown): boolean {
  const compareNumbers = (compare: (a: number, b: number) => boolean) => {
    if (typeof actual !== "number" || !Number.isFinite(actual) || typeof expected !== "number" || !Number.isFinite(expected)) {
      throw new Error(`Condition "${operator}" requires two finite numbers; text is not converted to a number.`);
    }
    return compare(actual, expected);
  };
  switch (operator.trim().toLowerCase()) {
    case "falsy": case "is-falsy": return !actual;
    case "equals": case "equal": case "eq": case "is": case "==": case "===": return conditionValuesEqual(actual, expected);
    case "not-equals": case "not-equal": case "neq": case "is-not": case "!=": case "!==": return !conditionValuesEqual(actual, expected);
    case "greater-than": case "gt": case ">": return compareNumbers((a, b) => a > b);
    case "greater-than-or-equal": case "gte": case ">=": return compareNumbers((a, b) => a >= b);
    case "less-than": case "lt": case "<": return compareNumbers((a, b) => a < b);
    case "less-than-or-equal": case "lte": case "<=": return compareNumbers((a, b) => a <= b);
    case "contains": {
      if (Array.isArray(actual)) return (JSON.parse(expressionText(actual)) as unknown[]).some((item) => conditionValuesEqual(item, expected));
      if (typeof actual === "string" && typeof expected === "string") return actual.includes(expected);
      throw new Error('Condition "contains" requires an array, or text with a text comparison value.');
    }
    case "not-contains": return !evaluateVariableCondition(actual, "contains", expected);
    case "truthy": case "is-truthy": return Boolean(actual);
    default: throw new Error(`Unknown condition operator "${operator}".`);
  }
}

function readEvent(eventOrValue: unknown): EventSnapshot {
  if (!isRecord(eventOrValue)) return { value: eventOrValue };
  // Bubbling form events carry the input on target, not necessarily currentTarget.
  const target = isRecord(eventOrValue.target) ? eventOrValue.target : isRecord(eventOrValue.currentTarget) ? eventOrValue.currentTarget : null;
  const key = typeof eventOrValue.key === "string" ? eventOrValue.key : undefined;
  if (!target) return { value: eventOrValue, key };
  const checked = typeof target.checked === "boolean" ? target.checked : undefined;
  const value = checked !== undefined && target.type === "checkbox" ? checked
    : target.type === "number" && typeof target.valueAsNumber === "number" ? target.valueAsNumber
    : "value" in target ? target.value : undefined;
  return { value, checked, key };
}
function changeStyleProperty(styles: StyleProps, property: string, value: unknown): StyleProps {
  const normalized = property === "background-color" || property === "backgroundColor" ? "background"
    : property.replace(/^(padding|margin)-?(Top|Right|Bottom|Left|top|right|bottom|left)$/, (_, box: string, side: string) => `${box}.${side.toLowerCase()}`);
  const edge = normalized.match(/^(padding|margin)\.(top|right|bottom|left)$/);
  if (edge) {
    const box = edge[1] as "padding" | "margin";
    return { ...styles, [box]: { ...styles[box], [edge[2]]: textValue(value) } };
  }
  if (["__proto__", "constructor", "prototype"].includes(normalized)) throw new Error("Unsafe style property.");
  return { ...styles, [normalized]: textValue(value) };
}

export function freshRuntimeState(scope: string): RuntimeState {
  return { scope, values: {}, removedElements: {}, styleOverrides: {}, errors: {} };
}
function definitionFor(definitions: VariableDefinition[], reference: string) {
  const name = reference.trim();
  return definitions.find((definition) => definition.id === name)
    ?? [...definitions].reverse().find((definition) => definition.name.trim() === name);
}
function variableValue(definition: VariableDefinition, state: RuntimeState) {
  return Object.hasOwn(state.values, definition.id) ? state.values[definition.id] : definition.value;
}
function namedValues(definitions: VariableDefinition[], state: RuntimeState, locals: Record<string, unknown>) {
  const values: Record<string, unknown> = Object.create(null);
  for (const definition of definitions) if (definition.name.trim()) values[definition.name.trim()] = variableValue(definition, state);
  return Object.assign(values, locals);
}
export function resolveRuntimeBinding(binding: ValueBinding, definitions: VariableDefinition[], state: RuntimeState, locals: Record<string, unknown> = {}): unknown {
  if (binding.mode === "expression") return evaluateExpression(binding.expression, namedValues(definitions, state, locals));
  const definition = definitions.find((candidate) => candidate.id === binding.variableId);
  if (!definition) throw new Error(`Variable "${binding.variableId}" is not visible in this scope.`);
  const value = resolveVariablePath(variableValue(definition, state), binding.path);
  if (binding.path?.trim() && value === undefined) throw new Error(`Variable "${definition.name}" has no value at path "${binding.path}". Check the field or list index.`);
  return value;
}

/** All condition sources use the same operator. Literal/bound comparisons never reinterpret text as a template. */
export function evaluateRuntimeCondition(
  condition: RuntimeCondition, definitions: VariableDefinition[], state: RuntimeState, locals: Record<string, unknown> = {},
): boolean {
  if (condition.binding) return evaluateVariableCondition(resolveRuntimeBinding(condition.binding, definitions, state, locals), condition.operator, condition.value);
  if (Object.hasOwn(condition, "literal")) return evaluateVariableCondition(condition.literal, condition.operator, condition.value);
  const reference = condition.variableName?.trim();
  if (!reference) return evaluateVariableCondition(true, condition.operator, condition.value);
  const definition = definitionFor(definitions, reference);
  if (!definition) throw new Error(`Variable "${reference}" is not visible in this scope.`);
  return evaluateVariableCondition(variableValue(definition, state), condition.operator, resolveTemplateValue(condition.value, namedValues(definitions, state, locals)));
}

function assignmentError(definition: VariableDefinition | undefined, reference: string, value: unknown, locals: Record<string, unknown> = {}): string | null {
  if (Object.hasOwn(locals, reference.trim()) && definition?.id !== reference.trim()) return `"${reference}" is a read-only item alias; assign a declared variable by ID instead.`;
  if (!definition) return `Variable "${reference}" is not visible in this scope.`;
  if (definition.schema && definition.schema.type !== definition.type) return `Variable "${definition.name}" has a schema/type mismatch.`;
  const error = validateVariableValue(definition.schema ?? { type: definition.type }, value);
  return error ? `${definition.name}: ${error}` : null;
}

/** Pure reducer: bindings in one event run in order against the latest state, including earlier assignments. */
export function applyRuntimeInteractions(
  state: RuntimeState, node: RuntimeNode, trigger: InteractionTrigger, eventOrValue: unknown,
  definitions: VariableDefinition[], locals: Record<string, unknown> = {},
): RuntimeState {
  const event = readEvent(eventOrValue);
  const eventValue = trigger === "keydown" ? event.key : event.value;
  const eventLocals = { ...locals, value: eventValue, checked: event.checked, key: event.key, event };
  let current = state;
  for (const interaction of node.interactions ?? []) {
    if (interaction.trigger !== trigger || (trigger === "keydown" && interaction.key && interaction.key !== event.key)) continue;
    try {
      const action = interaction.action;
      const values = namedValues(definitions, current, eventLocals);
      if (action.type === "set-variable" || action.type === "toggle-variable") {
        const definition = definitionFor(definitions, action.variableName);
        if (action.type === "toggle-variable" && definition?.type !== "boolean") throw new Error(`Toggle requires a visible boolean variable: "${action.variableName}".`);
        const value = action.type === "toggle-variable" ? !variableValue(definition!, current)
          : action.binding ? resolveRuntimeBinding(action.binding, definitions, current, eventLocals)
          : action.value === undefined ? eventValue : resolveTemplateValue(action.value, values);
        const error = assignmentError(definition, action.variableName, value, locals);
        if (error) throw new Error(error);
        current = { ...current, values: { ...current.values, [definition!.id]: structuredClone(value) } };
      } else {
        const targetId = !action.targetId || action.targetId === "self" ? node.id : action.targetId;
        if (action.type === "remove-element") current = { ...current, removedElements: { ...current.removedElements, [targetId]: true } };
        else current = { ...current, styleOverrides: { ...current.styleOverrides, [targetId]: changeStyleProperty(current.styleOverrides[targetId] ?? {}, action.property, resolveTemplateValue(action.value, values)) } };
      }
      const errors = { ...current.errors };
      delete errors[interaction.id];
      current = { ...current, errors };
    } catch (error) {
      current = { ...current, errors: { ...current.errors, [interaction.id]: error instanceof Error ? error.message : String(error) } };
    }
  }
  return current;
}

export function prepareRuntimePage(page: LandingPage): LandingPage {
  const migrated = migratePage(page);
  return { ...migrated, sections: migrated.sections.map(applySlotOverrides) };
}

type RuntimeEnvironment = {
  state: RuntimeState;
  update: (updater: (state: RuntimeState) => RuntimeState) => void;
  definitionsFor: (nodeId?: string) => VariableDefinition[];
  localsFor: (nodeId?: string) => Record<string, unknown>;
  defaultNodeId?: string;
};
const RuntimeContext = createContext<RuntimeEnvironment | null>(null);

export function LandingRuntimeProvider({ page, children }: { page: LandingPage; children: ReactNode }) {
  const prepared = useMemo(() => prepareRuntimePage(page), [page]);
  const scope = `${page.id}:${page.updatedAt}`;
  const [stored, setState] = useState(() => freshRuntimeState(scope));
  const state = stored.scope === scope ? stored : freshRuntimeState(scope);
  const environment: RuntimeEnvironment = {
    state,
    update: (updater) => setState((current) => updater(current.scope === scope ? current : freshRuntimeState(scope))),
    definitionsFor: (nodeId) => getScopedVariables(prepared, nodeId),
    localsFor: () => ({}),
  };
  return <RuntimeContext.Provider value={environment}>{children}</RuntimeContext.Provider>;
}

/** A section scope, or a repeated forest with isolated cloned declarations and read-only item/index aliases. */
export function LandingRuntimeScope({ nodeId, elements, values, children }: {
  nodeId: string; elements?: PageElement[]; values?: Record<string, unknown>; children: ReactNode;
}) {
  const parent = useContext(RuntimeContext);
  if (!parent) return children;
  const outer = parent.definitionsFor(nodeId);
  const environment: RuntimeEnvironment = {
    ...parent,
    defaultNodeId: nodeId,
    localsFor: (id) => {
      if (!elements) return parent.localsFor(id ?? nodeId);
      const path = id ? findElementPath(elements, id) : null;
      if (!path && id && id !== nodeId) return parent.localsFor(id);
      const locals = { ...parent.localsFor(nodeId), ...values };
      // Item aliases live at the repeat boundary; declarations inside the template are nearer scopes.
      for (const element of path ?? []) for (const variable of element.variables ?? []) delete locals[variable.name.trim()];
      return locals;
    },
    definitionsFor: (id) => {
      if (!elements) return parent.definitionsFor(id ?? nodeId);
      const path = id ? findElementPath(elements, id) : null;
      return path ? [...outer, ...path.flatMap((element) => element.variables ?? [])]
        : !id || id === nodeId ? outer : parent.definitionsFor(id);
    },
  };
  return <RuntimeContext.Provider value={environment}>{children}</RuntimeContext.Provider>;
}

const TEXT_PROPS = new Set(["text", "label", "title", "body", "footer", "placeholder", "alt", "href", "src", "options", "markup"]);
const STATIC_RUNTIME: LandingRuntimeValue = {
  enabled: false, variables: {}, errors: {}, setVariable: () => null, toggleVariable: () => null,
  interpolate: textValue, resolveBinding: () => undefined,
  resolveElementProps: (element) => ({ props: element.props, errors: [] }),
  evaluateCondition: () => true, isElementRemoved: () => false, styleOverrideFor: () => ({}),
  runInteractions: () => undefined, interactionHandlers: () => ({}),
};

export function useLandingRuntime(nodeId?: string): LandingRuntimeValue {
  const environment = useContext(RuntimeContext);
  if (!environment) return STATIC_RUNTIME;
  const { state, update } = environment;
  const locals = environment.localsFor(nodeId ?? environment.defaultNodeId);
  const definitions = environment.definitionsFor(nodeId ?? environment.defaultNodeId);
  const variables = namedValues(definitions, state, locals);
  const resolveBinding = (binding: ValueBinding) => resolveRuntimeBinding(binding, definitions, state, locals);
  const runInteractions = (node: RuntimeNode, trigger: InteractionTrigger, event?: unknown) => {
    // Snapshot React events before the state updater runs (currentTarget is otherwise cleared).
    const snapshot = readEvent(event);
    const stableEvent = { target: { value: snapshot.value, checked: snapshot.checked, type: typeof snapshot.value === "boolean" ? "checkbox" : undefined }, key: snapshot.key };
    update((current) => applyRuntimeInteractions(current, node, trigger, stableEvent, environment.definitionsFor(node.id), environment.localsFor(node.id)));
  };
  const setVariable = (name: string, value: unknown): string | null => {
    const error = assignmentError(definitionFor(definitions, name), name, value, locals);
    if (!error) update((current) => ({ ...current, values: { ...current.values, [definitionFor(definitions, name)!.id]: structuredClone(value) } }));
    return error;
  };
  return {
    enabled: true, variables, errors: state.errors, setVariable, resolveBinding,
    toggleVariable: (name) => {
      const definition = definitionFor(definitions, name);
      if (!definition || definition.type !== "boolean") return `Toggle requires a visible boolean variable: "${name}".`;
      const error = assignmentError(definition, name, !variableValue(definition, state), locals);
      if (error) return error;
      update((current) => applyRuntimeInteractions(current, { id: nodeId ?? "page", interactions: [{ id: `toggle:${definition.id}`, trigger: "click", action: { type: "toggle-variable", variableName: definition.id } }] }, "click", undefined, definitions));
      return null;
    },
    interpolate: (value) => interpolateVariables(value, variables),
    resolveElementProps: (element) => {
      const props = { ...element.props };
      const errors: string[] = [];
      const failedProps = new Set<string>();
      for (const [key, binding] of Object.entries(element.bindings ?? {})) {
        const isText = TEXT_PROPS.has(key) || (key === "value" && ["input", "textarea", "select"].includes(element.type));
        try {
          const value = resolveBinding(binding);
          props[key] = isText ? expressionText(value) : value;
        } catch (error) {
          props[key] = isText ? "" : undefined;
          failedProps.add(key);
          errors.push(`${key}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      let condition: boolean | undefined;
      if (element.type === "conditional") {
        condition = false;
        if (!["condition", "operator", "value"].some((key) => failedProps.has(key))) {
          try {
            const source = Object.hasOwn(props, "condition") ? { literal: props.condition }
              : { variableName: typeof props.variableName === "string" ? props.variableName : undefined };
            condition = evaluateRuntimeCondition({
              ...source, operator: typeof props.operator === "string" ? props.operator : undefined, value: props.value,
            }, definitions, state, locals);
          } catch (error) {
            errors.push(`condition: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
      return { props, errors, condition };
    },
    evaluateCondition: (condition) => {
      try { return evaluateRuntimeCondition(condition, definitions, state, locals); }
      catch { return false; }
    },
    isElementRemoved: (id) => Boolean(state.removedElements[id]),
    styleOverrideFor: (id) => styleToCss(state.styleOverrides[id]),
    runInteractions,
    interactionHandlers: (node, interactive = true) => {
      if (!interactive || !node.interactions?.length) return {};
      const triggers = new Set(node.interactions.map((binding) => binding.trigger));
      const handlers: RuntimeInteractionHandlers = {};
      if (triggers.has("click")) handlers.onClick = (event) => runInteractions(node, "click", event);
      if (triggers.has("input")) handlers.onInput = (event) => runInteractions(node, "input", event);
      if (triggers.has("change")) handlers.onChange = (event) => runInteractions(node, "change", event);
      if (triggers.has("keydown")) handlers.onKeyDown = (event) => runInteractions(node, "keydown", event);
      if (triggers.has("drag-start")) handlers.onDragStart = (event) => runInteractions(node, "drag-start", event);
      if (triggers.has("drag-end")) handlers.onDragEnd = (event) => runInteractions(node, "drag-end", event);
      if (triggers.has("drag-start") || triggers.has("drag-end")) handlers.draggable = true;
      return handlers;
    },
  };
}
