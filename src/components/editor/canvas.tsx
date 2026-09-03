"use client";

import type { ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { LandingSection } from "@/components/landing/sections";
import { themeStyle } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useEditor } from "@/components/editor/editor-context";

function SortableRow({
  id,
  kind,
  selected,
  onSelect,
  children,
  handleClassName,
}: {
  id: string;
  kind: "section" | "element";
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
  handleClassName?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { kind },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("group relative", isDragging && "z-10 opacity-70", selected && "ring-2 ring-primary ring-offset-2")}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <button
        type="button"
        className={cn(
          "absolute z-10 grid place-items-center rounded-md border bg-background/95 text-muted-foreground shadow-sm",
          handleClassName,
        )}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      {children}
    </div>
  );
}

export function EditorCanvas({ device }: { device: "desktop" | "tablet" | "mobile" }) {
  const { page, selection, setSelection, moveSection, moveElement } = useEditor();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const kind = active.data.current?.kind;
    if (kind === "section") {
      const from = page.sections.findIndex((section) => section.id === active.id);
      const to = page.sections.findIndex((section) => section.id === over.id);
      if (from >= 0 && to >= 0) moveSection(from, to);
      return;
    }
    if (kind === "element") {
      const section = page.sections.find((item) =>
        item.elements.some((element) => element.id === active.id),
      );
      if (!section) return;
      const from = section.elements.findIndex((element) => element.id === active.id);
      const to = section.elements.findIndex((element) => element.id === over.id);
      if (from >= 0 && to >= 0) moveElement(section.id, from, to);
    }
  }

  const width =
    device === "mobile" ? "max-w-[390px]" : device === "tablet" ? "max-w-[768px]" : "max-w-[1200px]";

  return (
    <div
      className="min-h-0 flex-1 overflow-auto bg-zinc-200/80 p-6"
      onClick={() => setSelection({ kind: "page" })}
    >
      <div className={cn("mx-auto overflow-hidden rounded-xl border bg-white shadow-xl", width)}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={page.sections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
            <div style={themeStyle(page.theme)}>
              {page.sections.map((section) => {
                const sectionSelected =
                  selection.kind === "section" && selection.sectionId === section.id;
                return (
                  <SortableRow
                    key={section.id}
                    id={section.id}
                    kind="section"
                    selected={sectionSelected}
                    onSelect={() => setSelection({ kind: "section", sectionId: section.id })}
                    handleClassName="left-2 top-3 h-8 w-8 opacity-0 group-hover:opacity-100"
                  >
                    <LandingSection section={section} theme={page.theme} interactive={false} />
                    {section.elements.length > 0 &&
                    (sectionSelected ||
                      (selection.kind === "element" && selection.sectionId === section.id)) ? (
                      <div
                        className="border-t px-6 py-3"
                        style={{ background: "var(--lp-muted)", borderColor: "var(--lp-border)" }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Sort elements in this section
                        </p>
                        <SortableContext
                          items={section.elements.map((element) => element.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2">
                            {section.elements.map((element) => (
                              <SortableRow
                                key={element.id}
                                id={element.id}
                                kind="element"
                                selected={
                                  selection.kind === "element" && selection.elementId === element.id
                                }
                                onSelect={() =>
                                  setSelection({
                                    kind: "element",
                                    sectionId: section.id,
                                    elementId: element.id,
                                  })
                                }
                                handleClassName="left-2 top-1/2 h-7 w-7 -translate-y-1/2"
                              >
                                <div className="rounded-md border bg-background py-2 pl-12 pr-3 text-sm capitalize">
                                  {element.type}
                                  {typeof element.props.label === "string"
                                    ? ` · ${element.props.label}`
                                    : typeof element.props.text === "string"
                                      ? ` · ${element.props.text.slice(0, 40)}`
                                      : ""}
                                </div>
                              </SortableRow>
                            ))}
                          </div>
                        </SortableContext>
                      </div>
                    ) : null}
                  </SortableRow>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
