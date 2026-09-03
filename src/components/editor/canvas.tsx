"use client";

import type { MouseEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Copy,
  GripVertical,
  MoveHorizontal,
  MoveVertical,
  Trash2,
} from "lucide-react";
import { EmptySlot } from "@/components/editor/empty-slot";
import { FrameDropZone } from "@/components/editor/frame-drop-zone";
import { ElementInsertDrop, SectionGapDrop } from "@/components/editor/insert-gaps";
import { useEditor } from "@/components/editor/editor-context";
import { AnimateHost, AnimationStyles } from "@/components/landing/animate";
import { LandingElement } from "@/components/landing/elements";
import { LandingSection } from "@/components/landing/sections";
import { StylePreviewProvider } from "@/components/landing/style-preview";
import { collectStyledNodes, nodeStylesheet } from "@/lib/node-styles";
import { elementsSlot, frameSlotId, slotDefs } from "@/lib/slots";
import { themeStyle } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { AlignKind, PageElement, SlotDefinition } from "@/lib/types";

function Overlay({
  id,
  kind,
  selected,
  label,
  onSelect,
  onDuplicate,
  onRemove,
  inactive,
  data,
  children,
}: {
  id: string;
  kind: "section" | "element";
  selected: boolean;
  label: string;
  onSelect: (event: MouseEvent) => void;
  onDuplicate?: () => void;
  onRemove?: () => void;
  inactive?: boolean;
  data: Record<string, unknown>;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { kind, ...data },
  });
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ top: 0, left: 0, width: 0, height: 0, radius: "0px" });

  useEffect(() => {
    const root = boxRef.current;
    if (!root) return;
    const update = () => {
      const paint = (root.querySelector("[data-editor-node]") as HTMLElement | null) ?? root;
      const rootRect = root.getBoundingClientRect();
      const paintRect = paint.getBoundingClientRect();
      setBox({
        top: paintRect.top - rootRect.top,
        left: paintRect.left - rootRect.left,
        width: paintRect.width,
        height: paintRect.height,
        radius: getComputedStyle(paint).borderTopLeftRadius,
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(root);
    const paint = root.querySelector("[data-editor-node]");
    if (paint) observer.observe(paint);
    return () => observer.disconnect();
  }, [selected, id]);

  const chrome = selected || !inactive;

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        boxRef.current = node;
      }}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("group/overlay relative overflow-visible", isDragging && "z-30 opacity-40")}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(event);
      }}
    >
      <div
        data-editor-chrome
        className={cn(
          "pointer-events-none absolute z-10",
          selected
            ? "shadow-[0_0_0_1px_#0d99ff]"
            : inactive
              ? "shadow-none"
              : "shadow-none group-hover/overlay:shadow-[0_0_0_1px_rgba(13,153,255,0.55)]",
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
          "absolute z-20 flex h-4 items-center gap-0.5",
          selected ? "opacity-100" : chrome ? "opacity-0 group-hover/overlay:opacity-100" : "opacity-0",
        )}
        style={{ top: box.top - 18, left: box.left }}
      >
        <span className="rounded-sm bg-[#0d99ff] px-1 text-[9px] font-medium leading-4 text-white">{label}</span>
        {chrome ? (
          <div className="ml-0.5 flex items-center rounded-sm bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.08)]">
            <button
              type="button"
              className="grid size-4 cursor-grab place-items-center text-zinc-400 active:cursor-grabbing"
              title="Drag"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="size-3" />
            </button>
            {onDuplicate ? (
              <button
                type="button"
                className="grid size-4 place-items-center text-zinc-400 hover:text-zinc-800"
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
        ) : null}
      </div>
      {children}
    </div>
  );
}

function CanvasSizeBadge() {
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
      setBox({ width: Math.round(rect.width), height: Math.round(rect.height) });
    };
    read();
    const frame = requestAnimationFrame(read);
    return () => cancelAnimationFrame(frame);
  }, [nodeId, selectedElement, selectedSection]);

  if (!nodeId || !box.width) return null;
  return (
    <div
      data-editor-size
      className="pointer-events-none absolute bottom-3 right-3 z-30 font-mono text-[10px] text-zinc-500"
    >
      {box.width} × {box.height}
    </div>
  );
}

