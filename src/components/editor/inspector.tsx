"use client";

import type { ReactNode } from "react";
import { toast } from "sonner";
import { BookmarkPlus, Copy, Trash2 } from "lucide-react";
import { useEditor } from "@/components/editor/editor-context";
import { MediaPicker } from "@/components/editor/media-picker";
import { NodeMetaEditor } from "@/components/editor/style-editor";
import { ThemePanel } from "@/components/editor/theme-panel";
import { useComputedStyles } from "@/components/editor/use-computed-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { slotDefs, textSlot } from "@/lib/slots";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: unknown;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  const text = typeof value === "string" ? value : "";
  return (
    <Field label={label}>
      {multiline ? (
        <Textarea value={text} onChange={(event) => onChange(event.target.value)} rows={4} />
      ) : (
        <Input value={text} onChange={(event) => onChange(event.target.value)} />
      )}
    </Field>
  );
}

export function Inspector() {
  const { selectedSection, selectedElement, selectedSlotId } = useEditor();

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l bg-card">
      <Tabs defaultValue="content" className="flex min-h-0 flex-1 flex-col">
        <div className="border-b px-3 py-3">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="style">Style</TabsTrigger>
            <TabsTrigger value="theme">Theme</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="content" className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-4">
              {!selectedSection && !selectedElement ? <PageFields /> : null}
              {selectedSection && !selectedElement ? <SectionFields slotId={selectedSlotId} /> : null}
              {selectedElement && selectedSection ? <ElementFields /> : null}
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="style" className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="p-4">
              <StyleTab />
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="theme" className="min-h-0 flex-1">
          <ThemePanel />
        </TabsContent>
      </Tabs>
    </aside>
  );
}

function PageFields() {
  const { page, updatePage } = useEditor();
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Page settings</h3>
      <TextField label="Page name" value={page.name} onChange={(value) => updatePage({ name: value })} />
      <TextField label="Client" value={page.clientName} onChange={(value) => updatePage({ clientName: value })} />
      <TextField label="Slug" value={page.slug} onChange={(value) => updatePage({ slug: value })} />
      <Field label="Status">
        <Select value={page.status} onValueChange={(value) => updatePage({ status: value as "draft" | "published" })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <p className="text-xs text-muted-foreground">Select a section or element on the canvas. Slots fill with text or elements.</p>
    </div>
  );
}

function SectionFields({ slotId }: { slotId: string | null }) {
  const { selectedSection, updateSection, updateSectionProp, updateSlot, removeSection, duplicateSection } =
    useEditor();
  if (!selectedSection) return null;

  async function saveComponent() {
    if (!selectedSection) return;
    const name = window.prompt("Name this component", selectedSection.name);
    if (!name) return;
    const response = await fetch("/api/components", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, section: selectedSection }),
    });
    if (response.ok) toast.success("Component saved to the library");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Section component</p>
          <h3 className="text-sm font-semibold">{selectedSection.name}</h3>
        </div>
        <div className="flex">
          <Button size="icon" variant="ghost" onClick={saveComponent}>
            <BookmarkPlus className="size-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => duplicateSection(selectedSection.id)}>
            <Copy className="size-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => removeSection(selectedSection.id)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      <TextField
        label="Section name"
        value={selectedSection.name}
        onChange={(value) => updateSection(selectedSection.id, { name: value })}
      />
      <Separator />
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Slots</p>
      {slotId ? (
        <p className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-800">
          Slot selected: {slotDefs(selectedSection.type).find((slot) => slot.id === slotId)?.label ?? slotId}. Drop an
          element here or add one from the library.
        </p>
      ) : null}
      {slotDefs(selectedSection.type).map((slot) => {
        if (slot.kind === "text") {
          const value = textSlot(selectedSection, slot.id);
          const isMedia = slot.id === "images" || slot.id === "logos";
          return (
            <div key={slot.id} className="space-y-2">
              <TextField
                label={`${slot.label} (text)`}
                value={value}
                multiline={slot.id.includes("headline") || slot.id === "body" || slot.id === "subheadline" || isMedia}
                onChange={(next) => updateSlot(selectedSection.id, slot.id, next)}
              />
              {slot.id === "images" ? (
                <MediaPicker
                  label="Add image to gallery"
                  value=""
                  onChange={(src) => updateSlot(selectedSection.id, slot.id, `${value}\n${src}`.trim())}
                />
              ) : null}
            </div>
          );
        }
        return (
          <p key={slot.id} className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {slot.label} · {slot.kind} slot. Select it on the canvas or add an element while this section is active.
          </p>
        );
      })}
      <Separator />
      {Object.entries(selectedSection.props).map(([key, value]) => {
        if (typeof value === "boolean") {
          return (
            <Field key={key} label={key}>
              <Switch
                checked={value}
                onCheckedChange={(checked) => updateSectionProp(selectedSection.id, key, checked)}
              />
            </Field>
          );
        }
        if (Array.isArray(value)) {
          return (
            <TextField
              key={key}
              label={`${key} (JSON)`}
              value={JSON.stringify(value, null, 2)}
              multiline
              onChange={(next) => {
                try {
                  updateSectionProp(selectedSection.id, key, JSON.parse(next));
                } catch {
                  /* keep typing */
                }
              }}
            />
          );
        }
        return (
          <TextField
            key={key}
            label={key}
            value={value}
            onChange={(next) => updateSectionProp(selectedSection.id, key, next)}
          />
        );
      })}
    </div>
  );
}

