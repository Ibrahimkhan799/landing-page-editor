"use client";

import { useDndContext, useDroppable } from "@dnd-kit/core";
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
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEditor } from "@/components/editor/editor-context";
import {
  elementsSlot,
  elementSlot,
  frameSlotId,
  isContainerElement,
  isInstanceSlotEditable,
  slotDefs,
} from "@/lib/slots";
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
          className="grid size-4 shrink-0 touch-none cursor-grab place-items-center text-zinc-400 hover:text-zinc-700 active:cursor-grabbing dark:text-zinc-500 dark:hover:text-zinc-200"
          {...attributes}
          {...listeners}
          aria-label={`Drag ${label}`}
        >
          <GripVertical className="size-3" />
        </button>
      ) : (
        <span className="size-4 shrink-0" />
      )}
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
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

function acceptsElementGap(activeKind: string | undefined) {
  return (
    activeKind === undefined ||
    activeKind === "element" ||
    activeKind === "layer-element" ||
    activeKind === "library-element"
  );
}

function acceptsSectionGap(activeKind: string | undefined) {
  return (
    activeKind === undefined ||
    activeKind === "section" ||
    activeKind === "layer-section" ||
    activeKind === "library-section" ||
    activeKind === "library-component" ||
    activeKind === "library-element"
  );
}

function ElementInsertDrop({
  sectionId,
  slotId,
  atIndex,
  depth,
  disabled,
}: {
  sectionId: string;
  slotId: string;
  atIndex: number;
  depth: number;
  disabled: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `layer-element-insert-${sectionId}-${slotId}-${atIndex}`,
    data: { kind: "element-insert", sectionId, slotId, atIndex },
    disabled,
  });

  return (
    <div className="relative h-0" role="none">
      <div
        ref={setNodeRef}
        className="pointer-events-none absolute -top-1.5 right-1 z-10 h-3"
        style={{ left: 8 + depth * 12 }}
      >
        <div
          className={cn(
            "absolute inset-x-0 top-1/2 h-px -translate-y-1/2 rounded-full transition-colors",
            disabled
              ? "bg-transparent"
              : isOver
                ? "bg-[#0d99ff]"
                : "bg-transparent in-data-dragging:bg-zinc-200/70 dark:in-data-dragging:bg-zinc-700",
          )}
        />
      </div>
    </div>
  );
}

function SectionInsertDrop({ atIndex, disabled }: { atIndex: number; disabled: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `layer-section-gap-${atIndex}`,
    data: { kind: "section-gap", atIndex },
    disabled,
  });

  return (
    <div className="relative h-0" role="none">
      <div
        ref={setNodeRef}
        className="pointer-events-none absolute -top-1.5 inset-x-0 z-20 h-3 px-1"
      >
        <div
          className={cn(
            "absolute inset-x-1 top-1/2 h-px -translate-y-1/2 rounded-full transition-colors",
            disabled
              ? "bg-transparent"
              : isOver
                ? "bg-[#0d99ff]"
                : "bg-transparent in-data-dragging:bg-zinc-300/80 dark:in-data-dragging:bg-zinc-600",
          )}
        />
      </div>
    </div>
  );
}

