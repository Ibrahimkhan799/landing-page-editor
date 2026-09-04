"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Box,
  ChevronDown,
  ChevronRight,
  Component,
  Frame,
  GripVertical,
  Type,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEditor } from "@/components/editor/editor-context";
import { elementsSlot, elementSlot, frameSlotId, slotDefs } from "@/lib/slots";
import type { PageElement, PageSection } from "@/lib/types";
import { cn } from "@/lib/utils";

function elementIcon(type: PageElement["type"]) {
  if (type === "heading" || type === "paragraph") return Type;
  if (type === "frame" || type === "slot" || type === "list") return Frame;
  return Box;
}

function SortableLayer({
  id,
  data,
  depth,
  label,
  active,
  muted,
  icon: Icon,
  onClick,
}: {
  id: string;
  data: Record<string, unknown>;
  depth: number;
  label: string;
  active?: boolean;
  muted?: boolean;
  icon: typeof Frame;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data,
    animateLayoutChanges: () => false,
    transition: null,
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: isDragging ? undefined : CSS.Transform.toString(transform),
        transition: isDragging ? undefined : transition,
        paddingLeft: 8 + depth * 12,
      }}
      className={cn("flex h-7 items-center gap-0.5 rounded-sm", isDragging && "z-20 opacity-40")}
    >
      <button
        type="button"
        className="grid size-4 shrink-0 cursor-grab place-items-center text-zinc-400 hover:text-zinc-700 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3" />
      </button>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-sm pr-2 text-left text-[12px]",
          active ? "bg-[#0d99ff]/15 text-zinc-900" : "text-zinc-700 hover:bg-zinc-100",
          muted && "text-zinc-400",
        )}
      >
        <Icon className="size-3.5 shrink-0 text-zinc-400" />
        <span className="truncate">{label}</span>
      </button>
    </div>
  );
}

function SlotLayer({
  sectionId,
  slotId,
  children,
}: {
  sectionId: string;
  slotId: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `layer-slot-${sectionId}-${slotId}`,
    data: { kind: "layer-slot", sectionId, slotId },
  });
  return (
    <div ref={setNodeRef} className={cn("rounded-sm", isOver && "bg-[#0d99ff]/10")}>
      {children}
    </div>
  );
}

function LayerTree({
  sectionId,
  slotId,
  element,
  depth,
}: {
  sectionId: string;
  slotId: string;
  element: PageElement;
  depth: number;
}) {
  const { toggleSelectElement, selectedRefs } = useEditor();
  const Icon = elementIcon(element.type);
  const active = selectedRefs.some((ref) => ref.elementId === element.id);
  const childSlot = frameSlotId(element.id);
  return (
    <>
      <SortableLayer
        id={`layer-el-${element.id}`}
        data={{ kind: "layer-element", sectionId, slotId, elementId: element.id }}
        depth={depth}
        label={element.type}
        icon={Icon}
        active={active}
        onClick={() => toggleSelectElement({ sectionId, slotId, elementId: element.id }, false)}
      />
      {(element.children ?? []).map((child) => (
        <LayerTree key={child.id} sectionId={sectionId} slotId={childSlot} element={child} depth={depth + 1} />
      ))}
    </>
  );
}

