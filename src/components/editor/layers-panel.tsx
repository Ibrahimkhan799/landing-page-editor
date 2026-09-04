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
import { elementsSlot, elementSlot, findElement, frameSlotId, isContainerElement, slotDefs } from "@/lib/slots";
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
  dragDisabled,
}: {
  id: string;
  data: Record<string, unknown>;
  depth: number;
  label: string;
  active?: boolean;
  muted?: boolean;
  icon: typeof Frame;
  onClick: () => void;
  dragDisabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data,
    animateLayoutChanges: () => false,
    transition: null,
    disabled: Boolean(dragDisabled),
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
      {!dragDisabled ? (
        <button
          type="button"
          className="grid size-4 shrink-0 cursor-grab place-items-center text-zinc-400 hover:text-zinc-700 active:cursor-grabbing dark:text-zinc-500 dark:hover:text-zinc-200"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3" />
        </button>
      ) : (
        <span className="size-4 shrink-0" />
      )}
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-sm pr-2 text-left text-[12px]",
          active
            ? "bg-[#0d99ff]/15 text-zinc-900 dark:text-zinc-50"
            : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
          muted && "text-zinc-400 dark:text-zinc-500",
        )}
      >
        <Icon className="size-3.5 shrink-0 text-zinc-400" />
        <span className="truncate">{label}</span>
      </button>
    </div>
  );
}

function SlotDrop({
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
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-sm transition-colors",
        isOver && "bg-[#0d99ff]/10 ring-1 ring-inset ring-[#0d99ff]/40",
      )}
    >
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
  const kids = element.children ?? [];
  const isContainer = element.type === "frame" || element.type === "slot" || element.type === "list";

  return (
    <>
      <SortableLayer
        id={`layer-el-${element.id}`}
        data={{ kind: "layer-element", sectionId, slotId, elementId: element.id, elementType: element.type }}
        depth={depth}
        label={element.type === "slot" ? String(element.props.name || "slot") : element.type}
        icon={Icon}
        active={active}
        onClick={() => toggleSelectElement({ sectionId, slotId, elementId: element.id }, false)}
      />
      {isContainer ? (
        <SlotDrop sectionId={sectionId} slotId={childSlot}>
          <SortableContext
            items={kids.map((child) => `layer-el-${child.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {kids.map((child) => (
              <LayerTree
                key={child.id}
                sectionId={sectionId}
                slotId={childSlot}
                element={child}
                depth={depth + 1}
              />
            ))}
          </SortableContext>
          {kids.length === 0 ? (
            <div className="h-4" style={{ marginLeft: 8 + (depth + 1) * 12 }} aria-hidden />
          ) : null}
        </SlotDrop>
      ) : null}
    </>
  );
}

function SectionLayers({ section }: { section: PageSection }) {
  const { selection, setSelection, editorMode } = useEditor();
  const [open, setOpen] = useState(true);
  const selected =
    (selection.kind === "section" && selection.sectionId === section.id) ||
    (selection.kind !== "page" &&
      selection.kind !== "elements" &&
      "sectionId" in selection &&
      selection.sectionId === section.id);
  const defs = slotDefs(section.type);
  const hideBodyLabel = section.type === "custom" && defs.length === 1 && defs[0]?.id === "body";
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `layer-section-${section.id}`,
    data: { kind: "layer-section", sectionId: section.id },
    animateLayoutChanges: () => false,
    transition: null,
    disabled: editorMode === "component",
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: isDragging ? undefined : CSS.Transform.toString(transform),
        transition: isDragging ? undefined : transition,
      }}
      className={cn(isDragging && "z-20 opacity-50")}
    >
      <div className="flex items-center">
        <button
          type="button"
          className="grid size-6 place-items-center text-zinc-400"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        </button>
        {editorMode === "page" ? (
          <button
            type="button"
            className="grid size-4 shrink-0 cursor-grab place-items-center text-zinc-400 hover:text-zinc-700 active:cursor-grabbing dark:hover:text-zinc-200"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-3" />
          </button>
        ) : (
          <span className="size-4 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => setSelection({ kind: "section", sectionId: section.id })}
          className={cn(
            "flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-sm px-1 text-left text-[12px]",
            selection.kind === "section" && selection.sectionId === section.id
              ? "bg-[#0d99ff]/15 text-zinc-900 dark:text-zinc-50"
              : selected
                ? "text-zinc-900 dark:text-zinc-100"
                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
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
                <button
                  key={slot.id}
                  type="button"
                  className="flex h-7 w-full items-center rounded-sm text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                  style={{ paddingLeft: 32 }}
                  onClick={() => setSelection({ kind: "slot", sectionId: section.id, slotId: slot.id })}
                >
                  <Type className="mr-1.5 size-3.5 text-zinc-300" />
                  <span className="text-[12px] text-zinc-500 dark:text-zinc-400">{slot.label}</span>
                </button>
              );
            }
            const items =
              slot.kind === "elements"
                ? elementsSlot(section, slot.id)
                : elementSlot(section, slot.id)
                  ? [elementSlot(section, slot.id) as PageElement]
                  : [];
            const sortable = slot.kind === "elements";
            const showSlotRow = !(hideBodyLabel && slot.id === "body");
            return (
              <SlotDrop key={slot.id} sectionId={section.id} slotId={slot.id}>
                {showSlotRow ? (
                  <button
                    type="button"
                    className="flex h-7 w-full items-center rounded-sm text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                    style={{ paddingLeft: 32 }}
                    onClick={() => setSelection({ kind: "slot", sectionId: section.id, slotId: slot.id })}
                  >
                    <Frame className="mr-1.5 size-3.5 text-zinc-400" />
                    <span className="text-[12px] text-zinc-600 dark:text-zinc-400">{slot.label}</span>
                  </button>
                ) : null}
                {sortable ? (
                  <SortableContext
                    items={items.map((item) => `layer-el-${item.id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    {items.map((element) => (
                      <LayerTree
                        key={element.id}
                        sectionId={section.id}
                        slotId={slot.id}
                        element={element}
                        depth={showSlotRow ? 3 : 2}
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
                      depth={showSlotRow ? 3 : 2}
                    />
                  ))
                )}
              </SlotDrop>
            );
          })
        : null}
    </div>
  );
}