function ElementFields() {
  const { selectedSection, selectedElement, updateElementProp, removeElement } = useEditor();
  if (!selectedSection || !selectedElement) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Element</p>
          <h3 className="text-sm font-semibold capitalize">{selectedElement.type}</h3>
        </div>
        <Button size="icon" variant="ghost" onClick={() => removeElement(selectedSection.id, selectedElement.id)}>
          <Trash2 className="size-4" />
        </Button>
      </div>
      {Object.entries(selectedElement.props).map(([key, value]) => {
        if (key === "src" && (selectedElement.type === "image" || selectedElement.type === "video")) {
          return (
            <MediaPicker
              key={key}
              label={selectedElement.type === "video" ? "Video" : "Image"}
              kind={selectedElement.type === "video" ? "video" : "image"}
              value={String(value ?? "")}
              onChange={(src) => updateElementProp(selectedSection.id, selectedElement.id, "src", src)}
            />
          );
        }
        if (typeof value === "boolean") {
          return (
            <Field key={key} label={key}>
              <Switch
                checked={value}
                onCheckedChange={(checked) => updateElementProp(selectedSection.id, selectedElement.id, key, checked)}
              />
            </Field>
          );
        }
        if (key === "variant") {
          return (
            <Field key={key} label="Variant">
              <Select
                value={String(value)}
                onValueChange={(next) => updateElementProp(selectedSection.id, selectedElement.id, key, next)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          );
        }
        if (key === "level") {
          return (
            <Field key={key} label="Level">
              <Select
                value={String(value)}
                onValueChange={(next) => updateElementProp(selectedSection.id, selectedElement.id, key, next)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["h1", "h2", "h3", "h4"].map((level) => (
                    <SelectItem key={level} value={level}>
                      {level.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          );
        }
        return (
          <TextField
            key={key}
            label={key}
            value={value}
            multiline={key === "text" || key === "body" || key === "options"}
            onChange={(next) => updateElementProp(selectedSection.id, selectedElement.id, key, next)}
          />
        );
      })}
    </div>
  );
}

function StyleTab() {
  const { page, selectedSection, selectedElement, updateSection, updateElementMeta } = useEditor();
  const nodeId = selectedElement?.id ?? selectedSection?.id ?? null;
  const { computed } = useComputedStyles(nodeId, page);
  if (selectedElement && selectedSection) {
    return (
      <NodeMetaEditor
        key={selectedElement.id}
        node={selectedElement}
        computed={computed}
        onChange={(patch) => updateElementMeta(selectedSection.id, selectedElement.id, patch)}
      />
    );
  }
  if (selectedSection) {
    return (
      <NodeMetaEditor
        key={selectedSection.id}
        node={selectedSection}
        computed={computed}
        onChange={(patch) => updateSection(selectedSection.id, patch)}
      />
    );
  }
  return <p className="text-xs text-muted-foreground">Select a section or element to edit CSS, classes, and IDs.</p>;
}
