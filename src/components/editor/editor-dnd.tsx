"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { useEditor } from "@/components/editor/editor-context";
import {
  elementsSlot,
  findElement,
  frameSlotId,
  isContainerElement,
  parseFrameSlotId,
  slotDefs,
} from "@/lib/slots";
import type { ElementType, SavedComponent, SectionType } from "@/lib/types";

type OverlayState = {
  label: string;
  width?: number;
  height?: number;
};

function dropRank(kind: string | undefined) {
  switch (kind) {
    case "element-insert":
      return 0;
    case "element":
      // Prefer concrete siblings over the parent frame hit-target while reordering.
      return 1;
    case "frame":
      return 2;
    case "slot":
      return 3;
    case "section-gap":
      return 4;
    case "section":
      return 5;
    default:
      return 6;
  }
}

const collisionDetection: CollisionDetection = (args) => {
  const filtered = {
    ...args,
    droppableContainers: args.droppableContainers.filter((container) => container.id !== args.active.id),
  };
  const pointerHits = pointerWithin(filtered);
  if (pointerHits.length) {
    // Prefer the topmost hit among equal ranks (helps upward pointer accuracy)
    const ranked = [...pointerHits].sort((a, b) => {
      const kindOf = (id: UniqueIdentifier) =>
        filtered.droppableContainers.find((container) => container.id === id)?.data.current?.kind as
          | string
          | undefined;
      const rank = dropRank(kindOf(a.id)) - dropRank(kindOf(b.id));
      if (rank !== 0) return rank;
      const aTop = filtered.droppableRects.get(a.id)?.top ?? 0;
      const bTop = filtered.droppableRects.get(b.id)?.top ?? 0;
      const pointerY = filtered.pointerCoordinates?.y ?? 0;
      // Prefer the item whose center is closest above/below the pointer
      return Math.abs(aTop - pointerY) - Math.abs(bTop - pointerY);
    });
    return [ranked[0]];
  }
  return closestCorners(filtered);
};

