"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { useEditor } from "@/components/editor/editor-context";
import { ValueBindingEditor } from "@/components/editor/value-binding-editor";
import { defaultValueForSchema, inferEditorSchema, VariableValueEditor, VARIABLE_VALUE_TYPES as VARIABLE_TYPES } from "@/components/editor/variable-value-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { allSectionElements, findElementWithAncestors } from "@/lib/slots";
import { evaluateExpression } from "@/lib/expressions";
import { getScopedVariables, resolveVariablePath, validateVariableValue } from "@/lib/variables";
import type {
  InteractionAction,
  InteractionBinding,
  InteractionTrigger,
  PageElement,
  ValueBinding,
  ValueSchema,
  VariableDefinition,
  VariableType,
} from "@/lib/types";

const LOCAL_VARIABLE_ELEMENT_TYPES = new Set(["frame", "slot", "list", "conditional"]);


const TRIGGERS: { value: InteractionTrigger; label: string }[] = [
  { value: "click", label: "Click" },
  { value: "input", label: "Input" },
  { value: "change", label: "Change" },
  { value: "keydown", label: "Key press" },
  { value: "drag-start", label: "Drag starts" },
  { value: "drag-end", label: "Drag ends" },
];

type ActionType = InteractionAction["type"];
type StyleProperty = "color" | "background" | "opacity" | "display";

type VariableOption = {
  variable: VariableDefinition;
  label: string;
};


function variableForReference(options: VariableOption[], reference: string) {
  return options.find((option) => option.variable.id === reference)?.variable
    ?? [...options].reverse().find((option) => option.variable.name.trim() === reference)?.variable;
}

type ElementTarget = {
  id: string;
  label: string;
};

const ACTION_TYPES: { value: ActionType; label: string }[] = [
  { value: "set-variable", label: "Set a variable" },
  { value: "toggle-variable", label: "Toggle a yes / no variable" },
  { value: "remove-element", label: "Remove an element" },
  { value: "change-style", label: "Change an element style" },
];

const STYLE_PROPERTIES: { value: StyleProperty; label: string }[] = [
  { value: "color", label: "Text color" },
  { value: "background", label: "Background" },
  { value: "opacity", label: "Opacity" },
  { value: "display", label: "Display" },
];

function LogicField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1">
      <Label className="text-[11px] text-zinc-500 dark:text-zinc-400">{label}</Label>
      {children}
    </div>
  );
}

function variablesOf(value: unknown): VariableDefinition[] {
  if (!value || typeof value !== "object") return [];
  const variables = (value as { variables?: unknown }).variables;
  return Array.isArray(variables) ? (variables as VariableDefinition[]) : [];
}

function interactionsOf(value: unknown): InteractionBinding[] {
  if (!value || typeof value !== "object") return [];
  const interactions = (value as { interactions?: unknown }).interactions;
  return Array.isArray(interactions) ? (interactions as InteractionBinding[]) : [];
}

function variableSchema(variable: VariableDefinition): ValueSchema {
  return variable.schema ?? { ...inferEditorSchema(variable.value), type: variable.type };
}

function defaultVariableValue(variable?: VariableDefinition): unknown {
  return defaultValueForSchema(variable ? variableSchema(variable) : { type: "text" });
}

function variableNameError(variable: VariableDefinition, variables: VariableDefinition[]) {
  const name = variable.name.trim();
  if (!name) return "Give this variable a name.";
  if (!/^[A-Za-z_$][\w$]*$/.test(name) || name !== variable.name) {
    return "Use a name such as customerName: no spaces, and do not start with a number. Existing direct bindings still use the variable's ID.";
  }
  if (["true", "false", "null", "undefined", "If", "Concat", "Length", "__proto__", "prototype", "constructor"].includes(name)) {
    return "This name is reserved. Choose another name for use in expressions.";
  }
  if (variables.some((other) => other.id !== variable.id && other.name.trim() === name)) {
    return "This name is already used in this scope. Choose a unique name so expressions are unambiguous.";
  }
  return null;
}

