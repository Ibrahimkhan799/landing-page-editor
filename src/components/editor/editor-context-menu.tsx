"use client";

import type { ReactNode, MouseEvent as ReactMouseEvent, KeyboardEvent } from "react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useEditor } from "@/components/editor/editor-context";
import { createBlankBlockSection } from "@/lib/defaults";
import { findElement, getElementPlacementIssue, getElementStructureIssue, isBuiltInSectionType, isContainerElement, isElementEditableInInstance } from "@/lib/slots";
import { getEnclosureIssue, type EnclosureType } from "@/lib/tree-operations";
import type { PageElement, PageSection, Selection } from "@/lib/types";
import { nanoid } from "nanoid";

export type ContextTarget =
  | { kind: "section"; section: PageSection }
  | { kind: "element"; sectionId: string; slotId: string; element: PageElement };

function resolveTargetFromEvent(
  event: ReactMouseEvent | MouseEvent,
  page: { sections: PageSection[] },
): ContextTarget | null {
  const node = event.target as HTMLElement | null;
  if (!node?.closest) return null;

  const elementOverlay = node.closest('[data-editor-overlay="element"]') as HTMLElement | null;
  if (elementOverlay) {
    const sectionId = elementOverlay.dataset.sectionId;
    const elementId = elementOverlay.dataset.elementId;
    if (sectionId && elementId) {
      const section = page.sections.find((s) => s.id === sectionId);
      if (section) {
        const found = findElement(section, elementId);
        if (found) {
          return {
            kind: "element",
            sectionId,
            slotId: elementOverlay.dataset.slotId || found.slotId,
            element: found.element,
          };
        }
      }
    }
  }

  const sectionOverlay = node.closest('[data-editor-overlay="section"]') as HTMLElement | null;
  if (sectionOverlay) {
    const sectionId = sectionOverlay.dataset.sectionId;
    const section = page.sections.find((s) => s.id === sectionId);
    if (section) return { kind: "section", section };
  }

  return null;
}

