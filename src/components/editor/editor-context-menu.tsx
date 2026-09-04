"use client";

import type { ReactNode } from "react";
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
import { isContainerElement } from "@/lib/slots";
import type { PageElement, PageSection } from "@/lib/types";
import { nanoid } from "nanoid";

type Target =
  | { kind: "section"; section: PageSection }
  | { kind: "element"; sectionId: string; slotId: string; element: PageElement };

export function EditorContextMenu({
  target,
  children,
  pageId,
}: {
  target: Target;
  children: ReactNode;
  pageId?: string | null;
}) {
  const {
    page,
    editorMode,
    duplicateSection,
    removeSection,
    duplicateElement,
    removeElement,
    updateSection,
    updateElement,
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

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="editor-ui">
        {target.kind === "section" ? (
          <>
            <ContextMenuLabel>Section</ContextMenuLabel>
            <ContextMenuItem onSelect={() => void saveSectionAsComponent(target.section)}>
              Create component
            </ContextMenuItem>
            {target.section.componentId ? (
              <ContextMenuItem onSelect={() => openComponent(target.section.componentId!)}>
                Edit component
              </ContextMenuItem>
            ) : null}
            {editorMode === "page" ? (
              <>
                <ContextMenuItem onSelect={() => duplicateSection(target.section.id)}>Duplicate</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  className="text-red-600 focus:text-red-700"
                  onSelect={() => removeSection(target.section.id)}
                >
                  Delete
                </ContextMenuItem>
              </>
            ) : null}
          </>
        ) : (
          <>
            <ContextMenuLabel>{target.element.type}</ContextMenuLabel>
            <ContextMenuItem onSelect={() => void saveElementAsComponent(target.sectionId, target.element)}>
              Create component
            </ContextMenuItem>
            {(typeof target.element.props.text === "string" ||
              typeof target.element.props.label === "string" ||
              typeof target.element.props.title === "string") && (
              <ContextMenuItem onSelect={() => createTextSlot(target.sectionId, target.element)}>
                {target.element.textSlot ? "Edit text slot…" : "Create text slot…"}
              </ContextMenuItem>
            )}
            {target.element.textSlot ? (
              <ContextMenuItem onSelect={() => clearTextSlot(target.sectionId, target.element)}>
                Remove text slot
              </ContextMenuItem>
            ) : null}
            {isContainerElement(target.element.type) ? (
              <ContextMenuItem disabled>Container · drop elements inside</ContextMenuItem>
            ) : null}
            <ContextMenuItem onSelect={() => duplicateElement(target.sectionId, target.element.id)}>
              Duplicate
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="text-red-600 focus:text-red-700"
              onSelect={() => removeElement(target.sectionId, target.element.id)}
            >
              Delete
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