export function EditorDnd({ children }: { children: ReactNode }) {
  const {
    page,
    addSection,
    addElement,
    insertElementBetweenSections,
    insertSavedSection,
    moveSection,
    moveElement,
    relocateElement,
  } = useEditor();
  const [overlay, setOverlay] = useState<OverlayState | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function readActiveRect(id: UniqueIdentifier): Pick<OverlayState, "width" | "height"> {
    if (typeof document === "undefined") return {};
    const node =
      (document.querySelector(`[data-editor-overlay][data-element-id="${CSS.escape(String(id))}"]`) as HTMLElement | null) ||
      (document.querySelector(`[data-editor-overlay][data-section-id="${CSS.escape(String(id))}"]`) as HTMLElement | null) ||
      (document.querySelector(`[data-editor-node="${CSS.escape(String(id))}"]`) as HTMLElement | null);
    if (!node) return {};
    const rect = node.getBoundingClientRect();
    return {
      width: Math.min(Math.round(rect.width), 360),
      height: Math.min(Math.round(rect.height), 120),
    };
  }

  function onDragStart(event: DragStartEvent) {
    document.documentElement.dataset.dragging = "1";
    const data = event.active.data.current as
      | {
          kind?: string;
          type?: string;
          label?: string;
          component?: SavedComponent;
        }
      | undefined;
    const size = readActiveRect(event.active.id);

    if (data?.kind === "library-element") {
      setOverlay({ label: String(data.type ?? "Element") });
      return;
    }
    if (data?.kind === "library-section") {
      setOverlay({ label: String(data.type ?? "Section") });
      return;
    }
    if (data?.kind === "library-component") {
      setOverlay({ label: data.component?.name || data.label || "Component" });
      return;
    }
    if (data?.kind === "section") {
      const section = page.sections.find((item) => item.id === event.active.id);
      setOverlay({ label: section?.name || "Section", ...size });
      return;
    }
    if (data?.kind === "element") {
      const section = page.sections.find((item) => item.id === (data as { sectionId?: string }).sectionId);
      const el = section ? findElement(section, String(event.active.id))?.element : null;
      const text =
        (typeof el?.props.text === "string" && el.props.text) ||
        (typeof el?.props.label === "string" && el.props.label) ||
        el?.type ||
        "Element";
      setOverlay({
        label: String(text).slice(0, 48),
        ...size,
      });
      return;
    }
    setOverlay({ label: "Item", ...size });
  }

  function clearDrag() {
    delete document.documentElement.dataset.dragging;
    setOverlay(null);
  }

  function resolveInsertIndex(
    overData:
      | {
          kind?: string;
          sectionId?: string;
          slotId?: string;
          atIndex?: number;
          elementId?: string;
        }
      | undefined,
    sectionId: string,
    slotId: string,
  ) {
    if (overData?.kind === "element-insert" && typeof overData.atIndex === "number") {
      return overData.atIndex;
    }
    if (overData?.kind === "element" && overData.elementId) {
      const section = page.sections.find((item) => item.id === sectionId);
      if (!section) return undefined;
      // Dropping onto a container nests inside it — no sibling index.
      const overEl = findElement(section, overData.elementId)?.element;
      if (overEl && isContainerElement(overEl.type)) return undefined;
      const frameParent = parseFrameSlotId(slotId);
      const items = frameParent
        ? findElement(section, frameParent)?.element.children ?? []
        : elementsSlot(section, slotId);
      const index = items.findIndex((item) => item.id === overData.elementId);
      return index >= 0 ? index : undefined;
    }
    return undefined;
  }

  /** When the pointer is over a frame/slot/list element, target its interior slot. */
  function nestSlotIfContainer(
    sectionId: string | undefined,
    overData:
      | {
          kind?: string;
          sectionId?: string;
          slotId?: string;
          elementId?: string;
        }
      | undefined,
  ): string | undefined {
    if (!sectionId || !overData?.elementId || overData.kind !== "element") return overData?.slotId;
    const section = page.sections.find((item) => item.id === sectionId);
    if (!section) return overData.slotId;
    const overEl = findElement(section, overData.elementId)?.element;
    if (overEl && isContainerElement(overEl.type)) return frameSlotId(overEl.id);
    return overData.slotId;
  }

  function onDragEnd(event: DragEndEvent) {
    clearDrag();
    const { active, over } = event;
    if (!over) return;
    const activeData = active.data.current as
      | {
          kind?: string;
          type?: string;
          sectionId?: string;
          slotId?: string;
          component?: SavedComponent;
        }
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

    if (activeData?.kind === "library-component" && activeData.component) {
      const atIndex = overData?.kind === "section-gap" ? overData.atIndex : undefined;
      insertSavedSection(activeData.component, atIndex);
      toast.success("Component inserted");
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
      if (overData?.kind === "frame" && overData.slotId) {
        addElement(sectionId, type, overData.slotId);
        toast.success(`${type} added`);
        return;
      }
      if (overData?.kind === "element" && overData.elementId) {
        const nestedSlot = nestSlotIfContainer(sectionId, overData);
        if (nestedSlot && nestedSlot !== overData.slotId) {
          addElement(sectionId, type, nestedSlot);
          toast.success(`${type} added`);
          return;
        }
        if (overData.slotId) {
          const section = page.sections.find((item) => item.id === sectionId);
          const items = section ? elementsSlot(section, overData.slotId) : [];
          const index = items.findIndex((item) => item.id === overData.elementId);
          // Frame children use relocate-style index via addElement slot path
          const frameParent = parseFrameSlotId(overData.slotId);
          if (frameParent && section) {
            const kids = findElement(section, frameParent)?.element.children ?? [];
            const kidIndex = kids.findIndex((item) => item.id === overData.elementId);
            addElement(sectionId, type, overData.slotId, kidIndex >= 0 ? kidIndex : undefined);
          } else {
            addElement(sectionId, type, overData.slotId, index >= 0 ? index : undefined);
          }
          toast.success(`${type} added`);
          return;
        }
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
      } else if (overData?.kind === "section" && overData.sectionId) {
        to = page.sections.findIndex((section) => section.id === overData.sectionId);
      }
      if (from >= 0 && to >= 0 && from !== to) moveSection(from, to);
      return;
    }

    if (activeData?.kind === "element" && activeData.sectionId && activeData.slotId) {
      const overSectionId = overData?.sectionId;
      let overSlotId = overData?.slotId;

      // Dropping onto a container element nests into it.
      if (overData?.kind === "element" && overSectionId && overData.elementId) {
        const nested = nestSlotIfContainer(overSectionId, overData);
        if (nested) overSlotId = nested;
      }

      if (
        overSectionId &&
        overSlotId &&
        (overSectionId !== activeData.sectionId || overSlotId !== activeData.slotId) &&
        (overData?.kind === "slot" ||
          overData?.kind === "element" ||
          overData?.kind === "frame" ||
          overData?.kind === "element-insert")
      ) {
        const atIndex =
          overSlotId === overData?.slotId
            ? resolveInsertIndex(overData, overSectionId, overSlotId)
            : undefined;
        relocateElement(
          activeData.sectionId,
          activeData.slotId,
          String(active.id),
          overSectionId,
          overSlotId,
          atIndex,
        );
        return;
      }

      // Reorder inside the same frame
      if (
        String(activeData.slotId).startsWith("frame:") &&
        overSectionId === activeData.sectionId &&
        overSlotId === activeData.slotId
      ) {
        const atIndex = resolveInsertIndex(overData, activeData.sectionId, activeData.slotId);
        if (typeof atIndex === "number") {
          relocateElement(
            activeData.sectionId,
            activeData.slotId,
            String(active.id),
            activeData.sectionId,
            activeData.slotId,
            atIndex,
          );
        }
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
      autoScroll={{ threshold: { x: 0.12, y: 0.12 }, acceleration: 18, interval: 6 }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={clearDrag}
    >
      <div className="flex min-h-0 min-w-0 flex-1">{children}</div>
      <DragOverlay dropAnimation={null} style={{ cursor: "grabbing" }}>
        {overlay ? (
          <div
            className="pointer-events-none overflow-hidden rounded border border-zinc-300 bg-white/95 px-2.5 py-1.5 text-[12px] font-medium text-zinc-800 shadow-sm"
            style={{
              width: overlay.width ? Math.max(overlay.width, 72) : undefined,
              minHeight: overlay.height ? Math.min(overlay.height, 48) : undefined,
              maxWidth: 360,
            }}
          >
            {overlay.label}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
