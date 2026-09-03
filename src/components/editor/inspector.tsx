"use client";

import type { ReactNode } from "react";
import { toast } from "sonner";
import { Trash2, Copy, BookmarkPlus } from "lucide-react";
import { useEditor } from "@/components/editor/editor-context";
import { ThemePanel } from "@/components/editor/theme-panel";
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

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
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
  const {
    page,
    updatePage,
    selectedSection,
    selectedElement,
    updateElementProp,
    removeElement,
  } = useEditor();

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l bg-card">
      <Tabs defaultValue="content" className="flex min-h-0 flex-1 flex-col">
        <div className="border-b px-3 py-3">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="theme">Theme</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="content" className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-4">
              {!selectedSection && !selectedElement ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Page settings</h3>
                  <TextField label="Page name" value={page.name} onChange={(value) => updatePage({ name: value })} />
                  <TextField
                    label="Client"
                    value={page.clientName}
                    onChange={(value) => updatePage({ clientName: value })}
                  />
                  <TextField label="Slug" value={page.slug} onChange={(value) => updatePage({ slug: value })} />
                  <Field label="Status">
                    <Select
                      value={page.status}
                      onValueChange={(value) => updatePage({ status: value as "draft" | "published" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <p className="text-xs text-muted-foreground">
                    Click a section or element on the canvas to edit its fields.
                  </p>
                </div>
              ) : null}

              {selectedSection && !selectedElement ? (
                <SectionFields
                  onSaveComponent={async () => {
                    const name = window.prompt("Name this component", selectedSection.name);
                    if (!name) return;
                    const response = await fetch("/api/components", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name, section: selectedSection }),
                    });
                    if (response.ok) toast.success("Component saved to the library");
                  }}
                />
              ) : null}

              {selectedElement && selectedSection ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Element</p>
                      <h3 className="text-sm font-semibold capitalize">{selectedElement.type}</h3>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeElement(selectedSection.id, selectedElement.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  {Object.entries(selectedElement.props).map(([key, value]) => {
                    if (typeof value === "boolean") {
                      return (
                        <Field key={key} label={key}>
                          <Switch
                            checked={value}
                            onCheckedChange={(checked) =>
                              updateElementProp(selectedSection.id, selectedElement.id, key, checked)
                            }
                          />
                        </Field>
                      );
                    }
                    if (key === "variant" && selectedElement.type === "button") {
                      return (
                        <Field key={key} label="Variant">
                          <Select
                            value={String(value)}
                            onValueChange={(next) =>
                              updateElementProp(selectedSection.id, selectedElement.id, key, next)
                            }
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
                            onValueChange={(next) =>
                              updateElementProp(selectedSection.id, selectedElement.id, key, next)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="h1">H1</SelectItem>
                              <SelectItem value="h2">H2</SelectItem>
                              <SelectItem value="h3">H3</SelectItem>
                              <SelectItem value="h4">H4</SelectItem>
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
                        onChange={(next) =>
                          updateElementProp(selectedSection.id, selectedElement.id, key, next)
                        }
                      />
                    );
                  })}
                </div>
              ) : null}
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

function SectionFields({ onSaveComponent }: { onSaveComponent: () => void }) {
  const { selectedSection, updateSection, updateSectionProp, removeSection, duplicateSection } =
    useEditor();
  if (!selectedSection) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Section</p>
          <h3 className="text-sm font-semibold">{selectedSection.name}</h3>
        </div>
        <div className="flex">
          <Button size="icon" variant="ghost" onClick={onSaveComponent} title="Save as component">
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
                  // keep typing until valid JSON
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
            multiline={
              key.includes("headline") ||
              key.includes("body") ||
              key.includes("sub") ||
              key === "images" ||
              key === "features" ||
              key === "links"
            }
            onChange={(next) => updateSectionProp(selectedSection.id, key, next)}
          />
        );
      })}
      <p className="text-xs text-muted-foreground">
        {selectedSection.elements.length} nested element
        {selectedSection.elements.length === 1 ? "" : "s"}. Add more from the Elements tab, then drag to
        reorder.
      </p>
    </div>
  );
}
