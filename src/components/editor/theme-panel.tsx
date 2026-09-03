"use client";

import { useEditor } from "@/components/editor/editor-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FONT_OPTIONS } from "@/lib/defaults";

const colorFields = [
  ["primary", "Primary"],
  ["secondary", "Secondary"],
  ["accent", "Accent"],
  ["background", "Background"],
  ["foreground", "Text"],
  ["muted", "Muted surface"],
  ["mutedForeground", "Muted text"],
  ["card", "Card"],
  ["border", "Border"],
] as const;

export function ThemePanel() {
  const { page, updateTheme } = useEditor();
  const theme = page.theme;

  function readLogo(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      updateTheme({ logo: typeof reader.result === "string" ? reader.result : null });
    };
    reader.readAsDataURL(file);
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-5 p-4">
        <div>
          <h3 className="text-sm font-semibold">Brand</h3>
          <p className="text-xs text-muted-foreground">
            These tokens restyle every section on the live page.
          </p>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Brand name</Label>
          <Input value={theme.brandName} onChange={(event) => updateTheme({ brandName: event.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Logo</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) readLogo(file);
            }}
          />
          {theme.logo ? (
            <div className="flex items-center justify-between rounded-md border p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={theme.logo} alt="Logo preview" className="h-8 w-auto" />
              <button type="button" className="text-xs text-muted-foreground" onClick={() => updateTheme({ logo: null })}>
                Remove
              </button>
            </div>
          ) : null}
        </div>
        <div className="grid gap-3">
          {colorFields.map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <input
                type="color"
                className="h-9 w-9 cursor-pointer rounded border bg-transparent p-0"
                value={theme.colors[key]}
                onChange={(event) => updateTheme({ colors: { [key]: event.target.value } })}
              />
              <div className="min-w-0 flex-1">
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <Input
                  value={theme.colors[key]}
                  onChange={(event) => updateTheme({ colors: { [key]: event.target.value } })}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Heading font</Label>
          <Select
            value={theme.fonts.heading}
            onValueChange={(value) => updateTheme({ fonts: { heading: value } })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((font) => (
                <SelectItem key={font.label} value={font.value}>
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Body font</Label>
          <Select value={theme.fonts.body} onValueChange={(value) => updateTheme({ fonts: { body: value } })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((font) => (
                <SelectItem key={`body-${font.label}`} value={font.value}>
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Corner radius ({theme.radius}px)</Label>
          <input
            type="range"
            min={0}
            max={32}
            value={theme.radius}
            onChange={(event) => updateTheme({ radius: Number(event.target.value) })}
          />
        </div>
      </div>
    </ScrollArea>
  );
}
