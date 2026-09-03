"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, GripVertical, Trash2 } from "lucide-react";
import { EmptySlot } from "@/components/editor/empty-slot";
import { useEditor } from "@/components/editor/editor-context";
import { LandingElement } from "@/components/landing/elements";
import { LandingSection } from "@/components/landing/sections";
import { elementsSlot, slotDefs } from "@/lib/slots";
import { themeStyle } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { PageElement, SlotDefinition } from "@/lib/types";

function Overlay({
  id,
  kind,
  selected,
  label,
  onSelect,
  onDuplicate,
  onRemove,
  data,
  children,
}: {
  id: string;
  kind: "section" | "element";
  selected: boolean;
  label: string;
  onSelect: () => void;
  onDuplicate?: () => void;
  onRemove?: () => void;
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
        onSelect();
      }}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-10 rounded-[6px] border transition-colors",
          selected
            ? kind === "section"
              ? "border-2 border-teal-600"
              : "border-2 border-amber-500"
            : kind === "section"
              ? "border border-transparent group-hover/overlay:border-teal-400/80"
              : "border border-transparent group-hover/overlay:border-amber-400/80",
        )}
      />
      <div
        className={cn(
          "absolute left-2 top-2 z-20 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white",
          kind === "section" ? "bg-teal-700" : "bg-amber-500",
          selected ? "opacity-100" : "pointer-events-none opacity-0 group-hover/overlay:opacity-100",
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          "absolute right-2 top-2 z-20 flex items-center gap-1 rounded-md border bg-white/95 p-0.5 shadow-sm",
          selected ? "opacity-100" : "opacity-0 group-hover/overlay:opacity-100",
        )}
      >
        <button
          type="button"
          className="grid h-7 w-7 cursor-grab place-items-center text-muted-foreground active:cursor-grabbing"
          title="Drag"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        {onDuplicate ? (
          <button
            type="button"
            className="grid h-7 w-7 place-items-center text-muted-foreground hover:text-foreground"
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
            className="grid h-7 w-7 place-items-center text-muted-foreground hover:text-destructive"
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
        <div className="pointer-events-none absolute bottom-2 right-2 z-20 rounded bg-zinc-900/80 px-1.5 py-0.5 font-mono text-[10px] text-white">
          {size.width} × {size.height}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function EditorCanvas({ device }: { device: "desktop" | "tablet" | "mobile" }) {
  const {
    page,
    selection,
    setSelection,
    duplicateSection,
    removeSection,
    duplicateElement,
    removeElement,
  } = useEditor();
  const width = device === "mobile" ? 390 : device === "tablet" ? 768 : 1200;
  const selectedLabel =
    selection.kind === "element"
      ? `Element · ${selection.elementId.slice(0, 6)}`
      : selection.kind === "section"
        ? "Section"
        : selection.kind === "slot"
          ? `Slot · ${selection.slotId}`
          : "Page";

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-[radial-gradient(#d4d4d8_1px,transparent_1px)] bg-[size:18px_18px] bg-zinc-200/90" onClick={() => setSelection({ kind: "page" })}>
      <div className="mx-auto flex items-center justify-between px-6 pb-2 pt-4 text-xs text-zinc-500">
        <span>{selectedLabel}</span>
        <span className="font-mono">
          {device} · {width}px
        </span>
      </div>
      <div className="px-6 pb-10">
        <div
          className="mx-auto overflow-visible rounded-xl border bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)]"
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
                            selected={selection.kind === "element" && selection.elementId === element.id}
                            data={{ sectionId: section.id, slotId, elementId: element.id }}
                            onSelect={() =>
                              setSelection({
                                kind: "element",
                                sectionId: section.id,
                                slotId,
                                elementId: element.id,
                              })
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
  );
}
