"use client";

import type { ReactNode, MouseEvent as ReactMouseEvent } from "react";
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
import { findElement, isBuiltInSectionType, isContainerElement } from "@/lib/slots";
import type { PageElement, PageSection } from "@/lib/types";
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

export function CanvasEditorContextMenu({
  children,
  pageId,
}: {
  children: ReactNode;
  pageId?: string | null;
}) {
  const {
    page,
    editorMode,
    selection,
    selectedElement,
    selectedSection,
    duplicateSection,
    removeSection,
    duplicateElement,
    removeElement,
    updateSection,
    updateElement,
  } = useEditor();
  const router = useRouter();
  const [target, setTarget] = useState<ContextTarget | null>(null);
  const targetRef = useRef<ContextTarget | null>(null);

  function targetFromSelection(): ContextTarget | null {
    if (selection.kind === "element" && selectedElement && selectedSection) {
      return {
        kind: "element",
        sectionId: selection.sectionId,
        slotId: selection.slotId,
        element: selectedElement,
      };
    }
    if (selection.kind === "section" && selectedSection) {
      return { kind: "section", section: selectedSection };
    }
    return null;
  }

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
    const { id: _id, ...section } = block;
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
          router.push(`/admin/component/${saved.id}?from=${encodeURIComponent(from)}`);
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
    router.push(`/admin/component/${componentId}${q}`);
  }

  const active = target ?? targetRef.current;

  return (
    <ContextMenu
      onOpenChange={(open) => {
        if (!open) {
          targetRef.current = null;
          setTarget(null);
        }
      }}
    >
      <ContextMenuTrigger asChild>
        <div
          className="min-h-full"
          onContextMenu={(event) => {
            const resolved = resolveTargetFromEvent(event, page) || targetFromSelection();
            targetRef.current = resolved;
            setTarget(resolved);
          }}
        >
          {children}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="editor-ui min-w-[12rem]">
        {!active ? (
          <ContextMenuItem disabled>Select a layer first</ContextMenuItem>
        ) : active.kind === "section" ? (
          <>
            <ContextMenuLabel>Section · {active.section.name}</ContextMenuLabel>
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
            <ContextMenuLabel>{active.element.type}</ContextMenuLabel>
            <ContextMenuItem onSelect={() => void saveElementAsComponent(active.sectionId, active.element)}>
              Create component
            </ContextMenuItem>
            {(typeof active.element.props.text === "string" ||
              typeof active.element.props.label === "string" ||
              typeof active.element.props.title === "string") && (
              <ContextMenuItem onSelect={() => createTextSlot(active.sectionId, active.element)}>
                {active.element.textSlot ? "Edit text slot…" : "Create text slot…"}
              </ContextMenuItem>
            )}
            {active.element.textSlot ? (
              <ContextMenuItem onSelect={() => clearTextSlot(active.sectionId, active.element)}>
                Remove text slot
              </ContextMenuItem>
            ) : null}
            {isContainerElement(active.element.type) ? (
              <ContextMenuItem disabled>Container · drop elements inside</ContextMenuItem>
            ) : null}
            <ContextMenuItem onSelect={() => duplicateElement(active.sectionId, active.element.id)}>
              Duplicate
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="text-red-600 focus:text-red-700"
              onSelect={() => removeElement(active.sectionId, active.element.id)}
            >
              Delete
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