function SectionLayers({ section }: { section: PageSection }) {
  const { selection, setSelection, toggleSelectElement, selectedRefs } = useEditor();
  const [open, setOpen] = useState(true);
  const selected =
    (selection.kind === "section" && selection.sectionId === section.id) ||
    (selection.kind !== "page" &&
      selection.kind !== "elements" &&
      selection.sectionId === section.id &&
      selection.kind !== "element");
  const defs = slotDefs(section.type);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `layer-section-${section.id}`,
    data: { kind: "layer-section", sectionId: section.id },
  });

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn(isDragging && "z-20 opacity-50")}>
      <div className="flex items-center">
        <button
          type="button"
          className="grid size-6 place-items-center text-zinc-400"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        </button>
        <button
          type="button"
          className="grid size-4 shrink-0 cursor-grab place-items-center text-zinc-400 hover:text-zinc-700 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3" />
        </button>
        <button
          type="button"
          onClick={() => setSelection({ kind: "section", sectionId: section.id })}
          className={cn(
            "flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-sm px-1 text-left text-[12px]",
            selection.kind === "section" && selection.sectionId === section.id
              ? "bg-[#0d99ff]/15 text-zinc-900"
              : selected
                ? "text-zinc-900"
                : "text-zinc-700 hover:bg-zinc-100",
          )}
        >
          {section.componentId ? (
            <Component className="size-3.5 shrink-0 text-[#7b61ff]" />
          ) : (
            <Frame className="size-3.5 shrink-0 text-zinc-400" />
          )}
          <span className="truncate">{section.name}</span>
        </button>
      </div>
      {open
        ? defs.map((slot) => {
            if (slot.kind === "text") {
              return (
                <div key={slot.id} className="flex h-7 items-center" style={{ paddingLeft: 32 }}>
                  <Type className="mr-1.5 size-3.5 text-zinc-300" />
                  <span className="text-[12px] text-zinc-400">{slot.label}</span>
                </div>
              );
            }
            const items =
              slot.kind === "elements"
                ? elementsSlot(section, slot.id)
                : elementSlot(section, slot.id)
                  ? [elementSlot(section, slot.id) as PageElement]
                  : [];
            const sortable = slot.kind === "elements";
            return (
              <SlotLayer key={slot.id} sectionId={section.id} slotId={slot.id}>
                <div
                  className="flex h-7 items-center rounded-sm hover:bg-zinc-50"
                  style={{ paddingLeft: 32 }}
                  onClick={() => setSelection({ kind: "slot", sectionId: section.id, slotId: slot.id })}
                >
                  <Frame className="mr-1.5 size-3.5 text-zinc-400" />
                  <span className="text-[12px] text-zinc-700">{slot.label}</span>
                </div>
                {sortable ? (
                  <SortableContext items={items.map((item) => `layer-el-${item.id}`)} strategy={verticalListSortingStrategy}>
                    {items.map((element) => (
                      <LayerTree
                        key={element.id}
                        sectionId={section.id}
                        slotId={slot.id}
                        element={element}
                        depth={3}
                      />
                    ))}
                  </SortableContext>
                ) : (
                  items.map((element) => (
                    <LayerTree
                      key={element.id}
                      sectionId={section.id}
                      slotId={slot.id}
                      element={element}
                      depth={3}
                    />
                  ))
                )}
              </SlotLayer>
            );
          })
        : null}
    </div>
  );
}

export function LayersPanel() {
  const { page, setSelection, moveSection, moveElement, relocateElement } = useEditor();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeData = active.data.current as
      | { kind?: string; sectionId?: string; slotId?: string; elementId?: string }
      | undefined;
    const overData = over.data.current as
      | { kind?: string; sectionId?: string; slotId?: string; elementId?: string }
      | undefined;

    if (activeData?.kind === "layer-section") {
      const from = page.sections.findIndex((section) => `layer-section-${section.id}` === active.id);
      const overSectionId =
        typeof over.id === "string" && over.id.startsWith("layer-section-")
          ? over.id.replace("layer-section-", "")
          : overData?.sectionId;
      const to = page.sections.findIndex((section) => section.id === overSectionId);
      if (from >= 0 && to >= 0 && from !== to) moveSection(from, to);
      return;
    }

    if (activeData?.kind === "layer-element" && activeData.sectionId && activeData.slotId && activeData.elementId) {
      if (overData?.kind === "layer-slot" && overData.sectionId && overData.slotId) {
        if (overData.sectionId !== activeData.sectionId || overData.slotId !== activeData.slotId) {
          relocateElement(activeData.sectionId, activeData.slotId, activeData.elementId, overData.sectionId, overData.slotId);
        }
        return;
      }
      if (
        overData?.kind === "layer-element" &&
        overData.sectionId &&
        overData.slotId &&
        (overData.sectionId !== activeData.sectionId || overData.slotId !== activeData.slotId)
      ) {
        relocateElement(activeData.sectionId, activeData.slotId, activeData.elementId, overData.sectionId, overData.slotId);
        return;
      }
      if (overData?.kind === "layer-element" && overData.slotId === activeData.slotId && overData.sectionId === activeData.sectionId) {
        const section = page.sections.find((item) => item.id === activeData.sectionId);
        if (!section) return;
        const items = elementsSlot(section, activeData.slotId);
        const from = items.findIndex((element) => element.id === activeData.elementId);
        const to = items.findIndex((element) => element.id === overData.elementId);
        if (from >= 0 && to >= 0 && from !== to) moveElement(section.id, activeData.slotId, from, to);
      }
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <ScrollArea className="h-full">
        <div className="space-y-0.5 p-2">
          <button
            type="button"
            onClick={() => setSelection({ kind: "page" })}
            className="flex h-7 w-full items-center gap-1.5 rounded-sm px-2 text-left text-[12px] text-zinc-700 hover:bg-zinc-100"
          >
            <Frame className="size-3.5 text-zinc-400" />
            {page.name || "Page"}
          </button>
          <SortableContext
            items={page.sections.map((section) => `layer-section-${section.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {page.sections.map((section) => (
              <SectionLayers key={section.id} section={section} />
            ))}
          </SortableContext>
        </div>
      </ScrollArea>
    </DndContext>
  );
}