function SlotDrop({
  sectionId,
  slotId,
  disabled,
  children,
}: {
  sectionId: string;
  slotId: string;
  disabled: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `layer-slot-${sectionId}-${slotId}`,
    data: { kind: "layer-slot", sectionId, slotId },
    disabled,
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

function ElementLayerList({
  section,
  slotId,
  items,
  depth,
  ancestors,
  instanceLocked,
  destinationEditable,
  activeKind,
}: {
  section: PageSection;
  slotId: string;
  items: PageElement[];
  depth: number;
  ancestors: PageElement[];
  instanceLocked: boolean;
  destinationEditable: boolean;
  activeKind: string | undefined;
}) {
  const gapsDisabled = !destinationEditable || !acceptsElementGap(activeKind);

  return (
    <SortableContext
      items={items.map((item) => `layer-el-${item.id}`)}
      strategy={verticalListSortingStrategy}
    >
      <ElementInsertDrop
        sectionId={section.id}
        slotId={slotId}
        atIndex={0}
        depth={depth}
        disabled={gapsDisabled}
      />
      {items.map((element, index) => (
        <Fragment key={element.id}>
          <LayerTree
            section={section}
            slotId={slotId}
            element={element}
            depth={depth}
            ancestors={ancestors}
            instanceLocked={instanceLocked}
            activeKind={activeKind}
          />
          <ElementInsertDrop
            sectionId={section.id}
            slotId={slotId}
            atIndex={index + 1}
            depth={depth}
            disabled={gapsDisabled}
          />
        </Fragment>
      ))}
    </SortableContext>
  );
}

function LayerTree({
  section,
  slotId,
  element,
  depth,
  ancestors,
  instanceLocked,
  activeKind,
}: {
  section: PageSection;
  slotId: string;
  element: PageElement;
  depth: number;
  ancestors: PageElement[];
  instanceLocked: boolean;
  activeKind: string | undefined;
}) {
  const { setSelection, toggleSelectElement, selectedRefs } = useEditor();
  const Icon = elementIcon(element.type);
  const active = selectedRefs.some((ref) => ref.elementId === element.id);
  const childSlot = frameSlotId(element.id);
  const kids = element.children ?? [];
  const isContainer = isContainerElement(element.type);
  const editable = !instanceLocked || isInstanceSlotEditable(section, element, ancestors);
  const label = element.type === "slot" ? String(element.props.name || "slot") : element.type;

  return (
    <div>
      <SortableLayer
        id={`layer-el-${element.id}`}
        data={{
          kind: "layer-element",
          sectionId: section.id,
          slotId,
          elementId: element.id,
          elementType: element.type,
        }}
        depth={depth}
        label={label}
        icon={Icon}
        active={active}
        muted={!editable}
        dragDisabled={!editable}
        onClick={() => {
          if (!editable) {
            setSelection({ kind: "section", sectionId: section.id });
            return;
          }
          toggleSelectElement({ sectionId: section.id, slotId, elementId: element.id }, false);
        }}
      />
      {isContainer ? (
        <SlotDrop sectionId={section.id} slotId={childSlot} disabled={!editable}>
          <div>
            <ElementLayerList
              section={section}
              slotId={childSlot}
              items={kids}
              depth={depth + 1}
              ancestors={[...ancestors, element]}
              instanceLocked={instanceLocked}
              destinationEditable={editable}
              activeKind={activeKind}
            />
          </div>
        </SlotDrop>
      ) : null}
    </div>
  );
}

function SectionLayers({ section, activeKind }: { section: PageSection; activeKind: string | undefined }) {
  const { selection, setSelection, editorMode } = useEditor();
  const { active: dragActive, over } = useDndContext();
  const [open, setOpen] = useState(true);
  const sortableId = `layer-section-${section.id}`;
  const contentId = `layer-section-children-${section.id}`;
  const activeId = dragActive?.id;
  const overId = over?.id;
  const instanceLocked = editorMode !== "component" && Boolean(section.componentId);
  const selected =
    (selection.kind === "section" && selection.sectionId === section.id) ||
    (selection.kind !== "page" &&
      selection.kind !== "elements" &&
      "sectionId" in selection &&
      selection.sectionId === section.id);
  const defs = slotDefs(section.type);
  const hideBodyLabel = section.type === "custom" && defs.length === 1 && defs[0]?.id === "body";
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    data: { kind: "layer-section", sectionId: section.id },
    disabled: { draggable: editorMode === "component", droppable: false },
  });

  useEffect(() => {
    if (open || activeId === undefined || overId !== sortableId) return;
    const timeout = window.setTimeout(() => setOpen(true), 450);
    return () => window.clearTimeout(timeout);
  }, [activeId, open, overId, sortableId]);

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
          aria-expanded={open}
          aria-controls={contentId}
          aria-label={`${open ? "Collapse" : "Expand"} ${section.name}`}
        >
          {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        </button>
        {editorMode === "page" ? (
          <button
            type="button"
            className="grid size-4 shrink-0 touch-none cursor-grab place-items-center text-zinc-400 hover:text-zinc-700 active:cursor-grabbing dark:hover:text-zinc-200"
            {...attributes}
            {...listeners}
            aria-label={`Drag ${section.name}`}
          >
            <GripVertical className="size-3" />
          </button>
        ) : (
          <span className="size-4 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => setSelection({ kind: "section", sectionId: section.id })}
          aria-pressed={selection.kind === "section" && selection.sectionId === section.id}
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
      {open ? (
        <div id={contentId}>
          {defs.map((slot) => {
            if (slot.kind === "text") {
              return (
                <button
                  key={slot.id}
                  type="button"
                  className="flex h-7 w-full items-center rounded-sm text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                  style={{ paddingLeft: 32 }}
                  onClick={() =>
                    setSelection(
                      instanceLocked
                        ? { kind: "section", sectionId: section.id }
                        : { kind: "slot", sectionId: section.id, slotId: slot.id },
                    )
                  }
                >
                  <Type className="mr-1.5 size-3.5 text-zinc-300" />
                  <span className="text-[12px] text-zinc-500 dark:text-zinc-400">{slot.label}</span>
                </button>
              );
            }
            const item = elementSlot(section, slot.id);
            const items = slot.kind === "elements" ? elementsSlot(section, slot.id) : item ? [item] : [];
            const sortable = slot.kind === "elements";
            const showSlotRow = !(hideBodyLabel && slot.id === "body");
            const depth = showSlotRow ? 3 : 2;
            return (
              <SlotDrop
                key={slot.id}
                sectionId={section.id}
                slotId={slot.id}
                disabled={instanceLocked}
              >
                {showSlotRow ? (
                  <button
                    type="button"
                    className="flex h-7 w-full items-center rounded-sm text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                    style={{ paddingLeft: 32 }}
                    onClick={() =>
                      setSelection(
                        instanceLocked
                          ? { kind: "section", sectionId: section.id }
                          : { kind: "slot", sectionId: section.id, slotId: slot.id },
                      )
                    }
                  >
                    <Frame className="mr-1.5 size-3.5 text-zinc-400" />
                    <span className="text-[12px] text-zinc-600 dark:text-zinc-400">{slot.label}</span>
                  </button>
                ) : null}
                <div>
                  {sortable ? (
                    <ElementLayerList
                      section={section}
                      slotId={slot.id}
                      items={items}
                      depth={depth}
                      ancestors={[]}
                      instanceLocked={instanceLocked}
                      destinationEditable={!instanceLocked}
                      activeKind={activeKind}
                    />
                  ) : (
                    <SortableContext
                      items={items.map((element) => `layer-el-${element.id}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      {items.map((element) => (
                        <LayerTree
                          key={element.id}
                          section={section}
                          slotId={slot.id}
                          element={element}
                          depth={depth}
                          ancestors={[]}
                          instanceLocked={instanceLocked}
                          activeKind={activeKind}
                        />
                      ))}
                    </SortableContext>
                  )}
                </div>
              </SlotDrop>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function LayersPanel() {
  const { page, setSelection, editorMode } = useEditor();
  const { active } = useDndContext();
  const activeKind = (active?.data.current as { kind?: string } | undefined)?.kind;
  const sectionGapsDisabled = editorMode === "component" || !acceptsSectionGap(activeKind);

  return (
    <ScrollArea className="h-full">
      <div className="p-2">
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
        <div role="region" aria-label="Page layers" className={cn(editorMode === "page" && "mt-0.5")}>
          <SortableContext
            items={page.sections.map((section) => `layer-section-${section.id}`)}
            strategy={verticalListSortingStrategy}
          >
            <SectionInsertDrop atIndex={0} disabled={sectionGapsDisabled} />
            {page.sections.map((section, index) => (
              <Fragment key={section.id}>
                <SectionLayers section={section} activeKind={activeKind} />
                <SectionInsertDrop atIndex={index + 1} disabled={sectionGapsDisabled} />
              </Fragment>
            ))}
          </SortableContext>
        </div>
      </div>
    </ScrollArea>
  );
}
