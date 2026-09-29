"use client";

import { useId, useMemo, useRef } from "react";
import { inferEditorSchema } from "@/components/editor/variable-value-editor";
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
import { Textarea } from "@/components/ui/textarea";
import { evaluateExpression } from "@/lib/expressions";
import { resolveVariablePath } from "@/lib/variables";
import type { ValueBinding, ValueSchema, VariableDefinition } from "@/lib/types";

export type ValueBindingEditorProps = {
  binding?: ValueBinding;
  variables: VariableDefinition[];
  onChange: (binding: ValueBinding | undefined) => void;
  label?: string;
};

type FieldOption = { path: string; type: ValueSchema["type"] };

function fieldPath(parent: string, name: string) {
  return /^[A-Za-z_$][\w$]*$/.test(name) && !["true", "false", "null", "undefined"].includes(name)
    ? `${parent}${parent ? "." : ""}${name}`
    : `${parent}[${JSON.stringify(name)}]`;
}

function variableFields(variable: VariableDefinition): FieldOption[] {
  const options: FieldOption[] = [];
  function visit(schema: ValueSchema, value: unknown, path: string, depth: number) {
    if (depth > 6 || options.length >= 150) return;
    if (path) options.push({ path, type: schema.type });
    if (schema.type === "object") {
      const object = value !== null && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown> : {};
      const fields = { ...Object.fromEntries(Object.entries(object).map(([name, item]) => [name, inferEditorSchema(item)])), ...schema.fields };
      for (const [name, field] of Object.entries(fields)) {
        visit(field, Object.hasOwn(object, name) ? object[name] : undefined, fieldPath(path, name), depth + 1);
      }
    } else if (schema.type === "array") {
      const items = Array.isArray(value) ? value : [];
      const count = Math.min(Math.max(items.length, schema.items ? 1 : 0), 30);
      for (let index = 0; index < count; index += 1) {
        visit(schema.items ?? inferEditorSchema(items[index]), items[index], `${path}[${index}]`, depth + 1);
      }
    }
  }
  visit(variable.schema ?? { ...inferEditorSchema(variable.value), type: variable.type }, variable.value, "", 0);
  return options;
}

function expressionName(variable: VariableDefinition) {
  const name = variable.name.trim();
  return /^[A-Za-z_$][\w$]*$/.test(name) && !["true", "false", "null", "undefined", "If", "Concat", "Length", "__proto__", "prototype", "constructor"].includes(name)
    ? name : null;
}

function expressionField(name: string, path: string) {
  return path ? `${name}${path.startsWith("[") ? "" : "."}${path}` : name;
}

function formatPreview(value: unknown) {
  if (value === undefined) return "No value";
  const text = typeof value === "string" ? JSON.stringify(value) : JSON.stringify(value, null, 2) ?? String(value);
  return text.length > 500 ? `${text.slice(0, 500)}…` : text;
}

const FUNCTIONS = [
  { name: "If", expression: 'If(true, "Yes", "No")', help: "Choose between two values" },
  { name: "Concat", expression: 'Concat("Hello", " world")', help: "Join text together" },
  { name: "Length", expression: 'Length("")', help: "Count text characters, list items or object fields" },
];

