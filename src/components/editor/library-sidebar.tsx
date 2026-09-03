"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Box, Layers, Puzzle, Type } from "lucide-react";
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
  const { addSection, addElement, selectedSection, insertSavedSection } = useEditor();
  const [components, setComponents] = useState<SavedComponent[]>([]);

  useEffect(() => {
    fetch("/api/components")
      .then((response) => response.json())
      .then(setComponents)
      .catch(() => undefined);
  }, []);

  function addLibraryElement(type: ElementType) {
    if (!selectedSection) {
      toast.message("Select a section, or drag this onto a slot");
      return;
    }
    addElement(selectedSection.id, type);
  }

  return (
    <Tabs defaultValue="sections" className="flex min-h-0 flex-1 flex-col">
      <div className="px-2 pt-2">
        <TabsList className="grid h-7 w-full grid-cols-3 bg-zinc-100 p-0.5">
          <TabsTrigger value="sections" className="h-6 text-[11px]">
            Sections
          </TabsTrigger>
          <TabsTrigger value="elements" className="h-6 text-[11px]">
            Elements
          </TabsTrigger>
          <TabsTrigger value="saved" className="h-6 text-[11px]">
            Saved
          </TabsTrigger>
        </TabsList>
      </div>
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
      <TabsContent value="saved" className="mt-0 min-h-0 flex-1">
        <ScrollArea className="h-full">
          <div className="space-y-1 p-2">
            {components.length === 0 ? (
              <p className="px-1 text-[11px] text-zinc-400">Save a section from the inspector to reuse it as a component.</p>
            ) : (
              components.map((component) => (
                <div key={component.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-zinc-100">
                  <div className="flex min-w-0 items-center gap-2 text-[12px]">
                    <Puzzle className="size-3.5 text-[#7b61ff]" />
                    <span className="truncate">{component.name}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => insertSavedSection(component)}
                  >
                    Insert
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </TabsContent>
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
