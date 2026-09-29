"use client";

import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Copy,
  GripVertical,
  Maximize2,
  Minus,
  MoveHorizontal,
  MoveVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { EmptySlot } from "@/components/editor/empty-slot";
import { CanvasEditorContextMenu } from "@/components/editor/editor-context-menu";
import { FrameDropZone } from "@/components/editor/frame-drop-zone";
import { ElementInsertDrop, SectionGapDrop } from "@/components/editor/insert-gaps";
import { isTypingTarget, useEditor } from "@/components/editor/editor-context";
import { useEditorTheme } from "@/components/editor/editor-theme";
import { AnimateHost, AnimationStyles } from "@/components/landing/animate";
import { LandingElement, sanitizeSvgMarkup } from "@/components/landing/elements";
import { PreviewFrame, useEditViewportStyles } from "@/components/editor/preview-frame";
import { LandingSection } from "@/components/landing/sections";
import { StylePreviewProvider } from "@/components/landing/style-preview";
import { resolveNodeStyles } from "@/lib/node-styles";
import {
  elementsSlot,
  elementSlot,
  frameSlotId,
  getElementStructureIssue,
  isContainerElement,
  isInstanceSlotEditable,
  slotDefs,
  wantsFullWidth,
} from "@/lib/slots";
import { themeStyle } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { AlignKind, PageElement, SlotDefinition, StyleProps } from "@/lib/types";

// Placement is shown by a measured insertion hint. List transforms assume a
// single axis and move nested/grid targets out from under the pointer.
const canvasSortingStrategy = () => null;

const positionedKeys = ["position", "top", "right", "bottom", "left", "zIndex"] as const;

function withoutPositioning(styles?: StyleProps): StyleProps | undefined {
  if (!styles) return styles;
  const next = { ...styles };
  for (const key of positionedKeys) delete next[key];
  return next;
}

function editorPositionedNode(node: PageElement, resolved: StyleProps) {
  if (resolved.position !== "absolute" && resolved.position !== "fixed") {
    return { displayNode: node, layoutStyle: undefined };
  }
  const layoutStyle: CSSProperties = {
    position: "absolute",
    top: resolved.top || undefined,
    right: resolved.right || undefined,
    bottom: resolved.bottom || undefined,
    left: resolved.left || undefined,
    zIndex: resolved.zIndex || undefined,
  };
  return {
    layoutStyle,
    displayNode: {
      ...node,
      styles: withoutPositioning(node.styles),
      responsive: {
        tablet: withoutPositioning(node.responsive?.tablet),
        mobile: withoutPositioning(node.responsive?.mobile),
      },
    },
  };
}

function svgFromTransfer(value: string) {
  const match = value.match(/<svg\b[\s\S]*?<\/svg>/i);
  return match?.[0] ?? "";
}

const Overlay = forwardRef<
  HTMLDivElement,
  {
    id: string;
    kind: "section" | "element";
    selected: boolean;
    label: string;
    onSelect: (event: MouseEvent) => void;
    onDuplicate?: () => void;
    onRemove?: () => void;
    inactive?: boolean;
    fillWidth?: boolean;
    locked?: boolean;
    dragDisabled?: boolean;
    data: Record<string, unknown>;
    layoutStyle?: CSSProperties;
    children: ReactNode;
  }
