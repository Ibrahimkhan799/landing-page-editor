"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  Box,
  Layers,
  LayoutTemplate,
  Puzzle,
  Type,
} from "lucide-react";
import { toast } from "sonner";
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

export function LibrarySidebar() {
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
    toast.success("Element added");
  }

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r bg-card">
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <LayoutTemplate className="size-4" />
          Library
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Drag a section onto the canvas, or drop an element into a slot. Text slots edit in the inspector.
        </p>
      </div>
      <Tabs defaultValue="sections" className="flex min-h-0 flex-1 flex-col">
        <div className="px-3 pt-3">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sections">Sections</TabsTrigger>
            <TabsTrigger value="elements">Elements</TabsTrigger>
            <TabsTrigger value="saved">Saved</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="sections" className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-5 p-3">
              {groups.map((group) => (
                <div key={group}>
                  <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group}
                  </p>
                  <div className="grid gap-2">
                    {SECTION_CATALOG.filter((item) => item.group === group).map((item) => (
                      <DraggableItem
                        key={item.type}
                        id={`lib-section-${item.type}`}
                        data={{ kind: "library-section", type: item.type as SectionType }}
                        onClick={() => {
                          addSection(item.type);
                          toast.success(`${item.label} added`);
                        }}
                        className="rounded-lg border bg-background p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/60"
                      >
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Layers className="size-3.5 text-muted-foreground" />
                          {item.label}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                      </DraggableItem>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="elements" className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-2 p-3">
              {!selectedSection ? (
                <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  Drag an element onto a highlighted slot, or select a section first.
                </p>
              ) : (
                <p className="px-1 text-xs text-muted-foreground">
                  Adding to <span className="font-medium text-foreground">{selectedSection.name}</span>
                </p>
              )}
              {ELEMENT_CATALOG.map((item) => (
                <DraggableItem
                  key={item.type}
                  id={`lib-element-${item.type}`}
                  data={{ kind: "library-element", type: item.type as ElementType }}
                  onClick={() => addLibraryElement(item.type)}
                  className="flex w-full items-start gap-3 rounded-lg border bg-background p-3 text-left"
                >
                  {item.type === "heading" || item.type === "paragraph" ? (
                    <Type className="mt-0.5 size-3.5 text-muted-foreground" />
                  ) : (
                    <Box className="mt-0.5 size-3.5 text-muted-foreground" />
                  )}
                  <span>
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  </span>
                </DraggableItem>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="saved" className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-2 p-3">
              {components.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Save a selected section from the inspector to reuse it on other client pages.
                </p>
              ) : (
                components.map((component) => (
                  <div key={component.id} className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Puzzle className="size-3.5" />
                      {component.name}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => {
                        insertSavedSection(component);
                        toast.success("Component inserted");
                      }}
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
    </aside>
  );
}
