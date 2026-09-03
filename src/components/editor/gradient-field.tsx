"use client";

import { Plus, Trash2 } from "lucide-react";
import { ColorPickerBody, ColorSwatch } from "@/components/editor/color-field";
import { Input } from "@/components/ui/input";
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
    <div className="grid gap-2">
      {label ? <Label className="text-[11px] text-zinc-500">{label}</Label> : null}
      <div className="h-8 rounded-sm ring-1 ring-black/5" style={{ backgroundImage: gradient }} />
      <div className="grid grid-cols-2 gap-1.5">
        <Select value={parsed.kind} onValueChange={(kind) => update({ kind })}>
          <SelectTrigger className="h-6 text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="linear">Linear</SelectItem>
            <SelectItem value="radial">Radial</SelectItem>
          </SelectContent>
        </Select>
        {parsed.kind === "linear" ? (
          <Input
            value={parsed.angle}
            onChange={(event) => update({ angle: event.target.value })}
            className="h-6 text-[11px]"
          />
        ) : (
          <div />
        )}
      </div>
      {parsed.kind === "linear" ? (
        <input
          type="range"
          min={0}
          max={360}
          value={Number.parseInt(parsed.angle, 10) || 0}
          onChange={(event) => update({ angle: `${event.target.value}deg` })}
          className="h-4 w-full accent-zinc-900"
        />
      ) : null}
      <button
        type="button"
        className="h-6 rounded-sm text-[11px] text-zinc-500 hover:bg-zinc-100"
        onClick={() =>
          update({
            stops: [...parsed.stops].reverse().map((stop, index) => ({
              color: stop.color,
              at: parsed.stops[index]?.at ?? stop.at,
            })),
          })
        }
      >
        Reverse colors
      </button>
      <div className="grid gap-1">
        {parsed.stops.map((stop, index) => (
          <div key={`${stop.color}-${index}`} className="flex items-center gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="flex h-6 flex-1 items-center gap-1.5 rounded-sm bg-zinc-100 px-1.5">
                  <ColorSwatch color={stop.color} />
                  <span className="font-mono text-[11px]">{stop.color}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-3">
                <ColorPickerBody color={stop.color} onChange={(color) => updateStop(index, { color })} swatches={swatches} />
              </PopoverContent>
            </Popover>
            <Input
              value={stop.at}
              onChange={(event) => updateStop(index, { at: event.target.value })}
              className="h-6 w-14 px-1 text-center text-[11px]"
            />
            {parsed.stops.length > 2 ? (
              <button
                type="button"
                className="grid size-6 place-items-center text-zinc-400 hover:text-red-600"
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
          className="flex h-6 items-center justify-center gap-1 rounded-sm text-[11px] text-zinc-500 hover:bg-zinc-100"
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
