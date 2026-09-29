"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  MeasuringStrategy,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  centerOf,
  gapHint,
  keyboardDropPoints,
  layoutFromStyle,
  measuredLayout,
  nearestInsertion,
  nextKeyboardPoint,
  resolveLayoutDrop,
  verticalLayout,
  type DropPoint,
  type DropRect,
  type LayoutHint,
} from "@/components/editor/layout-drop";
import { toast } from "sonner";
import { useEditor } from "@/components/editor/editor-context";
import { useEditorTheme } from "@/components/editor/editor-theme";
import {
  elementsSlot,
  findElement,
  frameSlotId,
  getElementPlacementIssue,
  getElementStructureIssue,
  isContainerElement,
  parseFrameSlotId,
  slotDefs,
} from "@/lib/slots";
import type { ElementPlacementIssue } from "@/lib/slots";
import type {
  ElementType,
  PageElement,
  PageSection,
  SavedComponent,
  SectionType,
} from "@/lib/types";

type OverlayState = {
  label: string;
};

type DropHintState = LayoutHint;

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
  props?: Record<string, unknown>;
};

type ElementTarget = {
  sectionId: string;
  slotId: string;
  atIndex?: number;
};

type DropLocation = {
  node: HTMLElement | null;
  rect: DropRect;
  point: DropPoint;
};

type ElementDragSource =
  | { element: PageElement; issue: null }
  | { element: null; issue: ElementPlacementIssue };

function elementDragSource(
  sections: PageSection[],
  data: DndData,
  allowComponentRoot: boolean,
): ElementDragSource {
  if (data.kind === "library-element") {
    return data.type
      ? {
          element: {
            id: "drag-preview",
            type: data.type as ElementType,
            props: data.props ?? {},
          },
          issue: null,
        }
      : { element: null, issue: "invalid-type" };
  }
  const section = sections.find((item) => item.id === data.sectionId);
  const found =
    section && data.elementId ? findElement(section, data.elementId) : null;
  if (!section || !found || found.slotId !== data.slotId)
    return { element: null, issue: "missing-target" };
  const issue = getElementStructureIssue(section, found.element.id, {
    allowComponentRoot,
  });
  return issue
    ? { element: null, issue }
    : { element: found.element, issue: null };
}

function dropGeometry(
  node: HTMLElement | null,
  data: DndData,
  fallback: DropRect,
) {
  const canvas = Boolean(node?.closest("[data-editor-canvas]"));
  const box =
    canvas && data.kind === "frame"
      ? (node?.closest<HTMLElement>('[data-editor-overlay="element"]') ?? node)
      : node;
  const rect = box?.getBoundingClientRect() ?? fallback;
  const layout =
    canvas && data.kind !== "section" && data.kind !== "section-gap"
      ? measuredLayout(box)
      : verticalLayout;
  const cssSize = layout.axis === "x" ? box?.offsetWidth : box?.offsetHeight;
  return {
    rect: {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    },
    layout,
    scale: cssSize
      ? (layout.axis === "x" ? rect.width : rect.height) / cssSize
      : 1,
    box,
  };
}

function containerTarget(data: DndData) {
  return (
    data.kind === "frame" ||
    data.kind === "slot" ||
    data.kind === "layer-slot" ||
    ((data.kind === "element" || data.kind === "layer-element") &&
      isContainerElement(data.elementType))
  );
}

function isSectionDrag(kind: string | undefined) {
  return (
    kind === "section" ||
    kind === "layer-section" ||
    kind === "library-section" ||
    kind === "library-component"
  );
}

function isElementDrag(kind: string | undefined) {
  return (
    kind === "element" || kind === "layer-element" || kind === "library-element"
  );
}

