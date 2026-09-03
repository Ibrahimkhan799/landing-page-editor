"use client";

import type { ReactNode } from "react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
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
  data,
  children,
}: {
  id: string;
  kind: "section" | "element";
  selected: boolean;
  label: string;
  onSelect: () => void;
  data: Record<string, unknown>;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { kind, ...data },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("group relative", isDragging && "z-20 opacity-70")}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-10 rounded-md border-2 border-transparent",
          selected
            ? kind === "section"
              ? "border-teal-600"
              : "border-amber-500"
            : kind === "section"
              ? "group-hover:border-teal-400/70"
              : "group-hover:border-amber-400/70",
        )}
      />
      {selected ? (
        <div
          className={cn(
            "absolute left-2 top-2 z-20 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white",
            kind === "section" ? "bg-teal-700" : "bg-amber-500",
          )}
        >
          {label}
        </div>
      ) : null}
      <button
        type="button"
        className="absolute right-2 top-2 z-20 grid h-7 w-7 place-items-center rounded-md border bg-white/95 text-muted-foreground opacity-0 shadow-sm group-hover:opacity-100"
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
  const { page, selection, setSelection } = useEditor();
  const width =
    device === "mobile" ? "max-w-[390px]" : device === "tablet" ? "max-w-[768px]" : "max-w-[1200px]";

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-zinc-200/80 p-6" onClick={() => setSelection({ kind: "page" })}>
      <div className={cn("mx-auto overflow-hidden rounded-xl border bg-white shadow-xl", width)}>
        <SortableContext items={page.sections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
          <div style={themeStyle(page.theme)}>
            {page.sections.map((section) => {
              const sectionSelected = selection.kind === "section" && selection.sectionId === section.id;
              const elementIds = slotDefs(section.type)
                .filter((slot) => slot.kind === "elements")
                .flatMap((slot) => elementsSlot(section, slot.id).map((element) => element.id));
              return (
                <Overlay
                  key={section.id}
                  id={section.id}
                  kind="section"
                  label={section.name}
                  selected={sectionSelected}
                  data={{ sectionId: section.id }}
                  onSelect={() => setSelection({ kind: "section", sectionId: section.id })}
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
  );
}
