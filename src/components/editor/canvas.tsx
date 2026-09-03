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
import { useEditor } from "@/components/editor/editor-context";
import { LandingElement } from "@/components/landing/elements";
import { LandingSection } from "@/components/landing/sections";
import { StylePreviewProvider } from "@/components/landing/style-preview";
import { elementsSlot, slotDefs } from "@/lib/slots";
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
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = boxRef.current;
    if (!node) return;
    const update = () => setSize({ width: Math.round(node.offsetWidth), height: Math.round(node.offsetHeight) });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [selected, id]);

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        boxRef.current = node;
      }}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("group/overlay relative", isDragging && "z-30 opacity-40")}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(event);
      }}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-10 rounded-[2px] border transition-colors",
          selected
            ? "border-[1.5px] border-[#0d99ff]"
            : inactive
              ? "border border-transparent"
              : "border border-transparent group-hover/overlay:border-[#0d99ff]/70",
        )}
      />
      <div
        className={cn(
          "absolute left-1.5 top-1.5 z-20 flex items-center gap-1 rounded-[2px] bg-[#0d99ff] px-1.5 py-0.5 text-[10px] font-medium text-white",
          selected ? "opacity-100" : inactive ? "opacity-0" : "pointer-events-none opacity-0 group-hover/overlay:opacity-100",
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          "absolute right-1.5 top-1.5 z-20 flex items-center gap-0.5 rounded-[4px] border border-zinc-200 bg-white p-0.5 shadow-sm",
          selected ? "opacity-100" : inactive ? "opacity-0" : "opacity-0 group-hover/overlay:opacity-100",
        )}
      >
        <button
          type="button"
          className="grid h-6 w-6 cursor-grab place-items-center text-zinc-400 active:cursor-grabbing"
          title="Drag"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>
        {onDuplicate ? (
          <button
            type="button"
            className="grid h-6 w-6 place-items-center text-zinc-400 hover:text-zinc-800"
            title="Duplicate"
            onClick={(event) => {
              event.stopPropagation();
              onDuplicate();
            }}
          >
            <Copy className="size-3.5" />
          </button>
        ) : null}
        {onRemove ? (
          <button
            type="button"
            className="grid h-6 w-6 place-items-center text-zinc-400 hover:text-red-600"
            title="Delete"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
          >
            <Trash2 className="size-3.5" />
          </button>
        ) : null}
      </div>
      {selected ? (
        <div className="pointer-events-none absolute bottom-1.5 right-1.5 z-20 rounded-[2px] bg-zinc-900/80 px-1.5 py-0.5 font-mono text-[10px] text-white">
          {size.width} × {size.height}
        </div>
      ) : null}
      {children}
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
  } = useEditor();
  const width = breakpoint === "mobile" ? 390 : breakpoint === "tablet" ? 768 : 1200;
  const selectedLabel =
    selection.kind === "element"
      ? "Element"
      : selection.kind === "elements"
        ? `${selection.items.length} selected`
        : selection.kind === "section"
          ? "Section"
          : selection.kind === "slot"
            ? `Slot · ${selection.slotId}`
            : "Page";

  return (
    <StylePreviewProvider value={{ breakpoint, previewState, live: false, previewNodeId: selectedElement?.id ?? null }}>
      <div
        className="relative min-h-0 flex-1 overflow-auto bg-[#e5e5e5]"
        onClick={() => setSelection({ kind: "page" })}
      >
        <AlignToolbar />
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
                {page.sections.map((section, index) => {
                  const sectionSelected = selection.kind === "section" && selection.sectionId === section.id;
                  const elementIds = slotDefs(section.type)
                    .filter((slot) => slot.kind === "elements")
                    .flatMap((slot) => elementsSlot(section, slot.id).map((element) => element.id));
                  return (
                    <Overlay
                      key={section.id}
                      id={section.id}
                      kind="section"
                      label={`${index + 1}. ${section.name}`}
                      selected={sectionSelected}
                      inactive={selectedRefs.some((ref) => ref.sectionId === section.id)}
                      data={{ sectionId: section.id }}
                      onSelect={() => setSelection({ kind: "section", sectionId: section.id })}
                      onDuplicate={() => duplicateSection(section.id)}
                      onRemove={() => removeSection(section.id)}
                    >
                      <SortableContext items={elementIds} strategy={verticalListSortingStrategy}>
                        <LandingSection
                          section={section}
                          theme={page.theme}
                          interactive={false}
                          renderElement={(element: PageElement, slotId: string) => (
                            <Overlay
                              id={element.id}
                              kind="element"
                              label={element.type}
                              selected={selectedRefs.some((ref) => ref.elementId === element.id)}
                              data={{ sectionId: section.id, slotId, elementId: element.id }}
                              onSelect={(event) =>
                                toggleSelectElement(
                                  { sectionId: section.id, slotId, elementId: element.id },
                                  event.shiftKey || event.metaKey,
                                )
                              }
                              onDuplicate={() => duplicateElement(section.id, element.id)}
                              onRemove={() => removeElement(section.id, element.id)}
                            >
                              <LandingElement element={element} interactive={false} />
                            </Overlay>
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
                  );
                })}
              </div>
            </SortableContext>
          </div>
        </div>
      </div>
    </StylePreviewProvider>
  );
}
