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
  GitBranch,
  LockKeyhole,
  Type,
} from "lucide-react";
import { Fragment, useEffect, useState, type ReactNode, type MouseEvent, type KeyboardEvent } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEditor } from "@/components/editor/editor-context";
import { LayerEditorContextMenu, type ContextTarget } from "@/components/editor/editor-context-menu";
import {
  conditionalBranch,
  elementContains,
  elementsSlot,
  elementSlot,
  frameSlotId,
  getElementStructureIssue,
  isContainerElement,
  isInstanceSlotEditable,
  isSlotEditableInInstance,
  parseFrameSlotId,
  slotDefs,
} from "@/lib/slots";
import type { PageElement, PageSection, Selection } from "@/lib/types";
import { cn } from "@/lib/utils";

function elementIcon(type: PageElement["type"]) {
  if (type === "conditional") return GitBranch;
  if (type === "heading" || type === "paragraph") return Type;
  if (type === "frame" || type === "slot" || type === "list") return Frame;
  return Box;
}

type SingleSelection = Exclude<Selection, { kind: "elements" }>;

function rowToken(value: string) {
  return encodeURIComponent(value);
}

function pageLayerRowId() {
  return "layer-row-page";
}

function sectionLayerRowId(sectionId: string) {
  return `layer-row-section-${rowToken(sectionId)}`;
}

function slotLayerRowId(sectionId: string, slotId: string) {
  return `layer-row-slot-${rowToken(sectionId)}-${rowToken(slotId)}`;
}

function elementLayerRowId(elementId: string) {
  return `layer-row-element-${rowToken(elementId)}`;
}

function primaryRevealTarget(target: Selection): SingleSelection {
  if (target.kind !== "elements") return target;
  const item = target.items.at(-1);
  return item ? { kind: "element", ...item } : { kind: "page" };
}

function targetSectionId(target: Selection) {
  const primary = primaryRevealTarget(target);
  return primary.kind === "page" ? null : primary.sectionId;
}

function revealRowId(target: Selection) {
  const primary = primaryRevealTarget(target);
  if (primary.kind === "page") return pageLayerRowId();
  if (primary.kind === "section") return sectionLayerRowId(primary.sectionId);
  if (primary.kind === "slot") {
    const parentId = parseFrameSlotId(primary.slotId);
    return parentId ? elementLayerRowId(parentId) : slotLayerRowId(primary.sectionId, primary.slotId);
  }
  return elementLayerRowId(primary.elementId);
}

function targetsSectionChild(target: Selection, sectionId: string) {
  if (target.kind === "element" || target.kind === "slot") return target.sectionId === sectionId;
  if (target.kind === "elements") return target.items.some((item) => item.sectionId === sectionId);
  return false;
}

