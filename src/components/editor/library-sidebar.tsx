"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDraggable } from "@dnd-kit/core";
import { Box, Layers, Plus, Puzzle, Search, Trash2, Type } from "lucide-react";
import { toast } from "sonner";
import { LayersPanel } from "@/components/editor/layers-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ELEMENT_CATALOG, SECTION_CATALOG } from "@/lib/defaults";
import { SVG_ICON_CATALOG } from "@/lib/icon-catalog";
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
  const router = useRouter();
  const [components, setComponents] = useState<SavedComponent[]>([]);
  const [iconQuery, setIconQuery] = useState("");
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
    let active = true;
    void fetch("/api/components")
      .then(async (response) => {
        if (!response.ok) return;
        const saved = await response.json();
        if (active) setComponents(saved);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    for (const component of components) {
      router.prefetch(`/admin/component/${component.id}?from=${encodeURIComponent(page.id)}`);
    }
  }, [components, page.id, router]);

  function addLibraryElement(type: ElementType, props?: Record<string, unknown>) {
    if (!selectedSection) {
      toast.message("Select a section, or drag this onto a slot");
      return;
    }
    addElement(selectedSection.id, type, undefined, undefined, props);
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
    const href = `/admin/component/${saved.id}?from=${encodeURIComponent(page.id)}`;
    router.prefetch(href);
    router.push(href);
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
        <TabsList
                  className={cn(
                    "grid h-7 w-full bg-zinc-100 p-0.5 dark:bg-zinc-900",
                    isComponent ? "grid-cols-2" : "grid-cols-4",
                  )}
                >
          {!isComponent ? (
            <TabsTrigger value="sections" className="h-6 text-[11px]">
              Sections
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="elements" className="h-6 text-[11px]">
            Elements
          </TabsTrigger>
          <TabsTrigger value="icons" className="h-6 text-[11px]">
            Icons
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
                        className="rounded-md px-2 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
      <TabsContent value="icons" className="mt-0 min-h-0 flex-1">
        <div className="flex h-full min-h-0 flex-col">
          <div className="relative p-2 pb-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
            <Input
              value={iconQuery}
              onChange={(event) => setIconQuery(event.target.value)}
              className="pl-7"
              placeholder="Search icons"
            />
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="grid grid-cols-3 gap-1 p-2 pt-1">
              {SVG_ICON_CATALOG.filter((icon) => {
                const query = iconQuery.trim().toLowerCase();
                return !query || `${icon.label} ${icon.keywords.join(" ")}`.toLowerCase().includes(query);
              }).map((icon) => {
                const props = { markup: icon.markup, label: icon.label };
                return (
                  <DraggableItem
                    key={icon.id}
                    id={`lib-icon-${icon.id}`}
                    data={{ kind: "library-element", type: "svg", props, label: icon.label }}
                    onClick={() => addLibraryElement("svg", props)}
                    className="grid aspect-square place-items-center rounded-md border border-transparent text-zinc-600 hover:border-zinc-200 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    <span
                      className="grid size-6 place-items-center [&>svg]:size-5"
                      title={icon.label}
                      dangerouslySetInnerHTML={{ __html: icon.markup }}
                    />
                  </DraggableItem>
                );
              })}
            </div>
          </ScrollArea>
        </div>
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
                  Create a blank component, or convert any element into a component from the canvas.
                </p>
              ) : (
                components.map((component) => (
                  <div
                    key={component.id}
                    className="flex items-center justify-between gap-1 rounded-md px-1 py-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <DraggableItem
                      id={`lib-component-${component.id}`}
                      data={{ kind: "library-component", component, label: component.name }}
                      onClick={() => insertSavedSection(component)}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left text-[12px]"
                    >
                      <Puzzle className="size-3.5 shrink-0 text-[#7b61ff]" />
                      <span className="truncate">{component.name}</span>
                    </DraggableItem>
                    <div className="flex shrink-0">
                      <Button asChild size="sm" variant="ghost" className="h-6 px-2 text-[11px]">
                        <Link href={`/admin/component/${component.id}?from=${encodeURIComponent(page.id)}`}>
                          Edit
                        </Link>
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
  const { layerRevealRequest } = useEditor();
  const [tabState, setTabState] = useState<{
    value: "layers" | "insert";
    handledRevealId: number;
  }>({ value: "layers", handledRevealId: 0 });
  const activeTab =
    layerRevealRequest && layerRevealRequest.id > tabState.handledRevealId
      ? "layers"
      : tabState.value;

  return (
    <aside className="editor-ui flex h-full w-60 shrink-0 flex-col border-r border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setTabState((current) => ({
            value: value as "layers" | "insert",
            handledRevealId: layerRevealRequest?.id ?? current.handledRevealId,
          }))
        }
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="border-b border-zinc-200 px-2 py-1.5 dark:border-zinc-800">
          <TabsList className="grid h-7 w-full grid-cols-2 bg-zinc-100 p-0.5 dark:bg-zinc-900">
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