export function LayersPanel() {
  const { page, setSelection, moveSection, moveElement, relocateElement, editorMode } = useEditor();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

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
          relocateElement(
            activeData.sectionId,
            activeData.slotId,
            activeData.elementId,
            overData.sectionId,
            overData.slotId,
          );
        }
        return;
      }
      if (
        overData?.kind === "layer-element" &&
        overData.sectionId &&
        overData.slotId &&
        overData.elementId
      ) {
        // Drop onto a container row → nest inside that container.
        const overSection = page.sections.find((item) => item.id === overData.sectionId);
        const overEl = overSection ? findElement(overSection, overData.elementId)?.element : null;
        if (
          overEl &&
          isContainerElement(overEl.type) &&
          overEl.id !== activeData.elementId
        ) {
          relocateElement(
            activeData.sectionId,
            activeData.slotId,
            activeData.elementId,
            overData.sectionId,
            frameSlotId(overEl.id),
          );
          return;
        }

        const same = overData.sectionId === activeData.sectionId && overData.slotId === activeData.slotId;
        if (!same) {
          const section = page.sections.find((item) => item.id === overData.sectionId);
          let atIndex: number | undefined;
          if (section) {
            const frameParent =
              typeof overData.slotId === "string" && overData.slotId.startsWith("frame:")
                ? overData.slotId.slice("frame:".length)
                : null;
            if (frameParent) {
              const kids = findElement(section, frameParent)?.element.children ?? [];
              atIndex = kids.findIndex((el) => el.id === overData.elementId);
            } else {
              atIndex = elementsSlot(section, overData.slotId).findIndex((el) => el.id === overData.elementId);
            }
            if (atIndex < 0) atIndex = undefined;
          }
          relocateElement(
            activeData.sectionId,
            activeData.slotId,
            activeData.elementId,
            overData.sectionId,
            overData.slotId,
            atIndex,
          );
          return;
        }

        // Same container — prefer frame-aware relocate with index, else top-level moveElement
        if (activeData.slotId.startsWith("frame:") || overData.slotId.startsWith("frame:")) {
          const section = page.sections.find((item) => item.id === activeData.sectionId);
          if (!section) return;
          const frameParent = activeData.slotId.startsWith("frame:")
            ? activeData.slotId.slice("frame:".length)
            : null;
          const kids = frameParent ? findElement(section, frameParent)?.element.children ?? [] : [];
          const to = kids.findIndex((el) => el.id === overData.elementId);
          if (to >= 0) {
            relocateElement(
              activeData.sectionId,
              activeData.slotId,
              activeData.elementId,
              overData.sectionId,
              overData.slotId,
              to,
            );
          }
          return;
        }

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
          {editorMode === "page" ? (
            <button
              type="button"
              onClick={() => setSelection({ kind: "page" })}
              className="flex h-7 w-full items-center gap-1.5 rounded-sm px-2 text-left text-[12px] text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Frame className="size-3.5 text-zinc-400" />
              {page.name || "Page"}
            </button>
          ) : null}
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