function targetElementIds(target: Selection, sectionId: string) {
  if (target.kind === "element") return target.sectionId === sectionId ? [target.elementId] : [];
  if (target.kind === "elements") {
    return target.items.filter((item) => item.sectionId === sectionId).map((item) => item.elementId);
  }
  if (target.kind === "slot" && target.sectionId === sectionId) {
    const parentId = parseFrameSlotId(target.slotId);
    return parentId ? [parentId] : [];
  }
  return [];
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
  dropDisabled,
  rowId,
  expanded,
  contentId,
  onToggle,
  target,
  branch,
  parentRowId,
}: {
  id: string;
  data: Record<string, unknown>;
  depth: number;
  label: string;
  active?: boolean;
  muted?: boolean;
  icon: typeof Frame;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  dragDisabled?: boolean;
  dropDisabled?: boolean;
  rowId: string;
  expanded?: boolean;
  contentId?: string;
  onToggle?: () => void;
  target: ContextTarget;
  branch?: "then" | "else" | null;
  parentRowId: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data,
    disabled: { draggable: Boolean(dragDisabled), droppable: Boolean(dropDisabled) },
  });
  return (
    <LayerEditorContextMenu target={target}>
    <div
      data-layer-row
      ref={setNodeRef}
      style={{
        transform: isDragging ? undefined : CSS.Transform.toString(transform),
        transition: isDragging ? undefined : transition,
        paddingLeft: 8 + depth * 14,
      }}
      className={cn("group flex h-7 items-center gap-0.5 rounded-sm", active && "bg-sky-500/15", isDragging && "z-20 opacity-40")}
    >
      {typeof expanded === "boolean" && onToggle ? (
        <button
          type="button"
          className="grid size-4 shrink-0 place-items-center rounded-sm text-zinc-400 hover:text-zinc-700 focus-visible:outline-2 focus-visible:outline-sky-500 dark:hover:text-zinc-200"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={contentId}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${label}`}
        >
          {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        </button>
      ) : (
        <span className="size-4 shrink-0" />
      )}
      {!dragDisabled ? (
        <button
          type="button"
          className="grid size-5 shrink-0 touch-none cursor-grab place-items-center rounded-sm text-zinc-400 hover:text-zinc-700 focus-visible:outline-2 focus-visible:outline-sky-500 active:cursor-grabbing dark:hover:text-zinc-200"
          {...attributes}
          {...listeners}
          aria-label={`Move ${label}`}
          title={`Move ${label} (Space to pick up, arrows to move)`}
        >
          <Icon aria-hidden="true" className="size-3.5" />
        </button>
      ) : (
        <span className="grid size-5 shrink-0 place-items-center text-zinc-400"><Icon aria-hidden="true" className="size-3.5" /></span>
      )}
      <button
        id={rowId}
        data-layer-select
        data-layer-parent={parentRowId}
        data-layer-depth={depth}
        type="button"
        onClick={onClick}
        aria-pressed={active}
        aria-label={`${label}, ${branch ? `${branch} branch` : target.kind === "element" ? target.element.type : "layer"}${muted ? ", locked component layer" : ""}`}
        aria-keyshortcuts="Shift+F10"
        title={`${label}${muted ? " · Locked component layer" : ""} · Right-click for actions`}
        className={cn(
          "flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-sm px-1 text-left text-[12px] leading-none focus-visible:outline-2 focus-visible:outline-sky-500",
          active
            ? "font-medium text-zinc-900 dark:text-zinc-50"
            : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
          muted && "text-zinc-400 dark:text-zinc-500",
        )}
      >
        <span className="truncate">{label}</span>
        {branch ? <span className="ml-auto rounded bg-amber-500/10 px-1 py-0.5 text-[9px] font-medium uppercase text-amber-700 dark:text-amber-300" aria-hidden="true">{branch}</span> : null}
        {muted ? <LockKeyhole className="ml-auto size-3 shrink-0 text-zinc-400" aria-hidden="true" /> : null}
      </button>
    </div>
    </LayerEditorContextMenu>
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
  const { setNodeRef } = useDroppable({
    id: `layer-element-insert-${sectionId}-${slotId}-${atIndex}`,
    data: { kind: "element-insert", sectionId, slotId, atIndex },
    disabled,
  });

  return (
    <div className="relative h-0" role="none">
      <div
        ref={setNodeRef}
        className="pointer-events-none absolute -top-1.5 right-1 z-10 h-3"
        style={{ left: 8 + depth * 14 }}
      >
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-transparent" />
      </div>
    </div>
  );
}

function SectionInsertDrop({ atIndex, disabled }: { atIndex: number; disabled: boolean }) {
  const { setNodeRef } = useDroppable({
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
        <div className="absolute inset-x-1 top-1/2 h-px -translate-y-1/2 bg-transparent" />
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
  const { setNodeRef } = useDroppable({
    id: `layer-slot-${sectionId}-${slotId}`,
    data: { kind: "layer-slot", sectionId, slotId },
    disabled,
  });
  return (
    <div ref={setNodeRef} className="rounded-sm">
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
  const { setSelection, toggleSelectElement, selectedRefs, layerRevealRequest, editorMode } = useEditor();
  const { active: dragActive, over } = useDndContext();
  const [open, setOpen] = useState(true);
  const [dismissedRevealId, setDismissedRevealId] = useState<number | null>(null);
  const Icon = elementIcon(element.type);
  const active = selectedRefs.some(
    (ref) => ref.sectionId === section.id && ref.elementId === element.id,
  );
  const sortableId = `layer-el-${element.id}`;
  const childSlot = frameSlotId(element.id);
  const contentId = `layer-element-children-${rowToken(element.id)}`;
  const kids = element.children ?? [];
  const isContainer = isContainerElement(element.type);
  const editable = !instanceLocked || isInstanceSlotEditable(section, element, ancestors);
  const customLabel = typeof element.props.label === "string" ? element.props.label.trim() : "";
  const contentLabel = typeof element.props.text === "string" ? element.props.text.replace(/<[^>]*>/g, "").trim() : "";
  const label = element.type === "slot" ? String(element.props.name || "Slot")
    : customLabel || contentLabel || (element.type === "conditional" ? "IF" : element.type[0].toUpperCase() + element.type.slice(1));
  const branch = conditionalBranch(element, ancestors.at(-1));
  const structureIssue = getElementStructureIssue(section, element.id, { allowComponentRoot: editorMode === "component" });
  const childEditable = (!instanceLocked || isSlotEditableInInstance(section, childSlot)) && element.type !== "conditional";
  const parentRowId = ancestors.length ? elementLayerRowId(ancestors[ancestors.length - 1].id)
    : section.type === "custom" ? sectionLayerRowId(section.id) : slotLayerRowId(section.id, slotId);
  const revealIds = layerRevealRequest
    ? targetElementIds(layerRevealRequest.target, section.id)
    : [];
  const revealsDescendant = revealIds.some(
    (elementId) => elementId !== element.id && elementContains(element, elementId),
  );
  const revealExpanded = Boolean(
    isContainer &&
      layerRevealRequest &&
      layerRevealRequest.id !== dismissedRevealId &&
      revealsDescendant,
  );
  const expanded = open || revealExpanded;

  useEffect(() => {
    if (!isContainer || expanded || !dragActive || over?.id !== sortableId) return;
    const timeout = window.setTimeout(() => setOpen(true), 450);
    return () => window.clearTimeout(timeout);
  }, [dragActive, expanded, isContainer, over?.id, sortableId]);

  return (
    <div>
      <SortableLayer
        id={sortableId}
        rowId={elementLayerRowId(element.id)}
        data={{
          kind: "layer-element",
          sectionId: section.id,
          slotId,
          elementId: element.id,
          elementType: element.type,
        }}
        depth={depth}
        label={label}
        target={{ kind: "element", sectionId: section.id, slotId, element }}
        branch={branch}
        parentRowId={parentRowId}
        icon={Icon}
        active={active}
        muted={!editable}
        dragDisabled={Boolean(structureIssue)}
        dropDisabled={isContainer ? !childEditable : Boolean(structureIssue)}
        expanded={isContainer ? expanded : undefined}
        contentId={isContainer ? contentId : undefined}
        onToggle={
          isContainer
            ? () => {
                setOpen(!expanded);
                if (revealExpanded && layerRevealRequest) setDismissedRevealId(layerRevealRequest.id);
              }
            : undefined
        }
        onClick={(event) => {
          if (!editable) {
            setSelection({ kind: "section", sectionId: section.id });
            return;
          }
          toggleSelectElement({ sectionId: section.id, slotId, elementId: element.id }, event.shiftKey || event.ctrlKey || event.metaKey);
        }}
      />
      {isContainer && expanded ? (
        <SlotDrop sectionId={section.id} slotId={childSlot} disabled={!childEditable}>
          <div id={contentId} role="group" aria-label={`${label} children`} className="relative">
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 border-l border-zinc-200 dark:border-zinc-800" style={{ left: 16 + depth * 14 }} />
            {!kids.length ? <div className="flex h-6 items-center text-[11px] text-zinc-400" style={{ paddingLeft: 30 + (depth + 1) * 14 }}>Empty</div> : null}
            <ElementLayerList
              section={section}
              slotId={childSlot}
              items={kids}
              depth={depth + 1}
              ancestors={[...ancestors, element]}
              instanceLocked={instanceLocked}
              destinationEditable={childEditable}
              activeKind={activeKind}
            />
          </div>
        </SlotDrop>
      ) : null}
    </div>
  );
}

function SectionLayers({ section, activeKind }: { section: PageSection; activeKind: string | undefined }) {
  const { selection, setSelection, editorMode, layerRevealRequest } = useEditor();
  const { active: dragActive, over } = useDndContext();
  const [open, setOpen] = useState(true);
  const [dismissedRevealId, setDismissedRevealId] = useState<number | null>(null);
  const sortableId = `layer-section-${section.id}`;
  const contentId = `layer-section-children-${section.id}`;
  const activeId = dragActive?.id;
  const overId = over?.id;
  const instanceLocked = editorMode !== "component" && Boolean(section.componentId);
  const selected =
    selection.kind === "elements"
      ? selection.items.some((item) => item.sectionId === section.id)
      : selection.kind !== "page" && selection.sectionId === section.id;
  const revealExpanded = Boolean(
    layerRevealRequest &&
      layerRevealRequest.id !== dismissedRevealId &&
      targetsSectionChild(layerRevealRequest.target, section.id),
  );
  const expanded = open || revealExpanded;
  const defs = slotDefs(section.type);
  const hideBodyLabel = section.type === "custom" && defs.length === 1 && defs[0]?.id === "body";
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    data: { kind: "layer-section", sectionId: section.id },
    disabled: { draggable: editorMode === "component", droppable: false },
  });

  useEffect(() => {
    if (expanded || activeId === undefined || overId !== sortableId) return;
    const timeout = window.setTimeout(() => setOpen(true), 450);
    return () => window.clearTimeout(timeout);
  }, [activeId, expanded, overId, sortableId]);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: isDragging ? undefined : CSS.Transform.toString(transform),
        transition: isDragging ? undefined : transition,
      }}
      className={cn(isDragging && "z-20 opacity-50")}
    >
      <LayerEditorContextMenu target={{ kind: "section", section }}>
      <div data-layer-row className="flex h-7 items-center gap-0.5 pl-2">
        <button
          type="button"
          className="grid size-4 shrink-0 place-items-center rounded-sm text-zinc-400 focus-visible:outline-2 focus-visible:outline-sky-500"
          onClick={() => {
            setOpen(!expanded);
            if (revealExpanded && layerRevealRequest) setDismissedRevealId(layerRevealRequest.id);
          }}
          aria-expanded={expanded}
          aria-controls={contentId}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${section.name}`}
        >
          {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        </button>
        {editorMode === "page" ? (
          <button
            type="button"
            className="grid size-5 shrink-0 touch-none cursor-grab place-items-center rounded-sm text-zinc-400 hover:text-zinc-700 focus-visible:outline-2 focus-visible:outline-sky-500 active:cursor-grabbing dark:hover:text-zinc-200"
            {...attributes}
            {...listeners}
            aria-label={`Move ${section.name}`}
            title={`Move ${section.name} (Space to pick up, arrows to move)`}
          >
            {section.componentId ? <Component aria-hidden="true" className="size-3.5 text-violet-500" /> : <Frame aria-hidden="true" className="size-3.5" />}
          </button>
        ) : (
          <span className="grid size-5 shrink-0 place-items-center text-zinc-400"><Frame aria-hidden="true" className="size-3.5" /></span>
        )}
        <button
          id={sectionLayerRowId(section.id)}
          data-layer-select
          data-layer-depth={0}
          data-layer-parent={editorMode === "page" ? pageLayerRowId() : undefined}
          aria-label={`${section.name}, ${section.componentId ? "component" : "section"}`}
          aria-keyshortcuts="Shift+F10"
          title={`${section.name} · Right-click for actions`}
          type="button"
          onClick={() => setSelection({ kind: "section", sectionId: section.id })}
          aria-pressed={selection.kind === "section" && selection.sectionId === section.id}
          className={cn(
            "flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-sm px-1 text-left text-[12px] font-medium focus-visible:outline-2 focus-visible:outline-sky-500",
            selection.kind === "section" && selection.sectionId === section.id
              ? "bg-[#0d99ff]/15 text-zinc-900 dark:text-zinc-50"
              : selected
                ? "text-zinc-900 dark:text-zinc-100"
                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
          )}
        >
          <span className="truncate">{section.name}</span>
        </button>
      </div>
      </LayerEditorContextMenu>
      {expanded ? (
        <div id={contentId} role="group" aria-label={`${section.name} layers`} className="relative">
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-4 border-l border-zinc-200 dark:border-zinc-800" />
          {defs.map((slot) => {
            const slotActive =
              selection.kind === "slot" &&
              selection.sectionId === section.id &&
              selection.slotId === slot.id;
            if (slot.kind === "text") {
              return (
                <button
                  id={slotLayerRowId(section.id, slot.id)}
                  data-layer-select
                  data-layer-depth={1}
                  data-layer-parent={sectionLayerRowId(section.id)}
                  aria-label={`${slot.label}, text slot${instanceLocked ? ", locked" : ""}`}
                  key={slot.id}
                  type="button"
                  aria-pressed={slotActive}
                  className={cn(
                    "flex h-7 w-full items-center rounded-sm text-left focus-visible:outline-2 focus-visible:outline-sky-500",
                    slotActive
                      ? "bg-[#0d99ff]/15 text-zinc-900 dark:text-zinc-50"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60",
                  )}
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
                  <span
                    className={cn(
                      "text-[12px]",
                      slotActive ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-500 dark:text-zinc-400",
                    )}
                  >
                    {slot.label}
                  </span>
                </button>
              );
            }
            const item = elementSlot(section, slot.id);
            const items = slot.kind === "elements" ? elementsSlot(section, slot.id) : item ? [item] : [];
            const sortable = slot.kind === "elements";
            const showSlotRow = slotActive || !(hideBodyLabel && slot.id === "body");
            const depth = showSlotRow ? 2 : 1;
            return (
              <SlotDrop
                key={slot.id}
                sectionId={section.id}
                slotId={slot.id}
                disabled={instanceLocked}
              >
                {showSlotRow ? (
                  <button
                    id={slotLayerRowId(section.id, slot.id)}
                    data-layer-select
                    data-layer-depth={1}
                    data-layer-parent={sectionLayerRowId(section.id)}
                    aria-label={`${slot.label}, slot${instanceLocked ? ", locked" : ""}`}
                    type="button"
                    aria-pressed={slotActive}
                    className={cn(
                      "flex h-7 w-full items-center rounded-sm text-left focus-visible:outline-2 focus-visible:outline-sky-500",
                      slotActive
                        ? "bg-[#0d99ff]/15 text-zinc-900 dark:text-zinc-50"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60",
                    )}
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
                    <span
                      className={cn(
                        "text-[12px]",
                        slotActive ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-600 dark:text-zinc-400",
                      )}
                    >
                      {slot.label}
                    </span>
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

function navigateLayers(event: KeyboardEvent<HTMLDivElement>) {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const current = event.target;
  if (!(current instanceof HTMLButtonElement) || !current.hasAttribute("data-layer-select")) return;
  const rows = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-layer-select]"));
  const index = rows.indexOf(current);
  const disclosure = current.closest("[data-layer-row]")?.querySelector<HTMLButtonElement>("button[aria-expanded]");
  let next: HTMLButtonElement | undefined;
  switch (event.key) {
    case "ArrowDown": next = rows[index + 1]; break;
    case "ArrowUp": next = rows[index - 1]; break;
    case "Home": next = rows[0]; break;
    case "End": next = rows.at(-1); break;
    case "ArrowRight":
      if (disclosure?.getAttribute("aria-expanded") === "false") disclosure.click();
      else if (Number(rows[index + 1]?.dataset.layerDepth) > Number(current.dataset.layerDepth)) next = rows[index + 1];
      break;
    case "ArrowLeft":
      if (disclosure?.getAttribute("aria-expanded") === "true") disclosure.click();
      else next = rows.find((row) => row.id === current.dataset.layerParent);
      break;
    default: return;
  }
  event.preventDefault();
  event.stopPropagation();
  next?.focus();
}

export function LayersPanel() {
  const { page, selection, setSelection, editorMode, layerRevealRequest } = useEditor();
  const { active } = useDndContext();
  const activeKind = (active?.data.current as { kind?: string } | undefined)?.kind;
  const sectionGapsDisabled = editorMode === "component" || !acceptsSectionGap(activeKind);

  useEffect(() => {
    if (!layerRevealRequest) return;

    let secondFrame: number | undefined;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const requestedRow = document.getElementById(revealRowId(layerRevealRequest.target));
        const sectionId = targetSectionId(layerRevealRequest.target);
        const row = requestedRow ?? (sectionId ? document.getElementById(sectionLayerRowId(sectionId)) : null);
        if (!row) return;

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        row.scrollIntoView({
          block: "nearest",
          inline: "nearest",
          behavior: reducedMotion ? "auto" : "smooth",
        });
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame !== undefined) window.cancelAnimationFrame(secondFrame);
    };
  }, [layerRevealRequest]);

  return (
    <ScrollArea className="h-full">
      <div className="p-2" onKeyDown={(event) => { if (!active) navigateLayers(event); }}>
        <p className="sr-only" id="layer-keyboard-help">Use arrow keys to navigate layers and expand or collapse groups. Enter selects. Shift-click adds a sibling to the selection. Shift+F10 opens layer actions.</p>
        {editorMode === "page" ? (
          <button
            id={pageLayerRowId()}
            data-layer-select
            data-layer-depth={-1}
            aria-label={`${page.name || "Page"}, page`}
            type="button"
            onClick={() => setSelection({ kind: "page" })}
            aria-pressed={selection.kind === "page"}
            className={cn(
              "flex h-7 w-full items-center gap-1.5 rounded-sm px-2 text-left text-[12px] focus-visible:outline-2 focus-visible:outline-sky-500",
              selection.kind === "page"
                ? "bg-[#0d99ff]/15 text-zinc-900 dark:text-zinc-50"
                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
            )}
          >
            <Frame className="size-3.5 text-zinc-400" />
            {page.name || "Page"}
          </button>
        ) : null}
        <div role="region" aria-label="Page layers" aria-describedby="layer-keyboard-help" className={cn(editorMode === "page" && "mt-0.5")}>
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
