"use client";

import { useId, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import { inferValueSchema, validateVariableValue } from "@/lib/variables";
import type { ValueSchema, VariableType } from "@/lib/types";

export const VARIABLE_VALUE_TYPES: { value: VariableType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Yes / no" },
  { value: "array", label: "List" },
  { value: "object", label: "Object" },
];

// Incomplete/legacy values must remain editable even when strict inference rejects them.
export function inferEditorSchema(value: unknown, fallback: ValueSchema = { type: "text" }): ValueSchema {
  try {
    return inferValueSchema(value);
  } catch {
    if (Array.isArray(value)) return { type: "array" };
    if (value !== null && typeof value === "object") return { type: "object" };
    return fallback;
  }
}

export function defaultValueForSchema(schema: ValueSchema): unknown {
  switch (schema.type) {
    case "text": return "";
    case "number": return 0;
    case "boolean": return false;
    case "array": return [];
    case "object":
      return Object.fromEntries(
        Object.entries(schema.fields ?? {}).map(([name, field]) => [name, defaultValueForSchema(field)]),
      );
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// A list has one shared item schema. Apply structural edits to its other rows,
// preserving their existing values wherever the field types have not changed.
function reconcileSchema(value: unknown, previous: ValueSchema, next: ValueSchema): unknown {
  if (previous.type !== next.type) return defaultValueForSchema(next);
  if (next.type === "array" && Array.isArray(value) && next.items) {
    const items = next.items;
    return value.map((item) => reconcileSchema(item, previous.items ?? inferEditorSchema(item), items));
  }
  if (next.type === "object" && isObject(value)) {
    const fields = next.fields ?? {};
    const entries = Object.entries(value).filter(([name]) =>
      !Object.hasOwn(previous.fields ?? {}, name) || Object.hasOwn(fields, name),
    );
    const result = Object.fromEntries(entries);
    for (const [name, field] of Object.entries(fields)) {
      result[name] = Object.hasOwn(value, name)
        ? reconcileSchema(value[name], previous.fields?.[name] ?? inferEditorSchema(value[name]), field)
        : defaultValueForSchema(field);
    }
    return result;
  }
  return value;
}

function ValueTypeSelect({
  value,
  label,
  onChange,
}: {
  value: VariableType;
  label: string;
  onChange: (type: VariableType) => void;
}) {
  return (
    <Select value={value} onValueChange={(type) => onChange(type as VariableType)}>
      <SelectTrigger aria-label={label} className="h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {VARIABLE_VALUE_TYPES.map((type) => (
          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function NumberValueInput({
  value,
  onChange,
  label,
}: {
  value: unknown;
  onChange: (value: number) => void;
  label: string;
}) {
  const errorId = useId();
  const [draft, setDraft] = useState<{ source: unknown; text: string } | null>(null);
  const text = draft && Object.is(draft.source, value)
    ? draft.text
    : typeof value === "number" && Number.isFinite(value) ? String(value) : "";
  const valid = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(text.trim()) && Number.isFinite(Number(text));
  return (
    <div className="space-y-1">
      <Input
        aria-label={label}
        aria-invalid={!valid}
        aria-describedby={!valid ? errorId : undefined}
        className="h-8 text-xs"
        inputMode="decimal"
        value={text}
        placeholder="0"
        onChange={(event) => {
          const next = event.target.value;
          const parsed = Number(next);
          const isValid = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(next.trim()) && Number.isFinite(parsed);
          setDraft({ source: isValid ? parsed : value, text: next });
          if (isValid) onChange(parsed);
        }}
        onBlur={() => { if (valid) setDraft(null); }}
      />
      {!valid ? (
        <p id={errorId} role="alert" className="text-[11px] text-red-600 dark:text-red-400">
          Enter a finite number. The last valid value is kept until this is corrected.
        </p>
      ) : null}
    </div>
  );
}

export type VariableValueEditorProps = {
  schema: ValueSchema;
  value: unknown;
  onChange: (value: unknown, schema: ValueSchema) => void;
  label?: string;
  allowTypeChange?: boolean;
  editSchema?: boolean;
};

export function VariableValueEditor({
  schema,
  value,
  onChange,
  label = "Value",
  allowTypeChange = false,
  editSchema = true,
}: VariableValueEditorProps) {
  const errorId = useId();
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState<VariableType>("text");
  const error = validateVariableValue(schema, value);
  const object = isObject(value) ? value : {};
  const fields = schema.type === "object"
    ? { ...Object.fromEntries(Object.entries(object).map(([name, item]) => [name, inferEditorSchema(item)])), ...schema.fields }
    : {};
  const canEditFields = editSchema || schema.fields === undefined;
  const items = Array.isArray(value) ? value : [];
  const itemSchema = schema.items ?? { type: fieldType };
  const name = fieldName.trim();
  const fieldError = !name ? "Enter a field name." : !/^[A-Za-z_$][\w$]*$/.test(name)
    ? "Use letters, numbers or underscores; start with a letter or underscore."
    : ["__proto__", "prototype", "constructor"].includes(name)
      ? "This field name is reserved. Choose another name."
      : Object.hasOwn(fields, name) ? "A field with this name already exists." : null;
  const wrongShape = schema.type === "array" ? !Array.isArray(value)
    : schema.type === "object" ? !isObject(value) : false;

  function changeType(type: VariableType) {
    const next: ValueSchema = type === "array" ? { type, items: { type: "text" } }
      : type === "object" ? { type, fields: {} } : { type };
    onChange(defaultValueForSchema(next), next);
  }

  return (
    <div className="min-w-0 space-y-2" role="group" aria-label={label} aria-describedby={error ? errorId : undefined}>
      {allowTypeChange && editSchema ? (
        <div className="space-y-1">
          <Label className="text-[11px] text-zinc-500 dark:text-zinc-400">Type</Label>
          <ValueTypeSelect value={schema.type} label={`${label} type`} onChange={changeType} />
        </div>
      ) : null}

      {schema.type === "text" ? (
        <Input
          aria-label={label}
          aria-invalid={Boolean(error)}
          className="h-8 text-xs"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value, schema)}
          placeholder="Enter text"
        />
      ) : schema.type === "number" ? (
        <NumberValueInput value={value} label={label} onChange={(next) => onChange(next, schema)} />
      ) : schema.type === "boolean" ? (
        <Select
          value={typeof value === "boolean" ? String(value) : ""}
          onValueChange={(next) => onChange(next === "true", schema)}
        >
          <SelectTrigger aria-label={label} aria-invalid={Boolean(error)} className="h-8 text-xs">
            <SelectValue placeholder="Choose yes or no" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Yes</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
      ) : wrongShape ? (
        <Button type="button" size="sm" variant="outline" className="h-7 text-[11px]"
          onClick={() => onChange(defaultValueForSchema(schema), schema)}>
          Reset to a default {schema.type === "array" ? "list" : "object"}
        </Button>
      ) : schema.type === "array" ? (
        <div className="space-y-2 rounded-md border border-zinc-200 p-2 dark:border-zinc-700">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{items.length} {items.length === 1 ? "item" : "items"}</span>
            <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[11px]"
              onClick={() => onChange([...items, defaultValueForSchema(itemSchema)], schema)}>
              <Plus className="size-3" /> Add item
            </Button>
          </div>
          {editSchema ? (
            <div className="space-y-1">
              <Label className="text-[11px] text-zinc-500 dark:text-zinc-400">Item type</Label>
              <Select value={schema.items?.type ?? "mixed"} onValueChange={(type) => {
                if (type === "mixed") {
                  onChange(items, { ...schema, items: undefined });
                  return;
                }
                const next: ValueSchema = { type: type as VariableType };
                onChange(items.map((item) => reconcileSchema(item, schema.items ?? inferEditorSchema(item), next)), { ...schema, items: next });
              }}>
                <SelectTrigger aria-label={`${label} item type`} className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mixed">Mixed · choose per item</SelectItem>
                  {VARIABLE_VALUE_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[10px] leading-4 text-zinc-500 dark:text-zinc-400">
                {schema.items ? "All items share a type and fields. Changing a type resets values of that type." : "Each item can have its own type. Choose a shared type to keep a list consistent."}
              </p>
            </div>
          ) : null}
          {!schema.items ? (
            <div className="space-y-1">
              <Label className="text-[11px] text-zinc-500 dark:text-zinc-400">New item type</Label>
              <ValueTypeSelect value={fieldType} label={`${label} new item type`} onChange={setFieldType} />
            </div>
          ) : null}
          {!items.length ? <p className="text-[11px] text-zinc-500 dark:text-zinc-400">This list is empty. Add its first item.</p> : null}
          {items.map((item, index) => (
            <div key={index} className="space-y-1.5 border-t border-zinc-200 pt-2 dark:border-zinc-700">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium">Item {index + 1}</span>
                <Button type="button" size="icon" variant="ghost" className="size-6 text-zinc-500 hover:text-red-600"
                  aria-label={`Remove ${label} item ${index + 1}`}
                  onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index), schema)}>
                  <Trash2 className="size-3" />
                </Button>
              </div>
              <VariableValueEditor
                schema={schema.items ?? inferEditorSchema(item)}
                value={item}
                label={`${label} item ${index + 1}`}
                allowTypeChange={!schema.items}
                editSchema={editSchema || !schema.items}
                onChange={(nextValue, nextSchema) => onChange(
                  items.map((current, itemIndex) => itemIndex === index ? nextValue : schema.items ? reconcileSchema(current, schema.items, nextSchema) : current),
                  schema.items ? { ...schema, items: nextSchema } : schema,
                )}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2 rounded-md border border-zinc-200 p-2 dark:border-zinc-700">
          {!Object.keys(fields).length ? <p className="text-[11px] text-zinc-500 dark:text-zinc-400">No fields yet.</p> : null}
          {Object.entries(fields).map(([key, field]) => (
            <div key={key} className="space-y-1.5 border-b border-zinc-200 pb-2 last:border-b-0 dark:border-zinc-700">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 break-words text-[11px] font-medium">{key}</span>
                {canEditFields ? (
                  <Button type="button" size="icon" variant="ghost" className="size-6 shrink-0 text-zinc-500 hover:text-red-600"
                    aria-label={`Remove field ${key}`}
                    onClick={() => onChange(
                      Object.fromEntries(Object.entries(object).filter(([name]) => name !== key)),
                      { ...schema, fields: Object.fromEntries(Object.entries(fields).filter(([name]) => name !== key)) },
                    )}>
                    <Trash2 className="size-3" />
                  </Button>
                ) : null}
              </div>
              <VariableValueEditor
                schema={field}
                value={Object.hasOwn(object, key) ? object[key] : undefined}
                label={`${label}.${key}`}
                allowTypeChange={canEditFields}
                editSchema={canEditFields}
                onChange={(nextValue, nextSchema) => onChange(
                  { ...object, [key]: nextValue },
                  { ...schema, fields: { ...fields, [key]: nextSchema } },
                )}
              />
            </div>
          ))}
          {canEditFields ? (
            <div className="space-y-1.5 pt-1">
              <Label className="text-[11px] text-zinc-500 dark:text-zinc-400">New field</Label>
              <Input
                aria-label={`${label} new field name`}
                className="h-8 text-xs"
                value={fieldName}
                onChange={(event) => setFieldName(event.target.value)}
                placeholder="e.g. title"
                aria-invalid={Boolean(fieldName && fieldError)}
              />
              <div className="flex items-center gap-1.5">
                <div className="min-w-0 flex-1">
                  <ValueTypeSelect value={fieldType} label={`${label} new field type`} onChange={setFieldType} />
                </div>
                <Button type="button" size="sm" variant="outline" className="h-8 shrink-0 px-2 text-[11px]"
                  disabled={Boolean(fieldError)}
                  onClick={() => {
                    if (fieldError) return;
                    const field: ValueSchema = { type: fieldType };
                    onChange({ ...object, [name]: defaultValueForSchema(field) }, { ...schema, fields: { ...fields, [name]: field } });
                    setFieldName("");
                  }}>
                  <Plus className="size-3" /> Add field
                </Button>
              </div>
              {fieldName && fieldError ? <p role="alert" className="text-[11px] text-red-600 dark:text-red-400">{fieldError}</p> : null}
            </div>
          ) : null}
        </div>
      )}
      {error ? <p id={errorId} role="alert" className="text-[11px] leading-4 text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}
