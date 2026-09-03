"use client";

import {
  Box,
  ChevronDown,
  ChevronRight,
  Component,
  Frame,
  Type,
} from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEditor } from "@/components/editor/editor-context";
import { elementsSlot, elementSlot, slotDefs } from "@/lib/slots";
import type { PageElement, PageSection } from "@/lib/types";
import { cn } from "@/lib/utils";

function elementIcon(type: PageElement["type"]) {
  if (type === "heading" || type === "paragraph") return Type;
  return Box;
}

function LayerRow({
  depth,
  label,
  active,
  muted,
  icon: Icon,
  onClick,
}: {
  depth: number;
  label: string;
  active?: boolean;
  muted?: boolean;
  icon: typeof Frame;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-7 w-full items-center gap-1.5 rounded-sm pr-2 text-left text-[12px]",
        active ? "bg-[#0d99ff]/15 text-zinc-900" : "text-zinc-700 hover:bg-zinc-100",
        muted && "text-zinc-400",
      )}
      style={{ paddingLeft: 8 + depth * 12 }}
    >
      <Icon className="size-3.5 shrink-0 text-zinc-400" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function SectionLayers({ section }: { section: PageSection }) {
  const { selection, setSelection, toggleSelectElement, selectedRefs } = useEditor();
  const [open, setOpen] = useState(true);
  const selected =
    (selection.kind === "section" && selection.sectionId === section.id) ||
    (selection.kind !== "page" &&
      selection.kind !== "elements" &&
      selection.sectionId === section.id &&
      selection.kind !== "element");
  const defs = slotDefs(section.type);

  return (
    <div>
      <div className="flex items-center">
        <button
          type="button"
          className="grid size-6 place-items-center text-zinc-400"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        </button>
        <button
          type="button"
          onClick={() => setSelection({ kind: "section", sectionId: section.id })}
          className={cn(
            "flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-sm px-1 text-left text-[12px]",
            selection.kind === "section" && selection.sectionId === section.id
              ? "bg-[#0d99ff]/15 text-zinc-900"
              : selected
                ? "text-zinc-900"
                : "text-zinc-700 hover:bg-zinc-100",
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
                <LayerRow
                  key={slot.id}
                  depth={2}
                  label={slot.label}
                  icon={Type}
                  muted
                  active={selection.kind === "slot" && selection.slotId === slot.id && selection.sectionId === section.id}
                  onClick={() => setSelection({ kind: "section", sectionId: section.id })}
                />
              );
            }
            const items =
              slot.kind === "elements"
                ? elementsSlot(section, slot.id)
                : elementSlot(section, slot.id)
                  ? [elementSlot(section, slot.id) as PageElement]
                  : [];
            return (
              <div key={slot.id}>
                <LayerRow
                  depth={2}
                  label={slot.label}
                  icon={Frame}
                  active={selection.kind === "slot" && selection.slotId === slot.id && selection.sectionId === section.id}
                  onClick={() => setSelection({ kind: "slot", sectionId: section.id, slotId: slot.id })}
                />
                {items.map((element) => {
                  const Icon = elementIcon(element.type);
                  const active = selectedRefs.some((ref) => ref.elementId === element.id);
                  return (
                    <LayerRow
                      key={element.id}
                      depth={3}
                      label={element.type}
                      icon={Icon}
                      active={active}
                      onClick={() =>
                        toggleSelectElement(
                          { sectionId: section.id, slotId: slot.id, elementId: element.id },
                          false,
                        )
                      }
                    />
                  );
                })}
              </div>
            );
          })
        : null}
    </div>
  );
}

export function LayersPanel() {
  const { page, setSelection } = useEditor();
  return (
    <ScrollArea className="h-full">
      <div className="space-y-0.5 p-2">
        <LayerRow depth={0} label={page.name || "Page"} icon={Frame} onClick={() => setSelection({ kind: "page" })} />
        {page.sections.map((section) => (
          <SectionLayers key={section.id} section={section} />
        ))}
      </div>
    </ScrollArea>
  );
}