function EditorContextMenuContent({
  target,
  pageId,
  onCloseAutoFocus,
}: {
  target: ContextTarget | null;
  pageId?: string | null;
  onCloseAutoFocus?: (event: Event) => void;
}) {
  const {
    page,
    editorMode,
    selection,
    selectedRefs,
    duplicateSection,
    removeSection,
    duplicateElement,
    removeElement,
    updateSection,
    updateElement,
    updateElementProp,
    encloseSelection,
  } = useEditor();
  const router = useRouter();

  async function saveSectionAsComponent(section: PageSection) {
    const name = window.prompt("Name this component", section.name);
    if (!name) return;
    const response = await fetch("/api/components", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, section: { ...section, componentId: undefined } }),
    });
    if (!response.ok) {
      toast.error("Could not save component");
      return;
    }
    const saved = await response.json();
    updateSection(section.id, { componentId: saved.id });
    toast.success("Component created");
  }

  async function saveElementAsComponent(sectionId: string, element: PageElement) {
    const name = window.prompt("Name this component", element.type);
    if (!name) return;
    const block = createBlankBlockSection({
      name,
      element: { ...element, id: nanoid(10) },
    });
    const section = { ...block, id: undefined };
    const response = await fetch("/api/components", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, section }),
    });
    if (!response.ok) {
      toast.error("Could not save component");
      return;
    }
    const saved = await response.json();
    const host = page.sections.find((item) => item.id === sectionId);
    if (host && host.type === "custom" && (host.slots?.body as PageElement[] | undefined)?.length === 1) {
      updateSection(sectionId, { componentId: saved.id, name });
    }
    toast.success("Component created", {
      action: {
        label: "Edit",
        onClick: () => {
          const from = pageId || page.id;
          const href = `/admin/component/${saved.id}?from=${encodeURIComponent(from)}`;
          router.prefetch(href);
          router.push(href);
        },
      },
    });
  }

  function createTextSlot(sectionId: string, element: PageElement) {
    const prop =
      typeof element.props.label === "string"
        ? "label"
        : typeof element.props.text === "string"
          ? "text"
          : typeof element.props.title === "string"
            ? "title"
            : null;
    if (!prop) {
      toast.message("This element has no text property to slot");
      return;
    }
    const label = window.prompt("Slot name", element.textSlot?.label || prop) || prop;
    updateElement(sectionId, element.id, {
      textSlot: { id: element.textSlot?.id || nanoid(8), label, prop },
    });
    toast.success(`Text slot “${label}” created`);
  }

  function clearTextSlot(sectionId: string, element: PageElement) {
    updateElement(sectionId, element.id, { textSlot: null });
    toast.message("Text slot removed");
  }

  function openComponent(componentId: string) {
    const from = pageId || (editorMode === "page" ? page.id : null);
    const q = from ? `?from=${encodeURIComponent(from)}` : "";
    const href = `/admin/component/${componentId}${q}`;
    router.prefetch(href);
    router.push(href);
  }

  // Resolve the live node by ID; a menu may outlive the render that opened it.
  const host = target && page.sections.find((section) => section.id === (target.kind === "section" ? target.section.id : target.sectionId));
  const found = target?.kind === "element" && host ? findElement(host, target.element.id) : null;
  const active: ContextTarget | null = target?.kind === "section" && host
    ? { kind: "section", section: host }
    : target?.kind === "element" && found
      ? { ...target, slotId: found.slotId, element: found.element }
      : null;
  const options = { allowComponentRoot: editorMode === "component" };
  const structureIssue = active?.kind === "element" && host
    ? getElementStructureIssue(host, active.element.id, options)
    : null;
  const editable = active?.kind === "element" && host &&
    (editorMode === "component" || isElementEditableInInstance(host, active.element.id));
  const canDuplicate = active?.kind === "element" && host && !structureIssue &&
    !getElementPlacementIssue(host, active.slotId, { ...active.element, id: "" }, options);
  const enclosureTarget: Selection = active?.kind === "element"
    ? selectedRefs.some((ref) => ref.sectionId === active.sectionId && ref.elementId === active.element.id)
      ? selection
      : { kind: "element", sectionId: active.sectionId, slotId: active.slotId, elementId: active.element.id }
    : { kind: "page" };
  const enclosureRefs = enclosureTarget.kind === "element" ? [enclosureTarget]
    : enclosureTarget.kind === "elements" ? enclosureTarget.items : [];

  function enclose(type: EnclosureType) {
    if (!encloseSelection(type, enclosureTarget)) toast.error("These layers cannot be enclosed here");
  }

  function rename() {
    if (!active) return;
    if (active.kind === "section") {
      const name = window.prompt("Rename section", active.section.name)?.trim();
      if (name) updateSection(active.section.id, { name });
    } else if (editable && isContainerElement(active.element.type)) {
      const key = active.element.type === "slot" ? "name" : "label";
      const name = window.prompt("Rename layer", String(active.element.props[key] || active.element.type))?.trim();
      if (name) updateElementProp(active.sectionId, active.element.id, key, name);
    }
  }

  return (
      <ContextMenuContent className="editor-ui min-w-[12rem]" onCloseAutoFocus={onCloseAutoFocus}>
        {!active ? (
          <ContextMenuItem disabled>Select a layer first</ContextMenuItem>
        ) : active.kind === "section" ? (
          <>
            <ContextMenuLabel>Section · {active.section.name}</ContextMenuLabel>
            <ContextMenuItem onSelect={rename}>Rename…</ContextMenuItem>
            {active.section.componentId ? (
              <ContextMenuItem onSelect={() => openComponent(active.section.componentId!)}>
                Edit component
              </ContextMenuItem>
            ) : null}
            {!isBuiltInSectionType(active.section.type) && !active.section.componentId ? (
              <ContextMenuItem onSelect={() => void saveSectionAsComponent(active.section)}>
                Save as component
              </ContextMenuItem>
            ) : null}
            {isBuiltInSectionType(active.section.type) && !active.section.componentId ? (
              <ContextMenuItem disabled>Built-in section</ContextMenuItem>
            ) : null}
            {editorMode === "page" ? (
              <>
                <ContextMenuItem onSelect={() => duplicateSection(active.section.id)}>Duplicate</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  className="text-red-600 focus:text-red-700"
                  onSelect={() => removeSection(active.section.id)}
                >
                  Delete
                </ContextMenuItem>
              </>
            ) : null}
          </>
        ) : (
          <>
            <ContextMenuLabel>{active.element.type === "conditional" ? "IF" : active.element.type}</ContextMenuLabel>
            {isContainerElement(active.element.type) ? (
              <ContextMenuItem disabled={!editable} onSelect={rename}>Rename…</ContextMenuItem>
            ) : null}
            <ContextMenuItem disabled={Boolean(structureIssue)} onSelect={() => void saveElementAsComponent(active.sectionId, active.element)}>
              Create component
            </ContextMenuItem>
            {(typeof active.element.props.text === "string" ||
              typeof active.element.props.label === "string" ||
              typeof active.element.props.title === "string") && (
              <ContextMenuItem disabled={!editable || (editorMode === "page" && Boolean(host?.componentId))} onSelect={() => createTextSlot(active.sectionId, active.element)}>
                {active.element.textSlot ? "Edit text slot…" : "Create text slot…"}
              </ContextMenuItem>
            )}
            {active.element.textSlot ? (
              <ContextMenuItem disabled={!editable || (editorMode === "page" && Boolean(host?.componentId))} onSelect={() => clearTextSlot(active.sectionId, active.element)}>
                Remove text slot
              </ContextMenuItem>
            ) : null}
            <ContextMenuSeparator />
            <ContextMenuItem disabled={Boolean(getEnclosureIssue(page, enclosureRefs, "frame", options))} onSelect={() => enclose("frame")}>
              Enclose in Frame
            </ContextMenuItem>
            <ContextMenuItem disabled={Boolean(getEnclosureIssue(page, enclosureRefs, "conditional", options))} onSelect={() => enclose("conditional")}>
              Enclose in IF
            </ContextMenuItem>
            {structureIssue === "branch-scaffold" ? (
              <ContextMenuItem disabled>IF branch · edit its contents</ContextMenuItem>
            ) : structureIssue === "locked" ? (
              <ContextMenuItem disabled>Component structure is locked</ContextMenuItem>
            ) : null}
            <ContextMenuSeparator />
            <ContextMenuItem disabled={!canDuplicate} onSelect={() => duplicateElement(active.sectionId, active.element.id)}>
              Duplicate
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="text-red-600 focus:text-red-700"
              disabled={Boolean(structureIssue)}
              onSelect={() => removeElement(active.sectionId, active.element.id)}
            >
              Delete
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
  );
}

function openKeyboardMenu(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return;
  event.preventDefault();
  event.stopPropagation();
  const node = event.target instanceof HTMLElement ? event.target : event.currentTarget;
  const rect = node.getBoundingClientRect();
  node.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: rect.left + 16, clientY: rect.bottom }));
}