>(function Overlay(
  { id, kind, selected, label, onSelect, onDuplicate, onRemove, inactive, fillWidth, locked, dragDisabled, data, layoutStyle, children },
  forwardedRef,
) {
  const dark = useEditorTheme();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { kind, ...data },
    // Protected branch frames remain targets for their editable contents.
    disabled: { draggable: Boolean(locked || dragDisabled), droppable: Boolean(locked) },
  });
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ top: 0, left: 0, width: 0, height: 0, radius: "0px" });
  const [directHover, setDirectHover] = useState(false);
  const handleMouseOver = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDirectHover(true);
  }, []);
  const handleMouseOut = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDirectHover(false);
  }, []);

  useEffect(() => {
    if (isDragging) return;
    const root = boxRef.current;
    if (!root) return;
    const update = () => {
      const paint = (root.querySelector("[data-editor-node]") as HTMLElement | null) ?? root;
      const rootRect = root.getBoundingClientRect();
      const paintRect = paint.getBoundingClientRect();
      const scaleX = root.offsetWidth ? rootRect.width / root.offsetWidth : 1;
      const scaleY = root.offsetHeight ? rootRect.height / root.offsetHeight : scaleX;
      setBox({
        top: (paintRect.top - rootRect.top) / scaleY,
        left: (paintRect.left - rootRect.left) / scaleX,
        width: paintRect.width / scaleX,
        height: paintRect.height / scaleY,
        radius: getComputedStyle(paint).borderTopLeftRadius,
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(root);
    const paint = root.querySelector("[data-editor-node]");
    if (paint) observer.observe(paint);
    return () => observer.disconnect();
  }, [selected, id, isDragging]);

  const chrome = selected || !inactive;

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        boxRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }}
      data-editor-overlay={kind}
      data-section-id={typeof data.sectionId === "string" ? data.sectionId : undefined}
      data-slot-id={typeof data.slotId === "string" ? data.slotId : undefined}
      data-element-id={typeof data.elementId === "string" ? data.elementId : undefined}
      style={{
        ...layoutStyle,
        // Keep source in place — DragOverlay shows the preview (avoids laggy full-tree transforms)
        transform: isDragging ? undefined : CSS.Transform.toString(transform),
        transition: isDragging ? undefined : transition,
      }}
      className={cn(
        "group/overlay relative overflow-visible",
        kind === "element" && !fillWidth && "w-max max-w-full",
        (kind === "section" || fillWidth) && "w-full",
        isDragging && "z-30 opacity-30",
      )}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(event);
      }}
    >
      <div
        data-editor-chrome
        className={cn(
          "pointer-events-none absolute z-10 in-data-dragging:opacity-0",
          selected
            ? "shadow-[0_0_0_1px_#0d99ff]"
            : inactive
              ? "shadow-none"
              : directHover
                ? "shadow-[0_0_0_1px_rgba(13,153,255,0.55)]"
                : "shadow-none",
        )}
        style={{
          top: box.top,
          left: box.left,
          width: box.width,
          height: box.height,
          borderRadius: box.radius,
        }}
      />
      <div
        data-editor-chrome
        className={cn(
          "absolute z-20 flex h-4 items-center gap-0.5 in-data-dragging:opacity-0",
          selected
            ? "opacity-100"
            : chrome && directHover
              ? "opacity-100"
              : chrome
                ? "opacity-0 focus-within:opacity-100"
                : "opacity-0",
        )}
        style={{ top: box.top - 18, left: box.left }}
      >
        <span className="rounded-sm cursor-default bg-[#0d99ff] px-1 text-[9px] font-medium leading-4 text-white">{label}</span>
        {chrome && !locked && (!dragDisabled || onDuplicate || onRemove) ? (
          <div
            className={cn(
              "ml-0.5 flex items-center rounded-sm shadow-[0_0_0_1px_rgba(0,0,0,0.08)]",
              dark ? "bg-zinc-900 shadow-[0_0_0_1px_rgba(255,255,255,0.12)]" : "bg-white",
            )}
          >
            {!dragDisabled ? <button
              type="button"
              className="grid size-4 touch-none cursor-grab place-items-center text-zinc-400 active:cursor-grabbing"
              title={`Drag ${label}`}
              aria-label={`Drag ${label}`}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="size-3" />
            </button> : null}
            {onDuplicate ? (
              <button
                type="button"
                className={cn(
                  "grid size-4 place-items-center text-zinc-400",
                  dark ? "hover:text-zinc-100" : "hover:text-zinc-800",
                )}
                title="Duplicate"
                onClick={(event) => {
                  event.stopPropagation();
                  onDuplicate();
                }}
              >
                <Copy className="size-3" />
              </button>
            ) : null}
            {onRemove ? (
              <button
                type="button"
                className="grid size-4 place-items-center text-zinc-400 hover:text-red-600"
                title="Delete"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove();
                }}
              >
                <Trash2 className="size-3" />
              </button>
            ) : null}
          </div>
        ) : locked ? (
          <span className="ml-0.5 rounded-sm bg-zinc-400 px-1 text-[9px] font-medium leading-4 text-white">locked</span>
        ) : null}
      </div>
      {children}
    </div>
  );
});

Overlay.displayName = "Overlay";