export function ValueBindingEditor({ binding, variables, onChange, label = "Value source" }: ValueBindingEditorProps) {
  const id = useId();
  const expressionInput = useRef<HTMLTextAreaElement>(null);
  const mode = binding?.mode ?? "literal";
  const selectedVariable = binding?.mode === "variable"
    ? variables.find((variable) => variable.id === binding.variableId) : undefined;
  const path = binding?.mode === "variable" ? binding.path ?? "" : "";
  const fields = useMemo(() => selectedVariable ? variableFields(selectedVariable) : [], [selectedVariable]);
  const expressionOptions = useMemo(() => {
    if (mode !== "expression") return [];
    const visibleByName = new Map(variables.map((variable) => [variable.name.trim(), variable]));
    return [...visibleByName.values()].flatMap((variable) => {
      const name = expressionName(variable);
      if (!name) return [];
      return [
        { expression: name, label: `${name} · ${variable.type}` },
        ...variableFields(variable).map((field) => ({
          expression: expressionField(name, field.path),
          label: `${name} → ${field.path} · ${field.type}`,
        })),
      ];
    });
  }, [mode, variables]);

  let preview: string | undefined;
  let error: string | undefined;
  if (binding) {
    try {
      if (binding.mode === "variable") {
        if (!selectedVariable) throw new Error(binding.variableId
          ? "This variable is missing or outside this element's scope. Choose another variable."
          : "Choose a variable to use its value.");
        const value = resolveVariablePath(selectedVariable.value, binding.path);
        if (value === undefined && binding.path) throw new Error("This field or list item has no value yet. Check the path and the variable's initial value.");
        preview = formatPreview(value);
      } else {
        if (!binding.expression.trim()) throw new Error("Enter an expression or insert a field below.");
        const values = Object.fromEntries(variables.map((variable) => [variable.name.trim(), variable.value]));
        preview = formatPreview(evaluateExpression(binding.expression, values));
      }
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "This value could not be evaluated.";
    }
  }

  function variableLabel(variable: VariableDefinition) {
    const matches = variables.filter((item) => item.name.trim() === variable.name.trim());
    const scope = matches.length > 1 ? matches[matches.length - 1].id === variable.id ? " · nearest scope" : " · outer scope" : "";
    return `${variable.name || "Unnamed variable"} · ${variable.type}${scope}`;
  }

  function insertExpression(text: string) {
    if (binding?.mode !== "expression") return;
    const input = expressionInput.current;
    const start = input?.selectionStart ?? binding.expression.length;
    const end = input?.selectionEnd ?? start;
    const expression = binding.expression.slice(0, start) + text + binding.expression.slice(end);
    onChange({ mode: "expression", expression });
    requestAnimationFrame(() => {
      expressionInput.current?.focus();
      expressionInput.current?.setSelectionRange(start + text.length, start + text.length);
    });
  }

  return (
    <div className="min-w-0 space-y-2" role="group" aria-labelledby={`${id}-label`}>
      <Label id={`${id}-label`} className="text-[11px] text-zinc-500 dark:text-zinc-400">{label}</Label>
      <div className="grid grid-cols-3 gap-1 rounded-md bg-zinc-100 p-0.5 dark:bg-zinc-800">
        {(["literal", "variable", "expression"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            className={`h-7 rounded text-[11px] capitalize ${mode === option ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50" : "text-zinc-500 dark:text-zinc-400"}`}
            onClick={() => {
              if (option === mode) return;
              if (option === "literal") onChange(undefined);
              else if (option === "variable") onChange({ mode: "variable", variableId: variables[0]?.id ?? "" });
              else onChange({ mode: "expression", expression: "" });
            }}
          >{option}</button>
        ))}
      </div>

      {binding?.mode === "variable" ? (
        <div className="space-y-2">
          <Select value={binding.variableId || ""} onValueChange={(variableId) => onChange({ mode: "variable", variableId })}>
            <SelectTrigger aria-label={`${label} variable`} className="h-8 text-xs">
              <SelectValue placeholder="Choose a variable" />
            </SelectTrigger>
            <SelectContent>
              {binding.variableId && !selectedVariable ? <SelectItem value={binding.variableId} disabled>Missing / out-of-scope variable</SelectItem> : null}
              {variables.map((variable) => (
                <SelectItem key={variable.id} value={variable.id}>
                  {variableLabel(variable)}
                </SelectItem>
              ))}
              {!variables.length && !binding.variableId ? <SelectItem value="__none" disabled>No variables in this scope</SelectItem> : null}
            </SelectContent>
          </Select>
          {!variables.length ? <p className="text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">Add a variable in Logic on this page, section, or a parent frame first.</p> : null}
          {selectedVariable ? (
            <>
              {fields.length || path ? (
                <div className="space-y-1">
                  <Label className="text-[11px] text-zinc-500 dark:text-zinc-400">Field or item</Label>
                  <Select value={`path:${path}`} onValueChange={(next) => onChange({ ...binding, path: next.slice(5) || undefined })}>
                    <SelectTrigger aria-label={`${label} field or item`} className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="path:">Whole value</SelectItem>
                      {path && !fields.some((field) => field.path === path) ? <SelectItem value={`path:${path}`}>{path} · custom path</SelectItem> : null}
                      {fields.map((field) => <SelectItem key={field.path} value={`path:${field.path}`}>{field.path} · {field.type}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <details className="text-[11px] text-zinc-500 dark:text-zinc-400">
                <summary className="cursor-pointer">Custom field path</summary>
                <Input
                  aria-label={`${label} custom field path`}
                  className="mt-1 h-8 text-xs"
                  value={path}
                  onChange={(event) => onChange({ ...binding, path: event.target.value || undefined })}
                  placeholder="e.g. address.city or items[0].title"
                  aria-invalid={Boolean(path && error)}
                />
                <p className="mt-1 leading-4">Leave empty for the whole value. List positions start at 0.</p>
              </details>
            </>
          ) : null}
        </div>
      ) : binding?.mode === "expression" ? (
        <div className="space-y-2">
          <Textarea
            ref={expressionInput}
            aria-label={`${label} expression`}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
            className="min-h-20 font-mono text-xs"
            rows={3}
            spellCheck={false}
            value={binding.expression}
            onChange={(event) => onChange({ mode: "expression", expression: event.target.value })}
            placeholder={'e.g. Concat("Hello ", customer.name)'}
          />
          <Select value="" onValueChange={insertExpression}>
            <SelectTrigger aria-label="Insert variable or field into expression" className="h-8 text-xs"><SelectValue placeholder="Insert a variable or field…" /></SelectTrigger>
            <SelectContent>
              {expressionOptions.map((option) => <SelectItem key={option.expression} value={option.expression}>{option.label}</SelectItem>)}
              {!expressionOptions.length ? <SelectItem value="__none" disabled>No named variables available</SelectItem> : null}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-1">
            {FUNCTIONS.map((fn) => (
              <Button key={fn.name} type="button" size="sm" variant="outline" className="h-6 px-2 font-mono text-[10px]"
                title={fn.help} aria-label={`Insert ${fn.name}: ${fn.help}`} onClick={() => insertExpression(fn.expression)}>
                {fn.name}
              </Button>
            ))}
          </div>
          <p className="text-[10px] leading-4 text-zinc-500 dark:text-zinc-400">
            Use names, fields, list indexes, + − * /, comparisons, && / ||, and If, Concat or Length. Text needs quotes.
          </p>
          {variables.some((variable) => !expressionName(variable)) ? (
            <p className="text-[11px] leading-4 text-amber-700 dark:text-amber-400">
              Some variable names cannot be inserted into expressions. Rename them in Logic using letters, numbers and underscores, or choose Variable mode instead.
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p id={`${id}-error`} role="alert" className="break-words text-[11px] leading-4 text-red-600 dark:text-red-400">{error}</p>
      ) : binding ? (
        <div className="space-y-1 rounded-md bg-zinc-100 p-2 dark:bg-zinc-800/70">
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Preview · initial variable values</p>
          <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words text-[11px]" aria-live="polite">{preview}</pre>
        </div>
      ) : null}
    </div>
  );
}