function AlignToolbar() {
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
    <div className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-0.5 rounded-md border border-zinc-200 bg-white p-0.5 shadow-sm">
      {actions.map((action, index) => (
        <span key={action.kind} className="flex items-center">
          {index === 3 || index === 6 ? <span className="mx-1 h-4 w-px bg-zinc-200" /> : null}
          <button
            type="button"
            title={action.title}
            className={cn(
              "grid size-7 place-items-center rounded text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
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

export function EditorCanvas() {
  const {
    page,
    selection,
    setSelection,
    toggleSelectElement,
    selectedRefs,
    duplicateSection,
    removeSection,
    duplicateElement,
    removeElement,
    breakpoint,
    previewState,
    selectedElement,
    editorMode,
  } = useEditor();
  const width = breakpoint === "mobile" ? 390 : breakpoint === "tablet" ? 768 : 1200;
  const css = nodeStylesheet(collectStyledNodes(page));
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
    <StylePreviewProvider value={{ breakpoint, previewState, live: false, previewNodeId: selectedElement?.id ?? null }}>
      <div className="relative min-h-0 flex-1 bg-[#e5e5e5]">
      <div
        className="absolute inset-0 overflow-auto"
        onClick={() => setSelection({ kind: "page" })}
      >
        <AlignToolbar />
        <AnimationStyles />
        <div className="mx-auto flex items-center justify-between px-6 pb-2 pt-4 text-[11px] text-zinc-500">
          <span>{selectedLabel}</span>
          <span className="font-mono">
            {breakpoint} · {width}
          </span>
        </div>
        <div className="px-6 pb-10">
          <div
            className="mx-auto overflow-visible bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_24px_80px_rgba(15,23,42,0.08)]"
            style={{ maxWidth: width }}
          >
            <SortableContext items={page.sections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
              <div style={themeStyle(page.theme)}>
              {css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}
                {!isComponent ? <SectionGapDrop index={0} /> : null}
                {page.sections.map((section, index) => {
                  const sectionSelected = selection.kind === "section" && selection.sectionId === section.id;
                  const elementIds = slotDefs(section.type)
                    .filter((slot) => slot.kind === "elements")
                    .flatMap((slot) => elementsSlot(section, slot.id).map((element) => element.id));
                  return (
                    <div key={section.id}>
                    <Overlay
                      id={section.id}
                      kind="section"
                      label={`${index + 1}. ${section.name}`}
                      selected={sectionSelected}
                      inactive={selectedRefs.some((ref) => ref.sectionId === section.id)}
                      data={{ sectionId: section.id }}
                      onSelect={() => setSelection({ kind: "section", sectionId: section.id })}
                      onDuplicate={isComponent ? undefined : () => duplicateSection(section.id)}
                      onRemove={isComponent ? undefined : () => removeSection(section.id)}
                    >
                      <SortableContext items={elementIds} strategy={verticalListSortingStrategy}>
                        <LandingSection
                          section={section}
                          theme={page.theme}
                          interactive={false}
                          renderElement={(element: PageElement, slotId: string) => {
                            const renderNested = (node: PageElement, nodeSlotId: string): ReactNode => (
                              <Overlay
                                id={node.id}
                                kind="element"
                                label={node.type}
                                selected={selectedRefs.some((ref) => ref.elementId === node.id)}
                                data={{ sectionId: section.id, slotId: nodeSlotId, elementId: node.id }}
                                onSelect={(event) =>
                                  toggleSelectElement(
                                    { sectionId: section.id, slotId: nodeSlotId, elementId: node.id },
                                    event.shiftKey || event.metaKey,
                                  )
                                }
                                onDuplicate={() => duplicateElement(section.id, node.id)}
                                onRemove={() => removeElement(section.id, node.id)}
                              >
                                <AnimateHost node={node} className={node.type === "frame" ? "block w-full" : "inline-flex max-w-full"}>
                                  <LandingElement
                                    element={node}
                                    interactive={false}
                                    renderChild={(child, parent) => renderNested(child, frameSlotId(parent.id))}
                                    renderFrameEmpty={(parent) => (
                                      <FrameDropZone
                                        sectionId={section.id}
                                        parentId={parent.id}
                                        compact={(parent.children ?? []).length > 0}
                                      />
                                    )}
                                  />
                                </AnimateHost>
                              </Overlay>
                            );
                            return renderNested(element, slotId);
                          }}
                          renderInsertGap={(slotId, atIndex) => (
                            <ElementInsertDrop sectionId={section.id} slotId={slotId} index={atIndex} />
                          )}
                          renderEmptySlot={(slotId) => {
                            const def = slotDefs(section.type).find((slot) => slot.id === slotId) as
                              | SlotDefinition
                              | undefined;
                            if (!def || def.kind === "text") return null;
                            const filled =
                              def.kind === "elements" ? elementsSlot(section, slotId).length > 0 : false;
                            return <EmptySlot sectionId={section.id} slot={def} compact={filled} />;
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
          </div>
        </div>
      </div>
      <CanvasSizeBadge />
      </div>
    </StylePreviewProvider>
  );
}