function CanvasSizeBadge({ zoom }: { zoom: number }) {
  const dark = useEditorTheme();
  const { selectedElement, selectedSection, selection } = useEditor();
  const nodeId =
    selectedElement?.id ??
    (selection.kind === "section" || selection.kind === "slot" ? selectedSection?.id : null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!nodeId) return;
    const read = () => {
      const el = document.querySelector(`[data-editor-node="${window.CSS.escape(nodeId)}"]`) as HTMLElement | null;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setBox({ width: Math.round(rect.width / zoom), height: Math.round(rect.height / zoom) });
    };
    read();
    const frame = requestAnimationFrame(read);
    return () => cancelAnimationFrame(frame);
  }, [nodeId, selectedElement, selectedSection, zoom]);

  if (!nodeId || !box.width) return null;
  return (
    <div
      data-editor-size
      className={cn(
        "pointer-events-none absolute bottom-3 right-3 z-30 font-mono text-[10px]",
        dark ? "text-zinc-400" : "text-zinc-500",
      )}
    >
      {box.width} × {box.height}
    </div>
  );
}

function CanvasZoomControls({
  zoom,
  fit,
  onZoom,
  onFit,
}: {
  zoom: number;
  fit: boolean;
  onZoom: (zoom: number) => void;
  onFit: () => void;
}) {
  const dark = useEditorTheme();
  const surface = dark
    ? "border-zinc-700 bg-zinc-900 text-zinc-300"
    : "border-zinc-200 bg-white text-zinc-600";
  const button = dark
    ? "hover:bg-zinc-800 hover:text-zinc-50"
    : "hover:bg-zinc-100 hover:text-zinc-900";

  return (
    <div
      className={cn("absolute bottom-3 left-3 z-40 flex h-7 items-center overflow-hidden rounded-md border shadow-sm", surface)}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        title="Zoom out"
        aria-label="Zoom out"
        className={cn("grid size-7 place-items-center", button)}
        onClick={() => onZoom(Math.max(0.25, zoom - 0.1))}
      >
        <Minus className="size-3" />
      </button>
      <button
        type="button"
        title="Fit canvas"
        className={cn("flex h-7 min-w-14 items-center justify-center gap-1 border-x px-1.5 text-[10px]", dark ? "border-zinc-700" : "border-zinc-200", button, fit && "text-[#0d99ff]")}
        onClick={onFit}
      >
        <Maximize2 className="size-3" />
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        title="Zoom in"
        aria-label="Zoom in"
        className={cn("grid size-7 place-items-center", button)}
        onClick={() => onZoom(Math.min(2, zoom + 0.1))}
      >
        <Plus className="size-3" />
      </button>
    </div>
  );
}

function AlignToolbar() {
  const dark = useEditorTheme();
  const { canAlign, alignSelection } = useEditor();
  if (!canAlign) return null;
  const actions: { kind: AlignKind; icon: typeof AlignLeft; title: string }[] = [
    { kind: "left", icon: AlignLeft, title: "Align left" },
    { kind: "center", icon: AlignCenter, title: "Align center" },
    { kind: "right", icon: AlignRight, title: "Align right" },
    { kind: "top", icon: AlignLeft, title: "Align top" },
    { kind: "middle", icon: AlignCenter, title: "Align middle" },
    { kind: "bottom", icon: AlignRight, title: "Align bottom" },
    { kind: "distribute-horizontal", icon: MoveHorizontal, title: "Distribute horizontally" },
    { kind: "distribute-vertical", icon: MoveVertical, title: "Distribute vertically" },
  ];
  return (
    <div
      className={cn(
        "absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-0.5 rounded-md border p-0.5 shadow-sm",
        dark ? "border-zinc-700 bg-zinc-900" : "border-zinc-200 bg-white",
      )}
    >
      {actions.map((action, index) => (
        <span key={action.kind} className="flex items-center">
          {index === 3 || index === 6 ? (
            <span className={cn("mx-1 h-4 w-px", dark ? "bg-zinc-700" : "bg-zinc-200")} />
          ) : null}
          <button
            type="button"
            title={action.title}
            className={cn(
              "grid size-7 place-items-center rounded",
              dark
                ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
              (action.kind === "top" || action.kind === "bottom") && "rotate-90",
            )}
            onClick={(event) => {
              event.stopPropagation();
              alignSelection(action.kind);
            }}
          >
            <action.icon className="size-3.5" />
          </button>
        </span>
      ))}
    </div>
  );
}

