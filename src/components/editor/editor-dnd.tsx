"use client";

import type { ReactNode } from "react";
import { useCallback, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  defaultKeyboardCoordinateGetter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { useEditor } from "@/components/editor/editor-context";
import {
  elementsSlot,
  findElement,
  frameSlotId,
  getElementPlacementIssue,
  isContainerElement,
  parseFrameSlotId,
  slotDefs,
} from "@/lib/slots";
import type {
  ElementPlacementIssue,
} from "@/lib/slots";
import type { ElementType, PageElement, SavedComponent, SectionType } from "@/lib/types";

type OverlayState = {
  label: string;
  width?: number;
  height?: number;
};

type DndData = {
  kind?: string;
  type?: string;
  label?: string;
  sectionId?: string;
  slotId?: string;
  atIndex?: number;
  elementId?: string;
  elementType?: ElementType;
  parentId?: string;
  component?: SavedComponent;
};

type ElementTarget = {
  sectionId: string;
  slotId: string;
  atIndex?: number;
};

const editorKeyboardCoordinates: KeyboardCoordinateGetter = (event, args) =>
  sortableKeyboardCoordinates(event, args) ?? defaultKeyboardCoordinateGetter(event, args);

function isSectionDrag(kind: string | undefined) {
  return kind === "section" || kind === "layer-section" || kind === "library-section" || kind === "library-component";
}

function isElementDrag(kind: string | undefined) {
  return kind === "element" || kind === "layer-element" || kind === "library-element";
}

function isSectionTarget(kind: string | undefined) {
  return kind === "section" || kind === "layer-section" || kind === "section-gap";
}

function isElementTarget(kind: string | undefined) {
  return (
    kind === "element" ||
    kind === "layer-element" ||
    kind === "element-insert" ||
    kind === "frame" ||
    kind === "slot" ||
    kind === "layer-slot" ||
    kind === "section" ||
    kind === "layer-section"
  );
}

function dropRank(activeKind: string | undefined, targetKind: string | undefined) {
  if (isSectionDrag(activeKind)) {
    if (targetKind === "section-gap") return 0;
    if (targetKind === "layer-section") return 1;
    if (targetKind === "section") return 2;
    return 10;
  }

  if (targetKind === "element-insert") return 0;
  if (targetKind === "element" || targetKind === "layer-element") return 1;
  if (targetKind === "frame") return 2;
  if (targetKind === "slot" || targetKind === "layer-slot") return 3;
  if (targetKind === "section" || targetKind === "layer-section") return 4;
  if (activeKind === "library-element" && targetKind === "section-gap") return 5;
  return 10;
}

function placementIssueMessage(issue: ElementPlacementIssue) {
  switch (issue) {
    case "cycle":
      return "A container cannot be moved into itself or one of its descendants";
    case "invalid-type":
      return "That element type is not accepted by this slot";
    case "locked":
      return "That part of the component instance is locked";
    case "occupied":
      return "This single-element slot is already occupied";
    case "missing-target":
      return "That drop target is no longer available";
  }
}


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
    editorMode,
  } = useEditor();
  const [overlay, setOverlay] = useState<OverlayState | null>(null);
  const pointerYRef = useRef<number | null>(null);
  const pointerListenersRef = useRef<
    { pointer: (event: PointerEvent) => void; touch: (event: TouchEvent) => void } | null
  >(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: editorKeyboardCoordinates }),
  );


  const slotForTarget = useCallback(
    (data: DndData, element?: PageElement): { sectionId: string; slotId: string } | null => {
      if (!data.sectionId) return null;
      if (data.kind === "section" || data.kind === "layer-section") {
        const section = page.sections.find((item) => item.id === data.sectionId);
        if (!section || !element) return null;
        const destination = slotDefs(section.type).find(
          (slot) =>
            (slot.kind === "element" || slot.kind === "elements") &&
            !getElementPlacementIssue(section, slot.id, element, { allowComponentRoot: editorMode === "component" }),
        );
        return destination ? { sectionId: section.id, slotId: destination.id } : null;
      }
      if ((data.kind === "element" || data.kind === "layer-element") && data.elementId) {
        const section = page.sections.find((item) => item.id === data.sectionId);
        const overElement = section ? findElement(section, data.elementId)?.element : null;
        if (overElement && isContainerElement(overElement.type)) {
          return { sectionId: data.sectionId, slotId: frameSlotId(overElement.id) };
        }
      }
      return data.slotId ? { sectionId: data.sectionId, slotId: data.slotId } : null;
    },
    [editorMode, page.sections],
  );

  const collisionDetection = useCallback<CollisionDetection>(
    (args) => {
      const activeData = args.active.data.current as DndData | undefined;
      const activeKind = activeData?.kind;
      const activeElementId = activeData?.elementId ?? (activeKind === "element" ? String(args.active.id) : undefined);
      const activeSectionId = activeData?.sectionId ?? (activeKind === "section" ? String(args.active.id) : undefined);

      const droppableContainers = args.droppableContainers.filter((container) => {
        if (container.id === args.active.id) return false;
        const targetData = container.data.current as DndData | undefined;
        if (!targetData?.kind) return false;

        if (isSectionDrag(activeKind)) {
          if (!isSectionTarget(targetData.kind)) return false;
          if (targetData.kind !== "section-gap" && targetData.sectionId === activeSectionId) return false;
          return true;
        }

        if (!isElementDrag(activeKind)) return false;
        if (targetData.kind === "section-gap") return activeKind === "library-element";
        if (!isElementTarget(targetData.kind)) return false;
        if (targetData.elementId && targetData.elementId === activeElementId) return false;
        return true;
      });

      const filtered = { ...args, droppableContainers };
      const pointerHits = pointerWithin(filtered);
      if (pointerHits.length) {
        const pointerY = filtered.pointerCoordinates?.y ?? 0;
        return [
          [...pointerHits].sort((a, b) => {
            const aContainer = droppableContainers.find((container) => container.id === a.id);
            const bContainer = droppableContainers.find((container) => container.id === b.id);
            const rank = dropRank(activeKind, aContainer?.data.current?.kind as string | undefined) -
              dropRank(activeKind, bContainer?.data.current?.kind as string | undefined);
            if (rank !== 0) return rank;
            const aRect = filtered.droppableRects.get(a.id);
            const bRect = filtered.droppableRects.get(b.id);
            const aCenter = aRect ? aRect.top + aRect.height / 2 : 0;
            const bCenter = bRect ? bRect.top + bRect.height / 2 : 0;
            return Math.abs(aCenter - pointerY) - Math.abs(bCenter - pointerY);
          })[0],
        ];
      }

      // Pointer drops outside a real target must cancel. Keyboard drags still need
      // geometric fallback because they do not have pointer coordinates.
      if (filtered.pointerCoordinates) return [];
      return closestCorners(filtered);
    },
    [],
  );

  function readActiveRect(id: UniqueIdentifier, objectId?: string): Pick<OverlayState, "width" | "height"> {
    if (typeof document === "undefined") return {};
    const selectorId = objectId ?? String(id);
    const node =
      (document.querySelector(`[data-editor-overlay][data-element-id="${CSS.escape(selectorId)}"]`) as HTMLElement | null) ||
      (document.querySelector(`[data-editor-overlay][data-section-id="${CSS.escape(selectorId)}"]`) as HTMLElement | null) ||
      (document.querySelector(`[data-editor-node="${CSS.escape(selectorId)}"]`) as HTMLElement | null);
    if (!node) return {};
    const rect = node.getBoundingClientRect();
    return {
      width: Math.min(Math.round(rect.width), 360),
      height: Math.min(Math.round(rect.height), 120),
    };
  }

  function describe(data: DndData | undefined, id: UniqueIdentifier) {
    if (data?.label) return data.label;
    if (data?.component?.name) return data.component.name;
    if (data?.kind === "section" || data?.kind === "layer-section") {
      return page.sections.find((section) => section.id === data.sectionId || section.id === id)?.name ?? "section";
    }
    if (data?.elementType) return data.elementType;
    if (data?.type) return data.type;
    if (data?.kind === "element-insert" || data?.kind === "section-gap") return "insertion position";
    if (data?.kind === "layer-slot" || data?.kind === "slot" || data?.kind === "frame") return "slot";
    return "item";
  }

  function onDragStart(event: DragStartEvent) {
    document.documentElement.dataset.dragging = "1";
    const activator = event.activatorEvent as Event & {
      clientY?: number;
      touches?: ArrayLike<{ clientY: number }>;
    };
    pointerYRef.current =
      typeof activator.clientY === "number" ? activator.clientY : activator.touches?.[0]?.clientY ?? null;
    if (pointerYRef.current !== null) {
      const pointer = (pointerEvent: PointerEvent) => {
        pointerYRef.current = pointerEvent.clientY;
      };
      const touch = (touchEvent: TouchEvent) => {
        const point = touchEvent.touches[0];
        if (point) pointerYRef.current = point.clientY;
      };
      pointerListenersRef.current = { pointer, touch };
      window.addEventListener("pointermove", pointer, { passive: true });
      window.addEventListener("touchmove", touch, { passive: true });
    }
    const data = event.active.data.current as DndData | undefined;
    const objectId = data?.elementId ?? data?.sectionId;
    const size = readActiveRect(event.active.id, objectId);

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
    if (data?.kind === "section" || data?.kind === "layer-section") {
      const sectionId = data.sectionId ?? String(event.active.id);
      const section = page.sections.find((item) => item.id === sectionId);
      setOverlay({ label: section?.name || "Section", ...size });
      return;
    }
    if (data?.kind === "element" || data?.kind === "layer-element") {
      const elementId = data.elementId ?? String(event.active.id);
      const section = page.sections.find((item) => item.id === data.sectionId);
      const element = section ? findElement(section, elementId)?.element : null;
      const text =
        (typeof element?.props.text === "string" && element.props.text) ||
        (typeof element?.props.label === "string" && element.props.label) ||
        element?.type ||
        "Element";
      setOverlay({ label: String(text).slice(0, 48), ...size });
      return;
    }
    setOverlay({ label: "Item", ...size });
  }

  function clearDrag() {
    delete document.documentElement.dataset.dragging;
    if (pointerListenersRef.current) {
      window.removeEventListener("pointermove", pointerListenersRef.current.pointer);
      window.removeEventListener("touchmove", pointerListenersRef.current.touch);
    }
    pointerListenersRef.current = null;
    pointerYRef.current = null;
    setOverlay(null);
  }

  function droppedAfter(event: DragEndEvent) {
    if (!event.over) return false;
    const activator = event.activatorEvent as Event & { code?: string };
    if (pointerYRef.current === null && activator.code) return event.delta.y > 0;
    const translated = event.active.rect.current.translated;
    const dragCenter = translated ? translated.top + translated.height / 2 : event.over.rect.top;
    const pointerY = pointerYRef.current ?? dragCenter;
    return pointerY > event.over.rect.top + event.over.rect.height / 2;
  }

  function sectionInsertIndex(event: DragEndEvent, overData: DndData) {
    if (overData.kind === "section-gap" && typeof overData.atIndex === "number") return overData.atIndex;
    if ((overData.kind === "section" || overData.kind === "layer-section") && overData.sectionId) {
      const index = page.sections.findIndex((section) => section.id === overData.sectionId);
      if (index >= 0) return index + (droppedAfter(event) ? 1 : 0);
    }
    return page.sections.length;
  }

  function elementTarget(event: DragEndEvent, overData: DndData, element: PageElement): ElementTarget | null {
    const base = slotForTarget(overData, element);
    if (!base) return null;

    if (overData.kind === "element-insert" && typeof overData.atIndex === "number") {
      return { ...base, atIndex: overData.atIndex };
    }

    if ((overData.kind === "element" || overData.kind === "layer-element") && overData.elementId) {
      const section = page.sections.find((item) => item.id === base.sectionId);
      const overElement = section ? findElement(section, overData.elementId)?.element : null;
      if (overElement && isContainerElement(overElement.type)) return base;
      if (!section) return base;
      const frameParent = parseFrameSlotId(base.slotId);
      const items = frameParent
        ? findElement(section, frameParent)?.element.children ?? []
        : elementsSlot(section, base.slotId);
      const index = items.findIndex((item) => item.id === overData.elementId);
      if (index >= 0) return { ...base, atIndex: index + (droppedAfter(event) ? 1 : 0) };
    }

    return base;
  }

  function validateElementTarget(element: PageElement, target: ElementTarget) {
    const section = page.sections.find((item) => item.id === target.sectionId);
    const issue = section
      ? getElementPlacementIssue(section, target.slotId, element, { allowComponentRoot: editorMode === "component" })
      : "missing-target";
    if (issue) toast.message(placementIssueMessage(issue));
    return !issue;
  }

  function onDragEnd(event: DragEndEvent) {
    try {
      const { active, over } = event;
      if (!over) return;
      const activeData = active.data.current as DndData | undefined;
      const overData = over.data.current as DndData | undefined;
      if (!activeData || !overData) return;

      if (activeData.kind === "library-section" && activeData.type) {
        addSection(activeData.type as SectionType, sectionInsertIndex(event, overData));
        toast.success("Section added");
        return;
      }

      if (activeData.kind === "library-component" && activeData.component) {
        insertSavedSection(activeData.component, sectionInsertIndex(event, overData));
        toast.success("Component inserted");
        return;
      }

      if (activeData.kind === "library-element" && activeData.type) {
        const type = activeData.type as ElementType;
        if (overData.kind === "section-gap" && typeof overData.atIndex === "number") {
          insertElementBetweenSections(type, overData.atIndex);
          toast.success(`${type} block added`);
          return;
        }
        const preview: PageElement = { id: "drag-preview", type, props: {} };
        const target = elementTarget(event, overData, preview);
        if (!target || !validateElementTarget(preview, target)) return;
        addElement(target.sectionId, type, target.slotId, target.atIndex);
        toast.success(`${type} added`);
        return;
      }

      if (activeData.kind === "section" || activeData.kind === "layer-section") {
        const sectionId = activeData.sectionId ?? String(active.id);
        const from = page.sections.findIndex((section) => section.id === sectionId);
        const insertionIndex = sectionInsertIndex(event, overData);
        const to = insertionIndex > from ? insertionIndex - 1 : insertionIndex;
        if (from >= 0 && to >= 0 && to < page.sections.length && from !== to) moveSection(from, to);
        return;
      }

      if (activeData.kind === "element" || activeData.kind === "layer-element") {
        const fromSectionId = activeData.sectionId;
        const fromSlotId = activeData.slotId;
        const elementId = activeData.elementId ?? String(active.id);
        if (!fromSectionId || !fromSlotId) return;
        const sourceSection = page.sections.find((section) => section.id === fromSectionId);
        const movingElement = sourceSection ? findElement(sourceSection, elementId)?.element : null;
        const target = movingElement ? elementTarget(event, overData, movingElement) : null;
        if (!movingElement || !target || !validateElementTarget(movingElement, target)) return;

        const sameContainer = fromSectionId === target.sectionId && fromSlotId === target.slotId;
        if (!sameContainer) {
          relocateElement(fromSectionId, fromSlotId, elementId, target.sectionId, target.slotId, target.atIndex);
          return;
        }

        if (target.atIndex === undefined && Math.hypot(event.delta.x, event.delta.y) < 8) return;
        const frameParent = parseFrameSlotId(fromSlotId);
        const items = frameParent
          ? findElement(sourceSection!, frameParent)?.element.children ?? []
          : elementsSlot(sourceSection!, fromSlotId);
        const from = items.findIndex((item) => item.id === elementId);
        if (from < 0 || items.length < 2) return;
        const insertionIndex = target.atIndex ?? items.length;
        const to = Math.max(0, Math.min(insertionIndex > from ? insertionIndex - 1 : insertionIndex, items.length - 1));
        if (from === to) return;
        if (frameParent) {
          relocateElement(fromSectionId, fromSlotId, elementId, target.sectionId, target.slotId, to);
        } else {
          moveElement(fromSectionId, fromSlotId, from, to);
        }
      }
    } finally {
      clearDrag();
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      autoScroll={{ threshold: { x: 0.12, y: 0.12 }, acceleration: 18, interval: 6 }}
      accessibility={{
        screenReaderInstructions: {
          draggable: "To pick up a draggable item, press space or enter. Use the arrow keys to move it, then press space or enter to drop. Press escape to cancel.",
        },
        announcements: {
          onDragStart: ({ active }) =>
            `Picked up ${describe(active.data.current as DndData | undefined, active.id)}.`,
          onDragOver: ({ over }) =>
            over ? `Over ${describe(over.data.current as DndData | undefined, over.id)}.` : "Not over a valid drop target.",
          onDragEnd: ({ over }) =>
            over
              ? `Drag ended over ${describe(over.data.current as DndData | undefined, over.id)}.`
              : "Drag cancelled because there was no valid drop target.",
          onDragCancel: ({ active }) =>
            `Cancelled dragging ${describe(active.data.current as DndData | undefined, active.id)}.`,
        },
      }}
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
