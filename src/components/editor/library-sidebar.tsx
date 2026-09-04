"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { Box, Layers, Plus, Puzzle, Trash2, Type } from "lucide-react";
import { toast } from "sonner";
import { LayersPanel } from "@/components/editor/layers-panel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ELEMENT_CATALOG, SECTION_CATALOG } from "@/lib/defaults";
import type { ElementType, SavedComponent, SectionType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useEditor } from "@/components/editor/editor-context";

const groups = ["Structure", "Story", "Proof", "Convert"] as const;

function DraggableItem({
  id,
  data,
  className,
  disabled,
  onClick,
  children,
}: {
  id: string;
  data: Record<string, unknown>;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, data, disabled });
  return (
    <button
      ref={setNodeRef}
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(className, isDragging && "opacity-40")}
      {...listeners}
      {...attributes}
    >
      {children}
    </button>
  );
}

function InsertPanel() {
  const { page, addSection, addElement, selectedSection, insertSavedSection, editorMode } = useEditor();
  const [components, setComponents] = useState<SavedComponent[]>([]);
  const isComponent = editorMode === "component";

  async function refreshComponents() {
    try {
      const response = await fetch("/api/components");
      if (response.ok) setComponents(await response.json());
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    void refreshComponents();
  }, []);

  function addLibraryElement(type: ElementType) {
    if (!selectedSection) {
      toast.message("Select a section, or drag this onto a slot");
      return;
    }
    addElement(selectedSection.id, type);
  }

  async function createBlankComponent() {
    const name = window.prompt("Component name", "New component");
    if (!name) return;
    const response = await fetch("/api/components", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, blank: true }),
    });
    if (!response.ok) {
      toast.error("Could not create component");
      return;
    }
    const saved = await response.json();
    await refreshComponents();
    toast.success("Blank component created");
    window.location.href = `/admin/component/${saved.id}?from=${encodeURIComponent(page.id)}`;
  }

  async function removeComponent(id: string, name: string) {
    if (!window.confirm(`Delete component “${name}”? Instances on pages will keep their last snapshot.`)) return;
    const response = await fetch(`/api/components/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Could not delete");
      return;
    }
    setComponents((current) => current.filter((item) => item.id !== id));
    toast.success("Component deleted");
  }

  return (
    <Tabs defaultValue={isComponent ? "elements" : "sections"} className="flex min-h-0 flex-1 flex-col">
      <div className="px-2 pt-2">
        <TabsList className={cn("grid h-7 w-full bg-zinc-100 p-0.5", isComponent ? "grid-cols-1" : "grid-cols-3")}>
          {!isComponent ? (
            <TabsTrigger value="sections" className="h-6 text-[11px]">
              Sections
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="elements" className="h-6 text-[11px]">
            Elements
          </TabsTrigger>
          {!isComponent ? (
            <TabsTrigger value="saved" className="h-6 text-[11px]">
              Saved
            </TabsTrigger>
          ) : null}
        </TabsList>
      </div>
      {!isComponent ? (
        <TabsContent value="sections" className="mt-0 min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-2">
              {groups.map((group) => (
                <div key={group}>
                  <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                    {group}
                  </p>
                  <div className="grid gap-1">
                    {SECTION_CATALOG.filter((item) => item.group === group).map((item) => (
                      <DraggableItem
                        key={item.type}
                        id={`lib-section-${item.type}`}
                        data={{ kind: "library-section", type: item.type as SectionType }}
                        onClick={() => addSection(item.type)}
                        className="rounded-md px-2 py-1.5 text-left hover:bg-zinc-100"
                      >
                        <div className="flex items-center gap-2 text-[12px] font-medium">
                          <Layers className="size-3.5 text-zinc-400" />
                          {item.label}
                        </div>
                      </DraggableItem>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      ) : null}
      <TabsContent value="elements" className="mt-0 min-h-0 flex-1">
        <ScrollArea className="h-full">
          <div className="space-y-0.5 p-2">
            {ELEMENT_CATALOG.map((item) => (
              <DraggableItem
                key={item.type}
                id={`lib-element-${item.type}`}
                data={{ kind: "library-element", type: item.type as ElementType }}
                onClick={() => addLibraryElement(item.type)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-zinc-100"
              >
                {item.type === "heading" || item.type === "paragraph" ? (
                  <Type className="size-3.5 text-zinc-400" />
                ) : (
                  <Box className="size-3.5 text-zinc-400" />
                )}
                <span className="text-[12px]">{item.label}</span>
              </DraggableItem>
            ))}
          </div>
        </ScrollArea>
      </TabsContent>
      {!isComponent ? (
        <TabsContent value="saved" className="mt-0 min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-1 p-2">
              <Button
                size="sm"
                variant="outline"
                className="mb-1 h-7 w-full justify-start gap-1.5 text-[11px]"
                onClick={() => void createBlankComponent()}
              >
                <Plus className="size-3.5" />
                New blank component
              </Button>
              {components.length === 0 ? (
                <p className="px-1 text-[11px] text-zinc-400">
                  Create a blank component, or right-click a section/element and choose Create component.
                </p>
              ) : (
                components.map((component) => (
                  <div
                    key={component.id}
                    className="flex items-center justify-between gap-1 rounded-md px-2 py-1.5 hover:bg-zinc-100"
                  >
                    <div className="flex min-w-0 items-center gap-2 text-[12px]">
                      <Puzzle className="size-3.5 text-[#7b61ff]" />
                      <span className="truncate">{component.name}</span>
                    </div>
                    <div className="flex shrink-0">
                      <Button asChild size="sm" variant="ghost" className="h-6 px-2 text-[11px]">
                        <Link href={`/admin/component/${component.id}?from=${encodeURIComponent(page.id)}`}>
                          Edit
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[11px]"
                        onClick={() => insertSavedSection(component)}
                      >
                        Insert
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-6 text-zinc-400 hover:text-red-600"
                        title="Delete"
                        onClick={() => void removeComponent(component.id, component.name)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      ) : null}
    </Tabs>
  );
}

export function LibrarySidebar() {
  return (
    <aside className="editor-ui flex h-full w-60 shrink-0 flex-col border-r border-zinc-200 bg-white">
      <Tabs defaultValue="layers" className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-zinc-200 px-2 py-1.5">
          <TabsList className="grid h-7 w-full grid-cols-2 bg-zinc-100 p-0.5">
            <TabsTrigger value="layers" className="h-6 text-[11px]">
              Layers
            </TabsTrigger>
            <TabsTrigger value="insert" className="h-6 text-[11px]">
              Insert
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="layers" className="mt-0 min-h-0 flex-1">
          <LayersPanel />
        </TabsContent>
        <TabsContent value="insert" className="mt-0 flex min-h-0 flex-1 flex-col">
          <InsertPanel />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