function bindingPreview(binding: ValueBinding | undefined, variables: VariableDefinition[]) {
  if (!binding) return undefined;
  try {
    if (binding.mode === "expression") {
      return { value: evaluateExpression(binding.expression, Object.fromEntries(variables.map((variable) => [variable.name.trim(), variable.value]))) };
    }
    const variable = variables.find((item) => item.id === binding.variableId);
    return variable ? { value: resolveVariablePath(variable.value, binding.path) } : undefined;
  } catch {
    // The binding editor displays the parser/path error next to its source field.
    return undefined;
  }
}

function nextVariableName(variables: VariableDefinition[]) {
  let number = variables.length + 1;
  const names = new Set(variables.map((variable) => variable.name.trim().toLowerCase()));
  while (names.has(`variable${number}`)) number += 1;
  return `variable${number}`;
}

function VariableEditor({
  title,
  description,
  variables,
  onChange,
}: {
  title: string;
  description: string;
  variables: VariableDefinition[];
  onChange: (variables: VariableDefinition[]) => void;
}) {
  function updateVariable(id: string, patch: Partial<VariableDefinition>) {
    onChange(variables.map((variable) => (variable.id === id ? { ...variable, ...patch } : variable)));
  }

  function addVariable() {
    onChange([
      ...variables,
      {
        id: nanoid(10),
        name: nextVariableName(variables),
        type: "text",
        schema: { type: "text" },
        value: "",
      },
    ]);
  }

  return (
    <section className="space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">{title}</h4>
          <p className="mt-0.5 text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 shrink-0 px-2 text-[11px]"
          onClick={addVariable}
        >
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>

      {variables.length ? (
        <div className="space-y-2">
          {variables.map((variable) => (
            <div
              key={variable.id}
              className="space-y-2 rounded-md border border-zinc-200 bg-zinc-50/70 p-2 dark:border-zinc-800 dark:bg-zinc-900/60"
            >
              <div className="flex items-center gap-1.5">
                <Input
                  aria-label="Variable name"
                  aria-invalid={Boolean(variableNameError(variable, variables))}
                  className="h-8 min-w-0 text-xs font-medium"
                  value={variable.name}
                  onChange={(event) => updateVariable(variable.id, { name: event.target.value })}
                  placeholder="Variable name"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8 shrink-0 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
                  onClick={() => onChange(variables.filter((item) => item.id !== variable.id))}
                  title="Delete variable"
                  aria-label={`Delete ${variable.name || "variable"}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              {variableNameError(variable, variables) ? (
                <p role="alert" className="text-[11px] leading-4 text-red-600 dark:text-red-400">
                  {variableNameError(variable, variables)}
                </p>
              ) : null}
              <LogicField label="Type">
                <Select
                  value={variable.type}
                  onValueChange={(next) => {
                    const type = next as VariableType;
                    const schema: ValueSchema = { type };
                    updateVariable(variable.id, { type, schema, value: defaultValueForSchema(schema) });
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VARIABLE_TYPES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </LogicField>
              <LogicField label="Value">
                <VariableValueEditor
                  key={`${variable.id}:${variable.type}`}
                  schema={variableSchema(variable)}
                  value={variable.value}
                  label={`${variable.name || "Variable"} initial value`}
                  onChange={(value, schema) => updateVariable(variable.id, { value, schema })}
                />
              </LogicField>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-zinc-300 px-3 py-3 text-center text-[11px] leading-4 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No variables yet. Add one when content or interactions need a reusable value.
        </p>
      )}
    </section>
  );
}

function elementName(element: PageElement) {
  const type = element.type.replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase());
  const candidate = [element.props.label, element.props.text, element.props.title, element.props.name, element.props.alt]
    .find((value) => typeof value === "string" && value.trim()) as string | undefined;
  if (!candidate) return type;
  const compact = candidate.replace(/\s+/g, " ").trim();
  const preview = compact.length > 28 ? `${compact.slice(0, 27)}…` : compact;
  return `${type} — ${preview}`;
}

function pageElementTargets(page: ReturnType<typeof useEditor>["page"]): ElementTarget[] {
  const seen = new Set<string>();
  const targets: ElementTarget[] = [];
  for (const section of page.sections) {
    for (const { element } of allSectionElements(section)) {
      if (seen.has(element.id)) continue;
      seen.add(element.id);
      targets.push({ id: element.id, label: `${section.name} · ${elementName(element)}` });
    }
  }
  return targets;
}

function scopedVariableOptions(
  pageVariables: VariableDefinition[],
  sectionName: string | null,
  sectionVariables: VariableDefinition[],
  elementPath: PageElement[],
): VariableOption[] {
  const options: VariableOption[] = [];

  function add(variables: VariableDefinition[], scope: string) {
    for (const variable of variables) {
      const name = variable.name.trim();
      if (!name) continue;

      options.push({
        variable,
        label: `${name} · ${scope}`,
      });
    }
  }

  add(pageVariables, "Page");
  if (sectionName) add(sectionVariables, sectionName);
  elementPath.forEach((element, index) => {
    const scope = index === elementPath.length - 1 ? "This element" : `${elementName(element)} parent`;
    add(variablesOf(element), scope);
  });
  return options;
}

function VariableSelect({
  value,
  options,
  onChange,
  emptyLabel = "No variables available",
}: {
  value: string;
  options: VariableOption[];
  onChange: (value: string) => void;
  emptyLabel?: string;
}) {
  const selected = variableForReference(options, value);
  return (
    <Select value={selected?.id ?? value} onValueChange={onChange}>
      <SelectTrigger aria-label="Target variable" aria-invalid={Boolean(value && !selected)} className="h-8 text-xs">
        <SelectValue placeholder="Choose a variable" />
      </SelectTrigger>
      <SelectContent>
        {value && !selected ? <SelectItem value={value} disabled>Missing / out-of-scope variable</SelectItem> : null}
        {options.length ? (
          options.map((option) => (
            <SelectItem key={option.variable.id} value={option.variable.id}>
              {option.label}
            </SelectItem>
          ))
        ) : (
          <SelectItem value="__no_variables" disabled>
            {emptyLabel}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}

function TargetSelect({
  value,
  targets,
  onChange,
}: {
  value: string;
  targets: ElementTarget[];
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder="Choose an element" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="self">This element</SelectItem>
        {targets.map((target) => (
          <SelectItem key={target.id} value={target.id}>
            {target.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}


function createAction(
  type: ActionType,
  variables: VariableOption[],
): InteractionAction {
  const targetId = "self";
  if (type === "set-variable") {
    const variable = variables[0]?.variable;
    return {
      type,
      variableName: variable?.id ?? "",
      value: defaultVariableValue(variable),
    };
  }
  if (type === "toggle-variable") {
    const variable = variables.find((option) => option.variable.type === "boolean")?.variable;
    return { type, variableName: variable?.id ?? "" };
  }
  if (type === "remove-element") return { type, targetId };
  return { type: "change-style", targetId, property: "background", value: "transparent" };
}

function SetVariableValueEditor({
  action,
  variables,
  trigger,
  onChange,
}: {
  action: Extract<InteractionAction, { type: "set-variable" }>;
  variables: VariableOption[];
  trigger: InteractionTrigger;
  onChange: (action: InteractionAction) => void;
}) {
  const variable = variableForReference(variables, action.variableName);
  const schema = variable ? variableSchema(variable) : { type: "text" as const };
  const definitions = variables.map((option) => option.variable);
  const preview = bindingPreview(action.binding, definitions);
  const error = preview ? validateVariableValue(schema, preview.value) : null;
  const isEventValue = !action.binding && action.value === undefined;
  const supportsEventValue = trigger === "input" || trigger === "change" || trigger === "keydown";

  return (
    <div className="space-y-2">
      <ValueBindingEditor
        label="New value source"
        binding={action.binding}
        variables={definitions}
        onChange={(binding) => onChange({
          ...action,
          binding,
          value: !binding && action.value === undefined ? defaultVariableValue(variable) : action.value,
        })}
      />
      {!action.binding ? (
        <>
          {supportsEventValue || isEventValue ? (
            <div className="grid grid-cols-2 gap-1 rounded-md bg-zinc-100 p-0.5 dark:bg-zinc-800">
              <button
                type="button"
                aria-pressed={!isEventValue}
                className={`h-6 rounded text-[10px] ${!isEventValue ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50" : "text-zinc-500 dark:text-zinc-400"}`}
                onClick={() => { if (isEventValue) onChange({ ...action, binding: undefined, value: defaultVariableValue(variable) }); }}
              >Fixed value</button>
              <button
                type="button"
                aria-pressed={isEventValue}
                className={`h-6 rounded text-[10px] ${isEventValue ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50" : "text-zinc-500 dark:text-zinc-400"}`}
                onClick={() => onChange({ ...action, binding: undefined, value: undefined })}
              >Event value</button>
            </div>
          ) : null}
          {isEventValue ? (
            <p className="text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
              {supportsEventValue
                ? "Uses the current input, selected option, checked state, or pressed key."
                : "This action uses an event value. Choose Input, Change, or Key press to receive a value, or switch to Fixed value."}
            </p>
          ) : (
            <LogicField label="Fixed value">
              <VariableValueEditor
                key={`${action.variableName}:${schema.type}`}
                schema={schema}
                value={action.value}
                editSchema={false}
                label={`New ${variable?.name || "variable"} value`}
                onChange={(value) => onChange({ ...action, value })}
              />
            </LogicField>
          )}
        </>
      ) : null}
      {error ? <p role="alert" className="text-[11px] leading-4 text-red-600 dark:text-red-400">Does not match {variable?.name || "the target variable"}: {error}</p> : null}
    </div>
  );
}

function ActionEditor({
  action,
  variables,
  targets,
  trigger,
  onChange,
}: {
  action: InteractionAction;
  variables: VariableOption[];
  targets: ElementTarget[];
  trigger: InteractionTrigger;
  onChange: (action: InteractionAction) => void;
}) {
  const booleanVariables = variables.filter((option) => option.variable.type === "boolean");

  return (
    <div className="space-y-2">
      <LogicField label="Action">
        <Select
          value={action.type}
          onValueChange={(next) =>
            onChange(createAction(next as ActionType, variables))
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_TYPES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </LogicField>

      {action.type === "set-variable" ? (
        <>
          <LogicField label="Variable">
            <VariableSelect
              value={action.variableName}
              options={variables}
              onChange={(variableName) => {
                const variable = variableForReference(variables, variableName);
                onChange({
                  ...action,
                  variableName,
                  value: action.value === undefined ? undefined : defaultVariableValue(variable),
                });
              }}
            />
          </LogicField>
          {variables.length ? (
            <SetVariableValueEditor action={action} variables={variables} trigger={trigger} onChange={onChange} />
          ) : (
            <p className="text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
              Add a page, section, or local variable before using this action.
            </p>
          )}
        </>
      ) : null}

      {action.type === "toggle-variable" ? (
        <LogicField label="Yes / no variable">
          <VariableSelect
            value={action.variableName}
            options={booleanVariables}
            emptyLabel="No yes / no variables available"
            onChange={(variableName) => onChange({ type: "toggle-variable", variableName })}
          />
        </LogicField>
      ) : null}

      {action.type === "remove-element" ? (
        <LogicField label="Element to remove">
          <TargetSelect
            value={action.targetId}
            targets={targets}
            onChange={(targetId) => onChange({ ...action, targetId })}
          />
        </LogicField>
      ) : null}

      {action.type === "change-style" ? (
        <>
          <LogicField label="Element to change">
            <TargetSelect
              value={action.targetId}
              targets={targets}
              onChange={(targetId) => onChange({ ...action, targetId })}
            />
          </LogicField>
          <LogicField label="Style">
            <Select
              value={action.property}
              onValueChange={(property) => onChange({ ...action, property: property as StyleProperty })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLE_PROPERTIES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </LogicField>
          <LogicField label="Style value">
            <Input
              className="h-8 text-xs"
              value={typeof action.value === "string" || typeof action.value === "number" ? action.value : ""}
              onChange={(event) => onChange({ ...action, value: event.target.value })}
              placeholder={action.property === "opacity" ? "0.5" : action.property === "display" ? "none" : "#111827"}
            />
          </LogicField>
        </>
      ) : null}
    </div>
  );
}

function InteractionEditor({
  interactions,
  variables,
  targets,
  onChange,
}: {
  interactions: InteractionBinding[];
  variables: VariableOption[];
  targets: ElementTarget[];
  onChange: (interactions: InteractionBinding[]) => void;
}) {
  function replaceBinding(id: string, next: InteractionBinding) {
    onChange(interactions.map((binding) => (binding.id === id ? next : binding)));
  }

  function addInteraction() {
    const actionType: ActionType = variables.length ? "set-variable" : "change-style";
    onChange([
      ...interactions,
      {
        id: nanoid(10),
        trigger: "click",
        action: createAction(actionType, variables),
      },
    ]);
  }

  return (
    <section className="space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">Interactions</h4>
          <p className="mt-0.5 text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
            Choose what happens when someone uses this element.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 shrink-0 px-2 text-[11px]"
          onClick={addInteraction}
        >
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>

      {interactions.length ? (
        <div className="space-y-2">
          {interactions.map((binding) => (
            <div
              key={binding.id}
              className="space-y-2 rounded-md border border-zinc-200 bg-zinc-50/70 p-2 dark:border-zinc-800 dark:bg-zinc-900/60"
            >
              <div className="flex items-end gap-1.5">
                <div className="min-w-0 flex-1">
                  <LogicField label="When">
                    <Select
                      value={binding.trigger}
                      onValueChange={(next) => {
                        const trigger = next as InteractionTrigger;
                        const updated = { ...binding, trigger };
                        if (trigger === "keydown") updated.key ??= "";
                        else delete updated.key;
                        replaceBinding(binding.id, updated);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRIGGERS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </LogicField>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8 shrink-0 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
                  onClick={() => onChange(interactions.filter((item) => item.id !== binding.id))}
                  title="Delete interaction"
                  aria-label="Delete interaction"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>

              {binding.trigger === "keydown" ? (
                <LogicField label="Key">
                  <Input
                    className="h-8 text-xs"
                    value={binding.key ?? ""}
                    onChange={(event) => replaceBinding(binding.id, { ...binding, key: event.target.value })}
                    placeholder="Enter"
                  />
                </LogicField>
              ) : null}

              <ActionEditor
                action={binding.action}
                variables={variables}
                targets={targets}
                trigger={binding.trigger}
                onChange={(action) => replaceBinding(binding.id, { ...binding, action })}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-zinc-300 px-3 py-3 text-center text-[11px] leading-4 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No interactions yet. Add one to make this element respond to a visitor.
        </p>
      )}
    </section>
  );
}

function LiteralValueEditor({
  value,
  suggestedSchema,
  label,
  onChange,
}: {
  value: unknown;
  suggestedSchema?: ValueSchema;
  label: string;
  onChange: (value: unknown) => void;
}) {
  const [draft, setDraft] = useState<{ value: unknown; schema: ValueSchema } | null>(null);
  const schema = draft && Object.is(draft.value, value) ? draft.schema : inferEditorSchema(value, suggestedSchema);
  return (
    <VariableValueEditor
      schema={schema}
      value={value}
      label={label}
      allowTypeChange
      onChange={(next, nextSchema) => {
        setDraft({ value: next, schema: nextSchema });
        onChange(next);
      }}
    />
  );
}

function comparisonSchemaFor(operator: string, actual: ValueSchema): ValueSchema {
  if (operator.startsWith("greater-than") || operator.startsWith("less-than")) return { type: "number" };
  if (operator.includes("contains") && actual.type === "array") return actual.items ?? { type: "text" };
  return actual;
}

const CONDITION_OPERATORS = [
  { value: "truthy", label: "Has a value / is yes" },
  { value: "falsy", label: "Is empty / is no" },
  { value: "equals", label: "Equals" },
  { value: "not-equals", label: "Does not equal" },
  { value: "greater-than", label: "Is greater than" },
  { value: "greater-than-or-equal", label: "Is greater than or equal to" },
  { value: "less-than", label: "Is less than" },
  { value: "less-than-or-equal", label: "Is less than or equal to" },
  { value: "contains", label: "Contains" },
  { value: "not-contains", label: "Does not contain" },
];

function ConditionalEditor({
  element,
  variables,
  onUpdate,
  onBindingChange,
}: {
  element: PageElement;
  variables: VariableOption[];
  onUpdate: (key: string, value: unknown) => void;
  onBindingChange: (binding: ValueBinding | undefined) => void;
}) {
  const binding = element.bindings?.condition;
  const definitions = variables.map((option) => option.variable);
  const operator = typeof element.props.operator === "string" ? element.props.operator : "truthy";
  const literal = element.props.condition ?? true;
  const actual = binding ? bindingPreview(binding, definitions)?.value : literal;
  const actualSchema = inferEditorSchema(actual);
  const needsComparison = operator !== "truthy" && operator !== "falsy";
  const suggestedSchema = comparisonSchemaFor(operator, actualSchema);

  return (
    <section className="space-y-2.5">
      <div>
        <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">Condition</h4>
        <p className="mt-0.5 text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
          Choose a value to decide which branch is shown.
        </p>
      </div>
      <div className="space-y-2 rounded-md border border-zinc-200 bg-zinc-50/70 p-2 dark:border-zinc-800 dark:bg-zinc-900/60">
        <ValueBindingEditor label="Condition value" binding={binding} variables={definitions} onChange={onBindingChange} />
        {!binding ? (
          <LiteralValueEditor
            key={`literal:${element.id}`}
            label="Literal condition value"
            value={literal}
            onChange={(value) => onUpdate("condition", value)}
          />
        ) : null}
        <LogicField label="Test">
          <Select value={operator} onValueChange={(value) => {
            onUpdate("operator", value);
            if (value !== "truthy" && value !== "falsy" && element.props.value === undefined) {
              onUpdate("value", defaultValueForSchema(comparisonSchemaFor(value, actualSchema)));
            }
          }}>
            <SelectTrigger aria-label="Condition test" className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {!CONDITION_OPERATORS.some((item) => item.value === operator) ? <SelectItem value={operator}>{operator}</SelectItem> : null}
              {CONDITION_OPERATORS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </LogicField>
        {needsComparison ? (
          <LogicField label="Comparison value">
            <LiteralValueEditor
              key={`comparison:${element.id}`}
              suggestedSchema={suggestedSchema}
              value={element.props.value}
              label="Comparison value"
              onChange={(value) => onUpdate("value", value)}
            />
          </LogicField>
        ) : null}
        <div className="space-y-1 rounded-md border border-zinc-200 p-2 text-[11px] leading-4 dark:border-zinc-700">
          <p><strong>Then frame</strong> — shown when the condition matches.</p>
          <p><strong>Else frame</strong> — shown otherwise.</p>
          <p className="text-zinc-500 dark:text-zinc-400">
            Open this Conditional in Layers. Add and style content inside its Then and Else frames like any other frame. Leave Else empty to show nothing when false. Use Live mode to test both branches.
          </p>
        </div>
      </div>
    </section>
  );
}

export function LogicEditor() {
  const {
    page,
    selectedSection,
    selectedElement,
    selectedElements,
    updatePage,
    updateSection,
    updateElementMeta,
    updateElement,
    updateElementProp,
  } = useEditor();

  const elementPath = useMemo(() => {
    if (!selectedSection || !selectedElement) return [];
    const found = findElementWithAncestors(selectedSection, selectedElement.id);
    return found ? [...found.ancestors, found.element] : [selectedElement];
  }, [selectedElement, selectedSection]);

  const targets = useMemo(() => pageElementTargets(page), [page]);
  const variableOptions = useMemo(() => {
    const labels = scopedVariableOptions(
      variablesOf(page),
      selectedSection ? `Section: ${selectedSection.name}` : null,
      variablesOf(selectedSection),
      elementPath,
    );
    return getScopedVariables(page, selectedElement?.id ?? selectedSection?.id).map((variable) => ({
      variable,
      label: labels.find((option) => option.variable.id === variable.id)?.label ?? variable.name,
    }));
  }, [elementPath, page, selectedElement, selectedSection]);

  if (selectedElements.length > 1) {
    return (
      <p className="text-[12px] leading-5 text-zinc-500 dark:text-zinc-400">
        Select one element to edit its variables and interactions.
      </p>
    );
  }

  const supportsLocalVariables = Boolean(
    selectedElement && LOCAL_VARIABLE_ELEMENT_TYPES.has(String(selectedElement.type)),
  );
  const ownedVariables = selectedElement
    ? supportsLocalVariables
      ? variablesOf(selectedElement)
      : null
    : variablesOf(selectedSection ?? page);

  const title = selectedElement
    ? `${elementName(selectedElement)} logic`
    : selectedSection
      ? `${selectedSection.name} logic`
      : "Page logic";

  function updateOwnedVariables(variables: VariableDefinition[]) {
    if (selectedElement && selectedSection && supportsLocalVariables) {
      updateElementMeta(
        selectedSection.id,
        selectedElement.id,
        { variables } as unknown as Parameters<typeof updateElementMeta>[2],
      );
      return;
    }
    if (!selectedElement && selectedSection) {
      updateSection(
        selectedSection.id,
        { variables } as unknown as Parameters<typeof updateSection>[1],
      );
      return;
    }
    if (!selectedElement) {
      updatePage({ variables } as unknown as Parameters<typeof updatePage>[0]);
    }
  }

  function updateInteractions(interactions: InteractionBinding[]) {
    if (!selectedSection || !selectedElement) return;
    updateElementMeta(
      selectedSection.id,
      selectedElement.id,
      { interactions } as unknown as Parameters<typeof updateElementMeta>[2],
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">Logic</p>
        <h3 className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      </div>

      {selectedElement?.type === "frame" ? (
        <div className="rounded-md border border-[#0d99ff]/30 bg-[#0d99ff]/5 p-2 text-[11px] leading-4 text-zinc-600 dark:text-zinc-300">
          <span className="font-semibold text-zinc-800 dark:text-zinc-100">Dropdown recipe:</span> add a Yes / no
          variable, set a button click to Toggle it, then place menu items inside the Then frame of a Conditional bound to that variable.
          Use Live mode to test it.
        </div>
      ) : null}

      {ownedVariables ? (
        <VariableEditor
          title={selectedElement ? "Local variables" : selectedSection ? "Section variables" : "Page variables"}
          description={
            selectedElement
              ? "Values available to this element and its descendants. Local names override matching names in outer scopes."
              : selectedSection
                ? "Values shared by this section. Section names override matching page variable names."
                : "Values available across this page."
          }
          variables={ownedVariables}
          onChange={updateOwnedVariables}
        />
      ) : null}

      {selectedElement && String(selectedElement.type) === "conditional" && selectedSection ? (
        <ConditionalEditor
          element={selectedElement}
          variables={variableOptions}
          onUpdate={(key, value) => updateElementProp(selectedSection.id, selectedElement.id, key, value)}
          onBindingChange={(binding) => {
            const bindings = { ...selectedElement.bindings };
            if (binding) bindings.condition = binding;
            else delete bindings.condition;
            updateElement(selectedSection.id, selectedElement.id, { bindings });
          }}
        />
      ) : null}

      {selectedElement && variableOptions.length ? (
        <details className="text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
          <summary className="cursor-pointer">Available variables and scopes</summary>
          <ul className="mt-1 space-y-1">
            {variableOptions.map((option) => <li key={option.variable.id} className="break-words">{option.label}</li>)}
          </ul>
          <p className="mt-1">The nearest scope wins when names match.</p>
        </details>
      ) : null}

      {selectedElement ? (
        <InteractionEditor
          interactions={interactionsOf(selectedElement)}
          variables={variableOptions}
          targets={targets}
          onChange={updateInteractions}
        />
      ) : null}
    </div>
  );
}
