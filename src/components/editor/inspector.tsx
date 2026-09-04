"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { BookmarkPlus, Component, Copy, ExternalLink, Trash2, Unlink } from "lucide-react";
import Link from "next/link";
import { useEditor } from "@/components/editor/editor-context";
import { MediaPicker } from "@/components/editor/media-picker";
import { AnimationEditor } from "@/components/editor/animation-editor";
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
import { cloneSection, createBlankBlockSection } from "@/lib/defaults";
import { editingBucket, mergeStyles, resolveNodeStyles } from "@/lib/node-styles";
import type { InteractionState } from "@/lib/types";
import { cn } from "@/lib/utils";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1">
      <Label className="text-[11px] text-zinc-500">{label}</Label>
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
  const { selectedSection, selectedElement, selectedElements, selectedSlotId } = useEditor();
  const multi = selectedElements.length > 1;

  return (
    <aside className="editor-ui flex h-full w-64 shrink-0 flex-col border-l border-zinc-200 bg-white">
      <Tabs defaultValue="style" className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-zinc-200 px-2 py-1.5">
          <TabsList className="grid h-7 w-full grid-cols-4 bg-zinc-100 p-0.5">
            <TabsTrigger value="content" className="h-6 text-[11px]">
              Content
            </TabsTrigger>
            <TabsTrigger value="style" className="h-6 text-[11px]">
              Design
            </TabsTrigger>
            <TabsTrigger value="motion" className="h-6 text-[11px]">
              Motion
            </TabsTrigger>
            <TabsTrigger value="theme" className="h-6 text-[11px]">
              Theme
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="content" className="mt-0 min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-3">
              {!selectedSection && !selectedElement ? <PageFields /> : null}
              {selectedSection && !selectedElement && !multi ? <SectionFields slotId={selectedSlotId} /> : null}
              {selectedElement && selectedSection ? <ElementFields /> : null}
              {multi ? (
                <p className="text-[12px] text-zinc-500">{selectedElements.length} elements selected. Use align tools on the canvas or edit shared styles in Design.</p>
              ) : null}
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="style" className="mt-0 min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="p-3">
              <StyleTab />
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="motion" className="mt-0 min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="p-3">
              <MotionTab />
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="theme" className="mt-0 min-h-0 flex-1">
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
  const {
    page,
    selectedSection,
    updateSection,
    updateSectionProp,
    updateSlot,
    removeSection,
    duplicateSection,
    replaceSection,
    syncComponentInstances,
    editorMode,
  } = useEditor();
  if (!selectedSection) return null;
  const isComponentEditor = editorMode === "component";

  async function saveComponent() {
    if (!selectedSection) return;
    const name = window.prompt("Name this component", selectedSection.name);
    if (!name) return;
    const response = await fetch("/api/components", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, section: { ...selectedSection, componentId: undefined } }),
    });
    if (response.ok) {
      const saved = await response.json();
      updateSection(selectedSection.id, { componentId: saved.id });
      toast.success("Component saved");
    }
  }

  async function resetInstance() {
    if (!selectedSection?.componentId) return;
    const response = await fetch(`/api/components/${selectedSection.componentId}`);
    if (!response.ok) return;
    const component = await response.json();
    const next = cloneSection({ ...component.section, id: "tmp" }, { id: selectedSection.id, name: selectedSection.name });
    next.componentId = component.id;
    replaceSection(selectedSection.id, next);
    toast.success("Reset to component");
  }

  async function pushToComponent() {
    if (!selectedSection?.componentId) return;
    const response = await fetch(`/api/components/${selectedSection.componentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: selectedSection, name: selectedSection.name }),
    });
    if (!response.ok) {
      toast.error("Could not update component");
      return;
    }
    syncComponentInstances(selectedSection.componentId, selectedSection.id);
    toast.success("Pushed to component");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {isComponentEditor ? "Component" : "Section component"}
          </p>
          <h3 className="text-sm font-semibold">{selectedSection.name}</h3>
        </div>
        <div className="flex">
          {!isComponentEditor ? (
            <Button size="icon" variant="ghost" onClick={saveComponent} title="Save as component">
              <BookmarkPlus className="size-4" />
            </Button>
          ) : null}
          {!isComponentEditor ? (
            <Button size="icon" variant="ghost" onClick={() => duplicateSection(selectedSection.id)}>
              <Copy className="size-4" />
            </Button>
          ) : null}
          {!isComponentEditor ? (
            <Button size="icon" variant="ghost" onClick={() => removeSection(selectedSection.id)}>
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>
      <TextField
        label="Section name"
        value={selectedSection.name}
        onChange={(value) => updateSection(selectedSection.id, { name: value })}
      />
      {!isComponentEditor && selectedSection.componentId ? (
        <div className="space-y-2 rounded-md border border-violet-200 bg-violet-50 p-2">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-violet-900">
            <Component className="size-3.5" />
            Component instance
          </div>
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={pushToComponent}>
              Push to main
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={resetInstance}>
              Reset
            </Button>
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]">
              <Link href={`/admin/component/${selectedSection.componentId}?from=${encodeURIComponent(page.id)}`}>
                <ExternalLink className="size-3.5" />
                Edit
              </Link>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[11px]"
              onClick={() => updateSection(selectedSection.id, { componentId: undefined })}
            >
              <Unlink className="size-3.5" />
              Detach
            </Button>
          </div>
        </div>
      ) : null}
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
  const { page, selectedSection, selectedElement, updateElementProp, updateElement, removeElement } = useEditor();
  const router = useRouter();
  if (!selectedSection || !selectedElement) return null;

  async function saveAsComponent() {
    if (!selectedSection || !selectedElement) return;
    const name = window.prompt("Name this component", selectedElement.type);
    if (!name) return;
    const block = createBlankBlockSection({
      name,
      element: { ...selectedElement, id: nanoid(10) },
    });
    const { id: _id, ...section } = block;
    const response = await fetch("/api/components", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, section }),
    });
    if (!response.ok) {
      toast.error("Could not save component");
      return;
    }
    const saved = await response.json();
    toast.success("Component created", {
      action: {
        label: "Edit",
        onClick: () => router.push(`/admin/component/${saved.id}?from=${encodeURIComponent(page.id)}`),
      },
    });
  }

  function ensureTextSlot() {
    if (!selectedSection || !selectedElement) return;
    const prop =
      typeof selectedElement.props.label === "string"
        ? "label"
        : typeof selectedElement.props.text === "string"
          ? "text"
          : typeof selectedElement.props.title === "string"
            ? "title"
            : null;
    if (!prop) {
      toast.message("No text property on this element");
      return;
    }
    const label = window.prompt("Slot name", selectedElement.textSlot?.label || prop) || prop;
    updateElement(selectedSection.id, selectedElement.id, {
      textSlot: { id: selectedElement.textSlot?.id || nanoid(8), label, prop },
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Element</p>
          <h3 className="text-sm font-semibold capitalize">{selectedElement.type}</h3>
        </div>
        <div className="flex">
          <Button size="icon" variant="ghost" title="Create component" onClick={() => void saveAsComponent()}>
            <BookmarkPlus className="size-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => removeElement(selectedSection.id, selectedElement.id)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      {selectedElement.textSlot ? (
        <p className="rounded-md border border-teal-200 bg-teal-50 px-2 py-1.5 text-[11px] text-teal-800">
          Text slot · {selectedElement.textSlot.label} ({selectedElement.textSlot.prop})
        </p>
      ) : typeof selectedElement.props.text === "string" ||
        typeof selectedElement.props.label === "string" ||
        typeof selectedElement.props.title === "string" ? (
        <Button size="sm" variant="outline" className="h-7 w-full text-[11px]" onClick={ensureTextSlot}>
          Create text slot
        </Button>
      ) : null}
      {selectedElement.type === "button" ? (
        <Field label="Disabled">
          <Switch
            checked={Boolean(selectedElement.props.disabled)}
            onCheckedChange={(checked) =>
              updateElementProp(selectedSection.id, selectedElement.id, "disabled", checked)
            }
          />
        </Field>
      ) : null}
      {selectedElement.type === "list" ? (
        <TextField
          label="List items (JSON)"
          value={JSON.stringify(selectedElement.props.items ?? [], null, 2)}
          multiline
          onChange={(next) => {
            try {
              updateElementProp(selectedSection.id, selectedElement.id, "items", JSON.parse(next));
            } catch {
              /* keep typing */
            }
          }}
        />
      ) : null}
      {Object.entries(selectedElement.props).map(([key, value]) => {
        if (key === "disabled" || key === "items") return null;
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
        if (typeof value === "number") {
          return (
            <TextField
              key={key}
              label={key}
              value={String(value)}
              onChange={(next) =>
                updateElementProp(selectedSection.id, selectedElement.id, key, Number(next) || 0)
              }
            />
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
        if (Array.isArray(value) || (value && typeof value === "object")) {
          return (
            <TextField
              key={key}
              label={`${key} (JSON)`}
              value={JSON.stringify(value, null, 2)}
              multiline
              onChange={(next) => {
                try {
                  updateElementProp(selectedSection.id, selectedElement.id, key, JSON.parse(next));
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
            multiline={key === "text" || key === "body" || key === "options"}
            onChange={(next) => updateElementProp(selectedSection.id, selectedElement.id, key, next)}
          />
        );
      })}
    </div>
  );
}

function MotionTab() {
  const { selectedSection, selectedElement, selectedElements, updateSection, updateElementMeta } = useEditor();
  const node = selectedElement ?? (selectedElements.length ? selectedElements[0] : selectedSection);
  if (!node || !("id" in node)) {
    return <p className="text-[12px] text-zinc-400">Select a layer to add motion.</p>;
  }
  return (
    <AnimationEditor
      node={node}
      onChange={(animation) => {
        if (selectedElement && selectedSection) {
          updateElementMeta(selectedSection.id, selectedElement.id, { animation });
          return;
        }
        if (selectedSection) updateSection(selectedSection.id, { animation });
      }}
    />
  );
}

function StyleTab() {
  const {
    page,
    selectedSection,
    selectedElement,
    selectedElements,
    updateSection,
    updateElementMeta,
    updateSelectedStyles,
    breakpoint,
    previewState,
    setPreviewState,
  } = useEditor();
  const node = selectedElement ?? (selectedElements.length ? selectedElements[0] : selectedSection);
  const nodeId = node && "type" in node && selectedElement ? selectedElement.id : selectedSection?.id ?? null;
  const { computed } = useComputedStyles(
    nodeId,
    [
      page,
      breakpoint,
      previewState,
      node && "styles" in node ? node.styles : null,
      node && "states" in node ? node.states : null,
      node && "responsive" in node ? node.responsive : null,
    ],
    `${nodeId}-${breakpoint}-${previewState}`,
  );
  const swatches = Object.values(page.theme.colors);
  const showStates = selectedElement?.type === "button";
  const states: { id: InteractionState; label: string }[] = [
    { id: "default", label: "Default" },
    { id: "hover", label: "Hover" },
    { id: "focus", label: "Focus" },
    { id: "disabled", label: "Disabled" },
  ];

  if (!node) {
    return <p className="text-[12px] text-zinc-400">Select a layer to edit styles.</p>;
  }

  const resolved = resolveNodeStyles(node, breakpoint, previewState);
  const live = mergeStyles(computed, resolved);
  const local = editingBucket(node, breakpoint, previewState);
  const bucketLabel =
    previewState !== "default"
      ? previewState
      : breakpoint === "desktop"
        ? "desktop"
        : breakpoint;

  return (
    <div className="space-y-3">
      {showStates ? (
        <div className="grid grid-cols-4 gap-0.5 rounded-md bg-zinc-100 p-0.5">
          {states.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPreviewState(item.id)}
              className={cn(
                "h-6 rounded text-[10px] font-medium",
                previewState === item.id ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
      <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">
        Editing {bucketLabel} styles
      </p>
      <NodeMetaEditor
        key={`${"id" in node ? node.id : "node"}-${breakpoint}-${previewState}`}
        node={{ ...node, styles: local }}
        computed={live}
        swatches={swatches}
        onChange={(patch) => {
          if (patch.styles) {
            updateSelectedStyles(patch.styles);
            return;
          }
          if (selectedElement && selectedSection) {
            updateElementMeta(selectedSection.id, selectedElement.id, patch);
            return;
          }
          if (selectedSection) updateSection(selectedSection.id, patch);
        }}
      />
    </div>
  );
}