function isSectionTarget(kind: string | undefined) {
  return (
    kind === "section" || kind === "layer-section" || kind === "section-gap"
  );
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

function dropRank(activeKind: string | undefined, target: DndData | undefined) {
  if (isSectionDrag(activeKind)) {
    if (target?.kind === "section-gap") return 0;
    if (target?.kind === "layer-section") return 1;
    if (target?.kind === "section") return 2;
    return 10;
  }

  if (target?.kind === "element-insert") return 0;
  if (target?.kind === "element" || target?.kind === "layer-element") {
    return isContainerElement(target.elementType) ? 3 : 1;
  }
  if (
    target?.kind === "frame" ||
    target?.kind === "slot" ||
    target?.kind === "layer-slot"
  )
    return 2;
  if (target?.kind === "section" || target?.kind === "layer-section") return 4;
  if (activeKind === "library-element" && target?.kind === "section-gap")
    return 5;
  return 10;
}

const placementIssueMessages: Record<ElementPlacementIssue, string> = {
  cycle: "A container cannot be moved into itself or one of its descendants",
  "invalid-type": "That element type is not accepted by this slot",
  locked: "That part of the component instance is locked",
  occupied: "This single-element slot is already occupied",
  "missing-target": "That drag source or drop target is no longer available",
  "branch-scaffold":
    "Then/Else frames are fixed IF branches. Move or insert elements inside a branch instead",
};

function placementIssueMessage(issue: ElementPlacementIssue) {
  return placementIssueMessages[issue];
}

export function EditorDnd({ children }: { children: ReactNode }) {
  const dark = useEditorTheme();
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
  const [dropHint, setDropHint] = useState<DropHintState | null>(null);
  const pointerRef = useRef<DropPoint | null>(null);
  const keyboardRef = useRef<{
    id: UniqueIdentifier;
    point: DropPoint;
    offset: DropPoint;
  } | null>(null);
  const nodesRef = useRef(new Map<UniqueIdentifier, HTMLElement>());
  const pointerListenersRef = useRef<{
    pointer: (event: MouseEvent) => void;
    touch: (event: TouchEvent) => void;
  } | null>(null);
  useEffect(
    () => () => {
      delete document.documentElement.dataset.dragging;
      if (pointerListenersRef.current) {
        window.removeEventListener(
          "pointermove",
          pointerListenersRef.current.pointer,
        );
        window.removeEventListener(
          "mousemove",
          pointerListenersRef.current.pointer,
        );
        window.removeEventListener(
          "touchmove",
          pointerListenersRef.current.touch,
        );
      }
    },
    [],
  );

  const validTarget = useCallback(
    (active: DndData, target: DndData) => {
      if (isSectionDrag(active.kind)) {
        return (
          isSectionTarget(target.kind) &&
          (target.kind === "section-gap" ||
            target.sectionId !== active.sectionId)
        );
      }
      if (!isElementDrag(active.kind)) return false;
      if (
        elementDragSource(page.sections, active, editorMode === "component")
          .issue
      )
        return false;
      if (target.kind === "section-gap")
        return active.kind === "library-element";
      if (!isElementTarget(target.kind)) return false;
      if (
        active.elementId &&
        (target.elementId === active.elementId ||
          target.parentId === active.elementId)
      )
        return false;
      if (active.elementId && target.sectionId === active.sectionId) {
        const section = page.sections.find(
          (item) => item.id === active.sectionId,
        );
        const moving =
          section && findElement(section, active.elementId)?.element;
        const contains = (node: PageElement): boolean =>
          node.id === target.elementId ||
          node.id === target.parentId ||
          frameSlotId(node.id) === target.slotId ||
          Boolean(node.children?.some(contains));
        if (moving && contains(moving)) return false;
      }
      return true;
    },
    [editorMode, page.sections],
  );

  const editorKeyboardCoordinates: KeyboardCoordinateGetter = (
    event,
    { context, currentCoordinates },
  ) => {
    if (
      !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)
    )
      return undefined;
    event.preventDefault();
    const activeData = context.active?.data.current as DndData | undefined;
    const activeRect = context.collisionRect;
    if (!activeData || !activeRect) return undefined;
    const current = keyboardRef.current?.point ?? centerOf(activeRect);
    const candidates = context.droppableContainers
      .getEnabled()
      .flatMap((container) => {
        const data = container.data.current as DndData | undefined;
        const rect = context.droppableRects.get(container.id);
        if (
          !data ||
          !rect ||
          container.id === context.active?.id ||
          !validTarget(activeData, data)
        )
          return [];
        const geometry = dropGeometry(container.node.current, data, rect);
        if (geometry.rect.width <= 0 || geometry.rect.height <= 0) return [];
        const gap =
          data.kind === "element-insert" || data.kind === "section-gap";
        const insideOnly =
          data.kind === "slot" ||
          data.kind === "layer-slot" ||
          (isElementDrag(activeData.kind) && isSectionTarget(data.kind));
        const points =
          gap || insideOnly
            ? [centerOf(geometry.rect)]
            : keyboardDropPoints(
                geometry.rect,
                geometry.layout,
                containerTarget(data),
              );
        return points
          .filter((point) =>
            validDropAt(activeData, data, {
              node: container.node.current,
              rect,
              point,
            }),
          )
          .map((point) => ({
            id: container.id,
            point,
            offset: {
              x: (point.x - geometry.rect.left) / (geometry.rect.width || 1),
              y: (point.y - geometry.rect.top) / (geometry.rect.height || 1),
            },
          }));
      });
    const next = nextKeyboardPoint(candidates, current, event.code);
    if (!next) return undefined;
    keyboardRef.current = next;
    const center = centerOf(activeRect);
    return {
      x: currentCoordinates.x + next.point.x - center.x,
      y: currentCoordinates.y + next.point.y - center.y,
    };
  };

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: editorKeyboardCoordinates }),
  );

  const slotForTarget = useCallback(
    (
      data: DndData,
      element?: PageElement,
    ): { sectionId: string; slotId: string } | null => {
      if (!data.sectionId) return null;
      if (data.kind === "section" || data.kind === "layer-section") {
        const section = page.sections.find(
          (item) => item.id === data.sectionId,
        );
        if (!section || !element) return null;
        const destination = slotDefs(section.type).find(
          (slot) =>
            (slot.kind === "element" || slot.kind === "elements") &&
            !getElementPlacementIssue(section, slot.id, element, {
              allowComponentRoot: editorMode === "component",
            }),
        );
        return destination
          ? { sectionId: section.id, slotId: destination.id }
          : null;
      }
      if (
        (data.kind === "element" || data.kind === "layer-element") &&
        data.elementId
      ) {
        const section = page.sections.find(
          (item) => item.id === data.sectionId,
        );
        const overElement = section
          ? findElement(section, data.elementId)?.element
          : null;
        if (overElement && isContainerElement(overElement.type)) {
          return {
            sectionId: data.sectionId,
            slotId: frameSlotId(overElement.id),
          };
        }
      }
      return data.slotId
        ? { sectionId: data.sectionId, slotId: data.slotId }
        : null;
    },
    [editorMode, page.sections],
  );

  const collisionDetection: CollisionDetection = (args) => {
    const activeData = args.active.data.current as DndData | undefined;
    const activeKind = activeData?.kind;
    if (args.pointerCoordinates) pointerRef.current = args.pointerCoordinates;
    nodesRef.current.clear();
    // `droppableContainers` is a DroppableContainersMap, not an array. Calling
    // Array.prototype.filter on it throws as soon as a drag starts, which
    // prevents collision detection, placement hints, and drop handlers from
    // receiving a target. Start with its enabled containers before filtering
    // to the targets supported by this editor.
    const droppableContainers = args.droppableContainers
      .getEnabled()
      .filter((container) => {
        if (container.node.current)
          nodesRef.current.set(container.id, container.node.current);
        const targetData = container.data.current as DndData | undefined;
        return (
          container.id !== args.active.id &&
          Boolean(activeData && targetData && validTarget(activeData, targetData))
        );
      });
    if (!args.pointerCoordinates && keyboardRef.current) {
      const keyboard = keyboardRef.current;
      const target = droppableContainers.find(
        (container) => container.id === keyboard.id,
      );
      if (!target) return [];
      const data = target.data.current as DndData;
      const rect = args.droppableRects.get(target.id);
      if (rect) {
        const geometry = dropGeometry(target.node.current, data, rect);
        keyboard.point = {
          x: geometry.rect.left + geometry.rect.width * keyboard.offset.x,
          y: geometry.rect.top + geometry.rect.height * keyboard.offset.y,
        };
      }
      return activeData &&
        rect &&
        validDropAt(activeData, data, {
          node: target.node.current,
          rect,
          point: keyboard.point,
        })
        ? [{ id: target.id }]
        : [];
    }

    const filtered = { ...args, droppableContainers };
    const pointerHits = pointerWithin(filtered);
    if (pointerHits.length) {
      const pointer =
        filtered.pointerCoordinates ?? centerOf(args.collisionRect);
      const winner = [...pointerHits].sort((a, b) => {
        const aContainer = droppableContainers.find(
          (container) => container.id === a.id,
        );
        const bContainer = droppableContainers.find(
          (container) => container.id === b.id,
        );
        const aData = aContainer?.data.current as DndData | undefined;
        const bData = bContainer?.data.current as DndData | undefined;
        const aNode = aContainer?.node.current;
        const bNode = bContainer?.node.current;
        const aBox = aNode?.closest('[data-editor-overlay="element"]') ?? aNode;
        const bBox = bNode?.closest('[data-editor-overlay="element"]') ?? bNode;
        // Prefer the actual nested target, not an ancestor's full-size
        // frame hit zone. At a container's outer edge, reorder it instead.
        if (aBox && bBox && aBox !== bBox) {
          const outerEdge = (
            node: HTMLElement | null | undefined,
            data: DndData | undefined,
          ) => {
            if (!node || !data || !containerTarget(data)) return false;
            const geometry = dropGeometry(
              node,
              data,
              node.getBoundingClientRect(),
            );
            return (
              resolveLayoutDrop({
                ...geometry,
                point: pointer,
                container: true,
              }).edge !== null
            );
          };
          if (aBox.contains(bBox)) return outerEdge(aNode, aData) ? -1 : 1;
          if (bBox.contains(aBox)) return outerEdge(bNode, bData) ? 1 : -1;
        }

        const depth = (node: Element | null | undefined) => {
          let value = 0;
          let current = node?.parentElement ?? null;
          while (current) {
            if (current.matches('[data-editor-overlay="element"]')) value++;
            current = current.parentElement;
          }
          return value;
        };

        const edgePriority = (
          node: HTMLElement | null | undefined,
          data: DndData | undefined,
        ) => {
          if (!node || !data || !containerTarget(data)) return 0;
          const geometry = dropGeometry(
            node,
            data,
            node.getBoundingClientRect(),
          );
          return resolveLayoutDrop({
            ...geometry,
            point: pointer,
            container: true,
          }).edge !== null
            ? 1
            : 0;
        };

        const aEdge = edgePriority(aNode, aData);
        const bEdge = edgePriority(bNode, bData);

        // Container edges are reorder targets. Container interiors prefer
        // the deepest nested target under the pointer.
        if (aEdge !== bEdge) return bEdge - aEdge;

        const aDepth = depth(aBox);
        const bDepth = depth(bBox);
        if (aDepth !== bDepth) return bDepth - aDepth;

        const rank = dropRank(activeKind, aData) - dropRank(activeKind, bData);
        if (rank !== 0) return rank;
        const aRect = filtered.droppableRects.get(a.id);
        const bRect = filtered.droppableRects.get(b.id);
        const area =
          (aRect?.width ?? 0) * (aRect?.height ?? 0) -
          (bRect?.width ?? 0) * (bRect?.height ?? 0);
        if (area !== 0) return area;
        const distance = (rect?: DropRect) =>
          rect
            ? Math.hypot(
                centerOf(rect).x - pointer.x,
                centerOf(rect).y - pointer.y,
              )
            : Infinity;
        return distance(aRect) - distance(bRect);
      })[0];
      const target = droppableContainers.find(
        (container) => container.id === winner.id,
      );
      const data = target?.data.current as DndData | undefined;
      const rect = args.droppableRects.get(winner.id);
      // Invalid nested targets must not fall through to an ancestor section
      // and silently insert somewhere other than the pointed-at slot.
      return activeData &&
        target &&
        data &&
        rect &&
        validDropAt(activeData, data, {
          node: target.node.current,
          rect,
          point: pointer,
        })
        ? [winner]
        : [];
    }

    // Never fall back to a distant target when dropping outside the canvas.
    return [];
  };

  function dragPoint(event: DragMoveEvent | DragEndEvent) {
    const translated = event.active.rect.current.translated;
    return (
      pointerRef.current ??
      keyboardRef.current?.point ??
      (translated ? centerOf(translated) : { x: 0, y: 0 })
    );
  }

  function dropLocation(event: DragMoveEvent | DragEndEvent): DropLocation | null {
    if (!event.over) return null;

    return {
      node: nodesRef.current.get(event.over.id) ?? null,
      rect: event.over.rect,
      point: dragPoint(event),
    };
  }

  function placement(event: DragMoveEvent | DragEndEvent) {
    const over = event.over;
    if (!over) return null;
    const data = over.data.current as DndData;
    const geometry = dropGeometry(
      nodesRef.current.get(over.id) ?? null,
      data,
      over.rect,
    );
    return resolveLayoutDrop({
      ...geometry,
      point: dragPoint(event),
      container: containerTarget(data),
    });
  }

  function resolveDropHint(event: DragMoveEvent): DropHintState | null {
    if (!event.over) return null;
    const activeData = event.active.data.current as DndData | undefined;
    const overData = event.over.data.current as DndData | undefined;
    if (
      !activeData?.kind ||
      !overData?.kind ||
      !validTarget(activeData, overData)
    )
      return null;
    const location = dropLocation(event);
    if (!location) return null;
    const geometry = dropGeometry(location.node, overData, location.rect);
    if (overData.kind === "section-gap")
      return gapHint(geometry.rect, geometry.layout);
    if (isElementDrag(activeData.kind)) {
      const source = elementDragSource(
        page.sections,
        activeData,
        editorMode === "component",
      );
      return source.element
        ? (resolveElementDrop(location, overData, source.element)?.hint ?? null)
        : null;
    }
    return placement(event)?.hint ?? null;
  }

  function onDragMove(event: DragMoveEvent) {
    setDropHint(resolveDropHint(event));
  }

  function describe(data: DndData | undefined, id: UniqueIdentifier) {
    if (data?.label) return data.label;
    if (data?.component?.name) return data.component.name;
    if (data?.kind === "section" || data?.kind === "layer-section") {
      return (
        page.sections.find(
          (section) => section.id === data.sectionId || section.id === id,
        )?.name ?? "section"
      );
    }
    if (data?.elementType) return data.elementType;
    if (data?.type) return data.type;
    if (data?.kind === "element-insert" || data?.kind === "section-gap")
      return "insertion position";
    if (
      data?.kind === "layer-slot" ||
      data?.kind === "slot" ||
      data?.kind === "frame"
    )
      return "slot";
    return "item";
  }

  function onDragStart(event: DragStartEvent) {
    const data = event.active.data.current as DndData | undefined;
    if (data && isElementDrag(data.kind)) {
      const source = elementDragSource(
        page.sections,
        data,
        editorMode === "component",
      );
      if (source.issue) {
        setOverlay(null);
        setDropHint(null);
        toast.message(placementIssueMessage(source.issue));
        return;
      }
    }
    document.documentElement.dataset.dragging = "1";
    keyboardRef.current = null;
    const activator = event.activatorEvent as Event & {
      clientX?: number;
      clientY?: number;
      touches?: ArrayLike<{ clientX: number; clientY: number }>;
    };
    const initial = activator.touches?.[0] ?? activator;
    pointerRef.current =
      typeof initial.clientX === "number" && typeof initial.clientY === "number"
        ? { x: initial.clientX, y: initial.clientY }
        : null;
    if (pointerRef.current) {
      const pointer = (event: MouseEvent) => {
        pointerRef.current = { x: event.clientX, y: event.clientY };
      };
      const touch = (event: TouchEvent) => {
        const point = event.touches[0];
        if (point) pointerRef.current = { x: point.clientX, y: point.clientY };
      };
      pointerListenersRef.current = { pointer, touch };
      window.addEventListener("pointermove", pointer, { passive: true });
      window.addEventListener("mousemove", pointer, { passive: true });
      window.addEventListener("touchmove", touch, { passive: true });
    }
    if (data?.kind === "library-element") {
      setOverlay({ label: String(data.label ?? data.type ?? "Element") });
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
      setOverlay({ label: section?.name || "Section" });
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
      setOverlay({ label: String(text).slice(0, 48) });
      return;
    }
    setOverlay({ label: "Item" });
  }

  function clearDrag() {
    delete document.documentElement.dataset.dragging;
    if (pointerListenersRef.current) {
      window.removeEventListener(
        "pointermove",
        pointerListenersRef.current.pointer,
      );
      window.removeEventListener(
        "mousemove",
        pointerListenersRef.current.pointer,
      );
      window.removeEventListener(
        "touchmove",
        pointerListenersRef.current.touch,
      );
    }
    pointerListenersRef.current = null;
    pointerRef.current = null;
    keyboardRef.current = null;
    nodesRef.current.clear();
    setOverlay(null);
    setDropHint(null);
  }

  function droppedAfter(event: DragEndEvent) {
    return event.over ? placement(event)?.edge === "after" : false;
  }

  function sectionInsertIndex(event: DragEndEvent, overData: DndData) {
    if (overData.kind === "section-gap" && typeof overData.atIndex === "number")
      return overData.atIndex;
    if (
      (overData.kind === "section" || overData.kind === "layer-section") &&
      overData.sectionId
    ) {
      const index = page.sections.findIndex(
        (section) => section.id === overData.sectionId,
      );
      if (index >= 0) return index + (droppedAfter(event) ? 1 : 0);
    }
    return page.sections.length;
  }

  function targetAroundElement(
    sectionId: string,
    slotId: string,
    elementId: string,
    edge: "before" | "after",
  ): ElementTarget | null {
    const section = page.sections.find((item) => item.id === sectionId);
    if (!section) return null;
    const frameParent = parseFrameSlotId(slotId);
    const items = frameParent
      ? (findElement(section, frameParent)?.element.children ?? [])
      : elementsSlot(section, slotId);
    const index = items.findIndex((item) => item.id === elementId);
    return index >= 0
      ? { sectionId, slotId, atIndex: index + (edge === "after" ? 1 : 0) }
      : null;
  }

  function resolveElementDrop(
    { node, rect, point }: DropLocation,
    data: DndData,
    element: PageElement,
    reportIssue = false,
  ): { target: ElementTarget; hint: LayoutHint } | null {
    const geometry = dropGeometry(node, data, rect);
    const result = resolveLayoutDrop({
      ...geometry,
      point,
      container: containerTarget(data),
    });
    const base = slotForTarget(data, element);
    if (!base) return null;
    const finish = (target: ElementTarget, hint: LayoutHint) => {
      const issue = elementTargetIssue(element, target);
      if (issue) {
        if (reportIssue) toast.message(placementIssueMessage(issue));
        return null;
      }
      return { target, hint };
    };
    if (data.kind === "element-insert" && typeof data.atIndex === "number") {
      return finish(
        { ...base, atIndex: data.atIndex },
        gapHint(geometry.rect, geometry.layout),
      );
    }
    const id = data.kind === "frame" ? data.parentId : data.elementId;
    if (id && result.edge) {
      const section = page.sections.find((item) => item.id === data.sectionId);
      const found = section && findElement(section, id);
      const target =
        found &&
        targetAroundElement(base.sectionId, found.slotId, id, result.edge);
      if (target) return finish(target, result.hint);
    }
    // Container centers insert into that container; edges use its *parent's*
    // axis. Resolve blank space against the children's actual wrapped/grid boxes.
    const parentId = parseFrameSlotId(base.slotId);
    if (parentId && node?.closest("[data-editor-canvas]")) {
      const section = page.sections.find((item) => item.id === base.sectionId);
      const children = section
        ? (findElement(section, parentId)?.element.children ?? [])
        : [];
      const canvas = node.closest("[data-editor-canvas]")!;
      const paint = canvas.querySelector<HTMLElement>(
        `[data-editor-node="${CSS.escape(parentId)}"]`,
      );
      const innerLayout = paint
        ? layoutFromStyle(getComputedStyle(paint))
        : verticalLayout;
      const items = [
        ...canvas.querySelectorAll<HTMLElement>("[data-element-id]"),
      ]
        .filter(
          (item) =>
            item.dataset.slotId === base.slotId &&
            item.dataset.sectionId === base.sectionId,
        )
        .map((item) => ({
          rect: item.getBoundingClientRect(),
          index: children.findIndex(
            (child) => child.id === item.dataset.elementId,
          ),
        }))
        .filter(
          (item) =>
            item.index >= 0 && item.rect.width > 0 && item.rect.height > 0,
        );
      const insertion = nearestInsertion(items, point, innerLayout);
      if (insertion)
        return finish({ ...base, atIndex: insertion.index }, insertion.hint);
      return finish(
        { ...base, atIndex: children.length },
        { mode: "container", ...geometry.rect },
      );
    }
    return finish(base, { mode: "container", ...geometry.rect });
  }

  function elementTargetIssue(
    element: PageElement,
    target: ElementTarget,
  ): ElementPlacementIssue | null {
    const section = page.sections.find((item) => item.id === target.sectionId);
    return section
      ? getElementPlacementIssue(section, target.slotId, element, {
          allowComponentRoot: editorMode === "component",
        })
      : "missing-target";
  }

  function validDropAt(
    active: DndData,
    target: DndData,
    location: DropLocation,
  ) {
    if (!validTarget(active, target)) return false;
    if (!isElementDrag(active.kind) || target.kind === "section-gap")
      return true;
    const source = elementDragSource(
      page.sections,
      active,
      editorMode === "component",
    );
    return Boolean(
      source.element && resolveElementDrop(location, target, source.element),
    );
  }

  function onDragEnd(event: DragEndEvent) {
    try {
      const { active, over } = event;
      if (!over) return;
      const activeData = active.data.current as DndData | undefined;
      const overData = over.data.current as DndData | undefined;
      if (!activeData || !overData) return;
      // Recheck source permissions at commit time in case the page changed
      // since pickup (or a sensor retained a now-protected source).
      if (isElementDrag(activeData.kind)) {
        const source = elementDragSource(
          page.sections,
          activeData,
          editorMode === "component",
        );
        if (source.issue) {
          toast.message(placementIssueMessage(source.issue));
          return;
        }
      }
      if (!validTarget(activeData, overData)) return;

      if (activeData.kind === "library-section" && activeData.type) {
        addSection(
          activeData.type as SectionType,
          sectionInsertIndex(event, overData),
        );
        toast.success("Section added");
        return;
      }

      if (activeData.kind === "library-component" && activeData.component) {
        insertSavedSection(
          activeData.component,
          sectionInsertIndex(event, overData),
        );
        toast.success("Component inserted");
        return;
      }

      if (activeData.kind === "library-element" && activeData.type) {
        const type = activeData.type as ElementType;
        if (
          overData.kind === "section-gap" &&
          typeof overData.atIndex === "number"
        ) {
          insertElementBetweenSections(
            type,
            overData.atIndex,
            activeData.props,
          );
          toast.success(`${type} block added`);
          return;
        }
        const preview: PageElement = {
          id: "drag-preview",
          type,
          props: activeData.props ?? {},
        };
        const location = dropLocation(event);
        if (!location) return;
        const target = resolveElementDrop(
          location,
          overData,
          preview,
          true,
        )?.target;
        if (!target) return;
        addElement(
          target.sectionId,
          type,
          target.slotId,
          target.atIndex,
          activeData.props,
        );
        toast.success(`${type} added`);
        return;
      }

      if (
        activeData.kind === "section" ||
        activeData.kind === "layer-section"
      ) {
        const sectionId = activeData.sectionId ?? String(active.id);
        const from = page.sections.findIndex(
          (section) => section.id === sectionId,
        );
        const insertionIndex = sectionInsertIndex(event, overData);
        const to = insertionIndex > from ? insertionIndex - 1 : insertionIndex;
        if (from >= 0 && to >= 0 && to < page.sections.length && from !== to)
          moveSection(from, to);
        return;
      }

      if (
        activeData.kind === "element" ||
        activeData.kind === "layer-element"
      ) {
        const fromSectionId = activeData.sectionId;
        const fromSlotId = activeData.slotId;
        const elementId = activeData.elementId ?? String(active.id);
        if (!fromSectionId || !fromSlotId) return;
        const sourceSection = page.sections.find(
          (section) => section.id === fromSectionId,
        );
        const movingElement = sourceSection
          ? findElement(sourceSection, elementId)?.element
          : null;
        const location = dropLocation(event);
        const target = movingElement && location
          ? resolveElementDrop(
              location,
              overData,
              movingElement,
              true,
            )?.target
          : null;
        if (!movingElement || !target) return;

        const sameContainer =
          fromSectionId === target.sectionId && fromSlotId === target.slotId;
        if (!sameContainer) {
          relocateElement(
            fromSectionId,
            fromSlotId,
            elementId,
            target.sectionId,
            target.slotId,
            target.atIndex,
          );
          return;
        }

        if (
          target.atIndex === undefined &&
          Math.hypot(event.delta.x, event.delta.y) < 8
        )
          return;
        const frameParent = parseFrameSlotId(fromSlotId);
        const items = frameParent
          ? (findElement(sourceSection!, frameParent)?.element.children ?? [])
          : elementsSlot(sourceSection!, fromSlotId);
        const from = items.findIndex((item) => item.id === elementId);
        if (from < 0 || items.length < 2) return;
        const insertionIndex = target.atIndex ?? items.length;
        const to = Math.max(
          0,
          Math.min(
            insertionIndex > from ? insertionIndex - 1 : insertionIndex,
            items.length - 1,
          ),
        );
        if (from === to) return;
        if (frameParent) {
          relocateElement(
            fromSectionId,
            fromSlotId,
            elementId,
            target.sectionId,
            target.slotId,
            to,
          );
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
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
          measure: (node) => node.getBoundingClientRect(),
        },
      }}
      autoScroll={{
        threshold: { x: 0.12, y: 0.12 },
        acceleration: 18,
        interval: 6,
      }}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            "To pick up a draggable item, press space or enter. Use the arrow keys to move it, then press space or enter to drop. Press escape to cancel.",
        },
        announcements: {
          onDragStart: ({ active }) =>
            `Picked up ${describe(active.data.current as DndData | undefined, active.id)}.`,
          onDragOver: ({ over }) =>
            over
              ? `Over ${describe(over.data.current as DndData | undefined, over.id)}.`
              : "Not over a valid drop target.",
          onDragEnd: ({ over }) =>
            over
              ? `Drag ended over ${describe(over.data.current as DndData | undefined, over.id)}.`
              : "Drag cancelled because there was no valid drop target.",
          onDragCancel: ({ active }) =>
            `Cancelled dragging ${describe(active.data.current as DndData | undefined, active.id)}.`,
        },
      }}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragOver={onDragMove}
      onDragEnd={onDragEnd}
      onDragCancel={clearDrag}
    >
      <div className="flex min-h-0 min-w-0 flex-1">{children}</div>
      {dropHint?.mode === "edge" ? (
        <div
          aria-hidden
          className="pointer-events-none fixed z-100 rounded-full bg-[#0d99ff] shadow-[0_0_0_1px_rgba(255,255,255,0.8)]"
          style={{
            top: dropHint.top,
            left: dropHint.left,
            width: dropHint.width,
            height: dropHint.height,
          }}
        />
      ) : dropHint?.mode === "container" ? (
        <div
          aria-hidden
          className="pointer-events-none fixed z-100 rounded-[3px] bg-[#0d99ff]/5 shadow-[inset_0_0_0_2px_#0d99ff]"
          style={{
            top: dropHint.top,
            left: dropHint.left,
            width: dropHint.width,
            height: dropHint.height,
          }}
        />
      ) : null}
      <DragOverlay dropAnimation={null} style={{ cursor: "grabbing" }}>
        {overlay ? (
          <div
            className={`pointer-events-none w-max max-w-48 truncate whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-medium shadow-sm ${
              dark
                ? "border-zinc-700 bg-zinc-900/95 text-zinc-100"
                : "border-zinc-300 bg-white/95 text-zinc-800"
            }`}
          >
            {overlay.label}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
