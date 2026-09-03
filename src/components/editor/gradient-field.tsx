"use client";

import { Plus, Trash2 } from "lucide-react";
import { ColorPickerBody, ColorSwatch } from "@/components/editor/color-field";
import { MiniInput, SliderRow } from "@/components/editor/compact-controls";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Stop = { color: string; at: string };

function parseGradient(value: string) {
  const match = value.match(/(linear|radial)-gradient\((.+)\)/i);
  if (!match) {
    return {
      kind: "linear",
      angle: "135deg",
      stops: [
        { color: "#0f766e", at: "0%" },
        { color: "#f59e0b", at: "100%" },
      ] as Stop[],
    };
  }
  const kind = match[1];
  const inner = match[2];
  const angle = inner.match(/(\d+deg)/)?.[1] ?? "135deg";
  const stopMatches = [...inner.matchAll(/(#(?:[0-9a-f]{3,8})|rgba?\([^)]+\))(?:\s+(\d+%))?/gi)];
  const stops: Stop[] =
    stopMatches.length > 0
      ? stopMatches.map((item, index, all) => ({
          color: item[1],
          at: item[2] ?? `${Math.round((index / Math.max(all.length - 1, 1)) * 100)}%`,
        }))
      : [
          { color: "#0f766e", at: "0%" },
          { color: "#f59e0b", at: "100%" },
        ];
  return { kind, angle, stops };
}

function serialize(kind: string, angle: string, stops: Stop[]) {
  const inner = stops.map((stop) => `${stop.color} ${stop.at}`).join(", ");
  return kind === "radial" ? `radial-gradient(circle, ${inner})` : `linear-gradient(${angle}, ${inner})`;
}

function nextStop(stops: Stop[]): Stop {
  const percents = stops.map((stop) => Number.parseFloat(stop.at) || 0);
  const last = stops[stops.length - 1];
  const prev = stops[stops.length - 2] ?? stops[0];
  const mid = Math.round(((Number.parseFloat(prev.at) || 0) + (Number.parseFloat(last.at) || 100)) / 2);
  const taken = new Set(percents);
  let at = Number.isFinite(mid) ? mid : 50;
  while (taken.has(at) && at < 100) at += 5;
  return { color: last.color, at: `${at}%` };
}

export function GradientField({
  label,
  value,
  onChange,
  swatches,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  swatches?: string[];
}) {
  const parsed = parseGradient(value);
  const gradient = serialize(parsed.kind, parsed.angle, parsed.stops);
  const angle = Number.parseInt(parsed.angle, 10) || 0;

  function update(patch: Partial<typeof parsed> & { stops?: Stop[] }) {
    const next = { ...parsed, ...patch };
    onChange(serialize(next.kind, next.angle, next.stops));
  }

  function updateStop(index: number, patch: Partial<Stop>) {
    update({
      stops: parsed.stops.map((stop, stopIndex) => (stopIndex === index ? { ...stop, ...patch } : stop)),
    });
  }

  return (
    <div className="grid gap-1.5">
      {label ? <Label className="text-[11px] text-zinc-500">{label}</Label> : null}
      <div className="h-6 rounded-[3px] ring-1 ring-black/5" style={{ backgroundImage: gradient }} />
      <div className="grid grid-cols-2 gap-1">
        <Select value={parsed.kind} onValueChange={(kind) => update({ kind })}>
          <SelectTrigger className="h-5 border-0 bg-zinc-100 text-[11px] shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="linear">Linear</SelectItem>
            <SelectItem value="radial">Radial</SelectItem>
          </SelectContent>
        </Select>
        {parsed.kind === "linear" ? (
          <MiniInput
            value={angle}
            suffix="°"
            width="w-full"
            onChange={(next) => update({ angle: `${Number.parseInt(next, 10) || 0}deg` })}
          />
        ) : (
          <div />
        )}
      </div>
      {parsed.kind === "linear" ? (
        <SliderRow value={angle} min={0} max={360} suffix="°" onChange={(next) => update({ angle: `${next}deg` })} />
      ) : null}
      <button
        type="button"
        className="h-5 text-left text-[10px] uppercase tracking-wide text-zinc-400 hover:text-zinc-700"
        onClick={() =>
          update({
            stops: [...parsed.stops].reverse().map((stop, index) => ({
              color: stop.color,
              at: parsed.stops[index]?.at ?? stop.at,
            })),
          })
        }
      >
        Reverse
      </button>
      <div className="grid gap-1">
        {parsed.stops.map((stop, index) => (
          <div key={`${stop.color}-${index}`} className="flex items-center gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="flex h-5 min-w-0 flex-1 items-center gap-1.5 rounded-[3px] bg-zinc-100 px-1.5">
                  <ColorSwatch color={stop.color} />
                  <span className="truncate font-mono text-[10px]">{stop.color}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="editor-popover w-[220px] p-2.5">
                <ColorPickerBody color={stop.color} onChange={(color) => updateStop(index, { color })} swatches={swatches} />
              </PopoverContent>
            </Popover>
            <MiniInput
              value={Number.parseFloat(stop.at) || 0}
              suffix="%"
              onChange={(next) => updateStop(index, { at: `${Number.parseFloat(next) || 0}%` })}
            />
            {parsed.stops.length > 2 ? (
              <button
                type="button"
                className="grid size-5 place-items-center text-zinc-400 hover:text-red-600"
                onClick={() => update({ stops: parsed.stops.filter((_, stopIndex) => stopIndex !== index) })}
              >
                <Trash2 className="size-3" />
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {parsed.stops.length < 5 ? (
        <button
          type="button"
          className="flex h-5 items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-800"
          onClick={() => update({ stops: [...parsed.stops, nextStop(parsed.stops)] })}
        >
          <Plus className="size-3" />
          Add color
        </button>
      ) : null}
      <button type="button" className="text-left text-[11px] text-zinc-400 hover:text-zinc-700" onClick={() => onChange("")}>
        Clear gradient
      </button>
    </div>
  );
}