/** The explicit row target is independent of whichever canvas element is selected. */
export function LayerEditorContextMenu({ target, children }: { target: ContextTarget; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLDivElement>(null);
  return (
    <ContextMenu onOpenChange={setOpen}>
      <ContextMenuTrigger asChild onKeyDown={openKeyboardMenu} onContextMenu={(event) => event.stopPropagation()}>
        <div ref={trigger}>{children}</div>
      </ContextMenuTrigger>
      {open ? <EditorContextMenuContent target={target} onCloseAutoFocus={(event) => {
        event.preventDefault();
        trigger.current?.querySelector<HTMLButtonElement>("[data-layer-select]")?.focus();
      }} /> : null}
    </ContextMenu>
  );
}

export function CanvasEditorContextMenu({ children, pageId }: { children: ReactNode; pageId?: string | null }) {
  const { page } = useEditor();
  const [target, setTarget] = useState<ContextTarget | null>(null);
  return (
    <ContextMenu onOpenChange={(open) => { if (!open) setTarget(null); }}>
      <ContextMenuTrigger asChild>
        <div className="min-h-full" onKeyDown={openKeyboardMenu} onContextMenu={(event) => setTarget(resolveTargetFromEvent(event, page))}>
          {children}
        </div>
      </ContextMenuTrigger>
      <EditorContextMenuContent target={target} pageId={pageId} />
    </ContextMenu>
  );
}
