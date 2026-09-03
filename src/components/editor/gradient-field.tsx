"use client";

import { HexColorPicker } from "react-colorful";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function parseGradient(value: string) {
  const match = value.match(/(linear|radial)-gradient\((.+)\)/i);
  if (!match) {
    return { kind: "linear", angle: "135deg", start: "#0f766e", end: "#f59e0b" };
  }
  const kind = match[1];
  const inner = match[2];
  const colors = inner.match(/#(?:[0-9a-f]{3,8})/gi) ?? ["#0f766e", "#f59e0b"];
  const angle = inner.match(/(\d+deg)/)?.[1] ?? "135deg";
  return { kind, angle, start: colors[0], end: colors[1] ?? colors[0] };
}

export function GradientField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const parsed = parseGradient(value);
  const gradient =
    parsed.kind === "radial"
      ? `radial-gradient(circle, ${parsed.start}, ${parsed.end})`
      : `linear-gradient(${parsed.angle}, ${parsed.start}, ${parsed.end})`;

  function update(patch: Partial<typeof parsed>) {
    const next = { ...parsed, ...patch };
    onChange(
      next.kind === "radial"
        ? `radial-gradient(circle, ${next.start}, ${next.end})`
        : `linear-gradient(${next.angle}, ${next.start}, ${next.end})`,
    );
  }

  return (
    <div className="grid gap-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="h-10 rounded-md border" style={{ backgroundImage: gradient }} />
      <Select value={parsed.kind} onValueChange={(kind) => update({ kind })}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="linear">Linear</SelectItem>
          <SelectItem value="radial">Radial</SelectItem>
        </SelectContent>
      </Select>
      {parsed.kind === "linear" ? (
        <Input value={parsed.angle} onChange={(event) => update({ angle: event.target.value })} />
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        {(["start", "end"] as const).map((stop) => (
          <Popover key={stop}>
            <PopoverTrigger asChild>
              <button type="button" className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs">
                <span className="h-5 w-5 rounded border" style={{ background: parsed[stop] }} />
                {stop}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px]">
          <HexColorPicker className="color-picker" color={parsed[stop]} onChange={(color) => update({ [stop]: color })} />
            </PopoverContent>
          </Popover>
        ))}
      </div>
      <button type="button" className="text-left text-xs text-muted-foreground" onClick={() => onChange("")}>
        Clear gradient
      </button>
    </div>
  );
}