export function EditorCanvas({ livePreview = false }: { livePreview?: boolean }) {
  const dark = useEditorTheme();
  const {
    page,
    selection,
    setSelection,
    requestLayerReveal,
    toggleSelectElement,
    selectedRefs,
    duplicateSection,
    removeSection,
    duplicateElement,
    removeElement,
    breakpoint,
    previewState,
    selectedElement,
    selectedSection,
    addElement,
    editorMode,
  } = useEditor();
  const width = breakpoint === "mobile" ? 390 : breakpoint === "tablet" ? 768 : 1200;
  useEditViewportStyles(width, !livePreview);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ viewportWidth: 0, stageHeight: 0 });
  const [zoomState, setZoomState] = useState<{ breakpoint: typeof breakpoint; value: number | null }>({
    breakpoint,
    value: null,
  });
  const fitZoom = canvasSize.viewportWidth
    ? Math.min(1, Math.max(0.25, (canvasSize.viewportWidth - 48) / width))
    : 1;
  const manualZoom = zoomState.breakpoint === breakpoint ? zoomState.value : null;
  const zoom = manualZoom ?? fitZoom;

  useEffect(() => {
    const viewport = viewportRef.current;
    const stage = stageRef.current;
    if (!viewport || !stage) return;
    const observer = new ResizeObserver(() => {
      setCanvasSize({
        viewportWidth: viewport.clientWidth,
        stageHeight: stage.offsetHeight,
      });
    });
    observer.observe(viewport);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [width, livePreview]);

  const insertSvg = useCallback(
    (source: string, sectionId?: string, slotId?: string) => {
      const markup = sanitizeSvgMarkup(svgFromTransfer(source));
      const targetSectionId = sectionId || selectedSection?.id || page.sections[0]?.id;
      if (!markup || !targetSectionId) return false;
      addElement(targetSectionId, "svg", slotId, undefined, {
        markup,
        label: "Pasted SVG",
      });
      return true;
    },
    [addElement, page.sections, selectedSection?.id],
  );

  useEffect(() => {
    if (livePreview) return;
    const onPaste = (event: ClipboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const source = event.clipboardData?.getData("image/svg+xml") ||
        event.clipboardData?.getData("text/html") ||
        event.clipboardData?.getData("text/plain") ||
        "";
      if (insertSvg(source)) event.preventDefault();
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [insertSvg, livePreview]);

  const isComponent = editorMode === "component";
  const selectedLabel =
    selection.kind === "element"
      ? "Element"
      : selection.kind === "elements"
        ? `${selection.items.length} selected`
        : selection.kind === "section"
          ? "Section"
          : selection.kind === "slot"
            ? `Slot · ${selection.slotId}`
            : isComponent
              ? "Component"
              : "Page";

  return (
    <StylePreviewProvider
      value={{
        breakpoint,
        previewState,
        live: livePreview,
        interactivePreview: livePreview,
        previewNodeId: selectedElement?.id ?? null,
      }}
    >
      <div className={cn("relative min-h-0 flex-1", dark ? "bg-zinc-900" : "bg-[#e5e5e5]")}>
      <div
        ref={viewportRef}
        className="absolute inset-0 overflow-auto"
        onDragOver={(event) => {
          if (livePreview) return;
          const types = Array.from(event.dataTransfer.types);
          if (
            types.includes("Files") ||
            types.some((type) => type === "image/svg+xml" || type === "text/plain" || type === "text/html")
          ) {
            event.preventDefault();
          }
        }}
        onDrop={async (event) => {
          if (livePreview) return;
          const file = Array.from(event.dataTransfer.files).find(
            (item) => item.type === "image/svg+xml" || item.name.toLowerCase().endsWith(".svg"),
          );
          const source = event.dataTransfer.getData("image/svg+xml") ||
            event.dataTransfer.getData("text/html") ||
            event.dataTransfer.getData("text/plain") ||
            (file ? await file.text() : "");
          const target = event.target instanceof Element ? event.target : null;
          const overlay = target?.closest<HTMLElement>("[data-section-id]");
          if (insertSvg(source, overlay?.dataset.sectionId, overlay?.dataset.slotId)) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onClick={() => {
          if (livePreview) return;
          const target = { kind: "page" } as const;
          setSelection(target);
          requestLayerReveal(target);
        }}
      >
        {!livePreview ? <AlignToolbar /> : null}
        <AnimationStyles />
        <div
          className={cn(
            "mx-auto flex items-center justify-between px-6 pb-2 pt-4 text-[11px]",
            dark ? "text-zinc-400" : "text-zinc-500",
          )}
        >
          <span>{livePreview ? "Live preview · interactions enabled" : selectedLabel}</span>
          <span className="font-mono">
            {breakpoint} · {width}
          </span>
        </div>
        <div className="px-6 pb-10">
          <div
            className="relative mx-auto"
            style={{
              width: width * zoom,
              height: Math.max(200, canvasSize.stageHeight * zoom),
            }}
          >
            <div
              ref={stageRef}
              className="absolute left-0 top-0 overflow-visible bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_24px_80px_rgba(15,23,42,0.08)]"
              data-editor-scale={zoom}
              style={{ width, transform: `scale(${zoom})`, transformOrigin: "top left" }}
            >
            {livePreview ? (
              <PreviewFrame page={page} width={width} breakpoint={breakpoint} />
            ) : (
            <CanvasEditorContextMenu pageId={page.id}>
            <SortableContext items={page.sections.map((section) => section.id)} strategy={canvasSortingStrategy}>
              <div data-page-export-root data-editor-canvas style={themeStyle(page.theme)}>
                {/* Selected-breakpoint inline styles must not be overridden by
                    runtime media rules evaluated against the editor window. */}
                {!isComponent ? <SectionGapDrop index={0} /> : null}
                {page.sections.map((section, index) => {
                  const sectionSelected = selection.kind === "section" && selection.sectionId === section.id;
                  const instanceLocked = !isComponent && Boolean(section.componentId);
                  const elementIds = slotDefs(section.type).flatMap((slot) => {
                    if (slot.kind === "elements") {
                      return elementsSlot(section, slot.id).map((element) => element.id);
                    }
                    if (slot.kind === "element") {
                      const element = elementSlot(section, slot.id);
                      return element ? [element.id] : [];
                    }
                    return [];
                  });
                  return (
                    <div key={section.id}>
                    <Overlay
                      id={section.id}
                      kind="section"
                      label={`${index + 1}. ${section.name}`}
                      selected={sectionSelected}
                      inactive={selectedRefs.some((ref) => ref.sectionId === section.id)}
                      data={{ sectionId: section.id }}
                      onSelect={() => {
                        const target = { kind: "section", sectionId: section.id } as const;
                        setSelection(target);
                        requestLayerReveal(target);
                      }}
                      onDuplicate={isComponent ? undefined : () => duplicateSection(section.id)}
                      onRemove={isComponent ? undefined : () => removeSection(section.id)}
                    >
                      <SortableContext items={elementIds} strategy={canvasSortingStrategy}>
                        <LandingSection
                          section={section}
                          theme={page.theme}
                          interactive={false}
                          renderElement={(element: PageElement, slotId: string) => {
                            const renderNested = (
                              node: PageElement,
                              nodeSlotId: string,
                              ancestors: PageElement[] = [],
                            ): ReactNode => {
                              const editable = !instanceLocked || isInstanceSlotEditable(section, node, ancestors);
                              const structureIssue = getElementStructureIssue(section, node.id, { allowComponentRoot: isComponent });
                              const resolvedNode = resolveNodeStyles(
                                node, breakpoint, selectedElement?.id === node.id ? previewState : "default",
                              );
                              const { displayNode, layoutStyle } = editorPositionedNode(node, resolvedNode);
                              const fill =
                                wantsFullWidth({ ...node, styles: resolvedNode }) || isContainerElement(node.type);
                              return (
                              <Overlay
                                id={node.id}
                                kind="element"
                                label={
                                  node.type === "frame" && (node.props.branch === "then" || node.props.branch === "else")
                                    ? `IF · ${String(node.props.branch).toUpperCase()}`
                                    : node.textSlot
                                    ? `${node.type} · slot`
                                    : node.type === "slot"
                                      ? `slot · ${String(node.props.name || "Slot")}`
                                      : typeof node.props.label === "string" && node.props.label.trim()
                                        ? node.props.label.trim()
                                        : node.type
                                }
                                selected={selectedRefs.some((ref) => ref.elementId === node.id)}
                                fillWidth={fill}
                                locked={!editable}
                                dragDisabled={Boolean(structureIssue)}
                                layoutStyle={layoutStyle}
                                data={{
                                  sectionId: section.id,
                                  slotId: nodeSlotId,
                                  elementId: node.id,
                                  elementType: node.type,
                                }}
                                onSelect={(event) => {
                                  if (!editable && !node.textSlot) {
                                    const target = { kind: "section", sectionId: section.id } as const;
                                    setSelection(target);
                                    requestLayerReveal(target);
                                    return;
                                  }
                                  const target = {
                                    kind: "element",
                                    sectionId: section.id,
                                    slotId: nodeSlotId,
                                    elementId: node.id,
                                  } as const;
                                  toggleSelectElement(target, event.shiftKey || event.metaKey);
                                  requestLayerReveal(target);
                                }}
                                onDuplicate={editable && !structureIssue ? () => duplicateElement(section.id, node.id) : undefined}
                                onRemove={editable && !structureIssue ? () => removeElement(section.id, node.id) : undefined}
                              >
                                <AnimateHost
                                  node={displayNode}
                                  className={fill ? "block min-w-0 w-full" : "inline-flex max-w-full"}
                                >
                                  {node.type === "frame" && (node.props.branch === "then" || node.props.branch === "else") ? (
                                    <div data-editor-chrome data-page-export-remove className="pointer-events-none text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                                      IF · {String(node.props.branch)}
                                    </div>
                                  ) : null}
                                  <LandingElement
                                    element={displayNode}
                                    interactive={false}
                                    wrapChildren={(children, parent) => (
                                      <SortableContext
                                        items={(parent.children ?? []).map((child) => child.id)}
                                        strategy={canvasSortingStrategy}
                                      >
                                        {children}
                                      </SortableContext>
                                    )}
                                    renderChild={(child, parent) =>
                                      renderNested(child, frameSlotId(parent.id), [...ancestors, parent])
                                    }
                                    renderFrameEmpty={(parent) =>
                                      !instanceLocked ||
                                      parent.type === "slot" ||
                                      ancestors.some((a) => a.type === "slot") ||
                                      isInstanceSlotEditable(section, parent, ancestors) ? (
                                        <FrameDropZone
                                          sectionId={section.id}
                                          parentId={parent.id}
                                          compact={(parent.children ?? []).length > 0}
                                          label={
                                            parent.type === "slot"
                                              ? "Drop into slot"
                                              : parent.type === "list"
                                                ? "Drop list template"
                                                : undefined
                                          }
                                        />
                                      ) : null
                                    }
                                  />
                                </AnimateHost>
                              </Overlay>
                              );
                            };
                            return renderNested(element, slotId);
                          }}
                          renderInsertGap={(slotId, atIndex) => (
                            <ElementInsertDrop
                              sectionId={section.id}
                              slotId={slotId}
                              index={atIndex}
                              disabled={instanceLocked}
                            />
                          )}
                          renderEmptySlot={(slotId) => {
                            const def = slotDefs(section.type).find((slot) => slot.id === slotId) as
                              | SlotDefinition
                              | undefined;
                            if (!def || def.kind === "text") return null;
                            const filled =
                              def.kind === "elements" ? elementsSlot(section, slotId).length > 0 : false;
                            // Filled slots rely on insert gaps / element drops — no permanent "Add to…" chrome.
                            if (filled) return null;
                            return <EmptySlot sectionId={section.id} slot={def} disabled={instanceLocked} />;
                          }}
                        />
                      </SortableContext>
                    </Overlay>
                    {!isComponent ? <SectionGapDrop index={index + 1} /> : null}
                    </div>
                  );
                })}
              </div>
            </SortableContext>
            </CanvasEditorContextMenu>
            )}
            </div>
          </div>
        </div>
      </div>
      <CanvasZoomControls
        zoom={zoom}
        fit={manualZoom === null}
        onFit={() => setZoomState({ breakpoint, value: null })}
        onZoom={(value) => setZoomState({ breakpoint, value })}
      />
      {!livePreview ? <CanvasSizeBadge zoom={zoom} /> : null}
      </div>
    </StylePreviewProvider>
  );
}
