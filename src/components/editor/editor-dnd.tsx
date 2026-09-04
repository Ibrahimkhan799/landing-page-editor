"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { useEditor } from "@/components/editor/editor-context";
import { elementsSlot, slotDefs } from "@/lib/slots";
import type { ElementType, SectionType } from "@/lib/types";

const collisionDetection: CollisionDetection = (args) => {
  const nested = pointerWithin(args);
  if (nested.length) return nested;
  return closestCenter(args);
};

export function EditorDnd({ children }: { children: ReactNode }) {
  const {
    page,
    addSection,
    addElement,
    insertElementBetweenSections,
    moveSection,
    moveElement,
    relocateElement,
  } = useEditor();
  const [overlay, setOverlay] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (data?.kind === "library-element") {
      setOverlay(`Element · ${data.type}`);
      return;
    }
    if (data?.kind === "library-section") {
      setOverlay(`Section · ${data.type}`);
      return;
    }
    if (data?.kind === "section") {
      setOverlay("Move section");
      return;
    }
    if (data?.kind === "element") {
      setOverlay("Move element");
      return;
    }
    setOverlay(null);
  }

  function onDragEnd(event: DragEndEvent) {
    setOverlay(null);
    const { active, over } = event;
    if (!over) return;
    const activeData = active.data.current as
      | { kind?: string; type?: string; sectionId?: string; slotId?: string }
      | undefined;
    const overData = over.data.current as
      | {
          kind?: string;
          sectionId?: string;
          slotId?: string;
          atIndex?: number;
          elementId?: string;
          type?: string;
        }
      | undefined;

    if (activeData?.kind === "library-section" && activeData.type) {
      const atIndex = overData?.kind === "section-gap" ? overData.atIndex : undefined;
      addSection(activeData.type as SectionType, atIndex);
      toast.success("Section added");
      return;
    }

    if (activeData?.kind === "library-element" && activeData.type) {
      const type = activeData.type as ElementType;
      if (overData?.kind === "section-gap" && typeof overData.atIndex === "number") {
        insertElementBetweenSections(type, overData.atIndex);
        toast.success(`${type} block added`);
        return;
      }
      const sectionId = overData?.sectionId;
      if (!sectionId) {
        toast.message("Drop this onto a section, slot, or between sections");
        return;
      }
      if (overData?.kind === "element-insert" && overData.slotId && typeof overData.atIndex === "number") {
        addElement(sectionId, type, overData.slotId, overData.atIndex);
        toast.success(`${type} added`);
        return;
      }
      if (overData?.kind === "element" && overData.slotId && overData.elementId) {
        const section = page.sections.find((item) => item.id === sectionId);
        const items = section ? elementsSlot(section, overData.slotId) : [];
        const index = items.findIndex((item) => item.id === overData.elementId);
        addElement(sectionId, type, overData.slotId, index >= 0 ? index : undefined);
        toast.success(`${type} added`);
        return;
      }
      addElement(sectionId, type, overData?.slotId);
      toast.success(`${type} added`);
      return;
    }

    if (activeData?.kind === "section") {
      const from = page.sections.findIndex((section) => section.id === active.id);
      let to = page.sections.findIndex((section) => section.id === over.id);
      if (overData?.kind === "section-gap" && typeof overData.atIndex === "number") {
        to = overData.atIndex > from ? overData.atIndex - 1 : overData.atIndex;
      }
      if (from >= 0 && to >= 0 && from !== to) moveSection(from, to);
      return;
    }

    if (activeData?.kind === "element" && activeData.sectionId && activeData.slotId) {
      const overSlotId = overData?.slotId;
      const overSectionId = overData?.sectionId;
      if (
        overSectionId &&
        overSlotId &&
        (overSectionId !== activeData.sectionId || overSlotId !== activeData.slotId) &&
        (overData?.kind === "slot" || overData?.kind === "element" || overData?.kind === "frame" || overData?.kind === "element-insert")
      ) {
        relocateElement(activeData.sectionId, activeData.slotId, String(active.id), overSectionId, overSlotId);
        return;
      }
      const section = page.sections.find((item) => item.id === activeData.sectionId);
      if (!section) return;
      const def = slotDefs(section.type).find((slot) => slot.id === activeData.slotId);
      if (def?.kind !== "elements") return;
      const items = elementsSlot(section, activeData.slotId);
      const from = items.findIndex((element) => element.id === active.id);
      let to = items.findIndex((element) => element.id === over.id);
      if (overData?.kind === "element-insert" && typeof overData.atIndex === "number") {
        to = overData.atIndex > from ? overData.atIndex - 1 : overData.atIndex;
      }
      if (from >= 0 && to >= 0 && from !== to) {
        moveElement(section.id, activeData.slotId, from, to);
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setOverlay(null)}
    >
      <div className="flex min-h-0 min-w-0 flex-1">{children}</div>
      <DragOverlay>
        {overlay ? (
          <div className="rounded-md border bg-white px-3 py-2 text-sm shadow-lg">{overlay}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
