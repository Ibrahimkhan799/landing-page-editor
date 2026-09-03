"use client";

import { useDroppable } from "@dnd-kit/core";
import { useEditor } from "@/components/editor/editor-context";
import type { SlotDefinition } from "@/lib/types";
import { cn } from "@/lib/utils";

export function EmptySlot({
  sectionId,
  slot,
  compact,
}: {
  sectionId: string;
  slot: SlotDefinition;
  compact?: boolean;
}) {
  const { selection, setSelection } = useEditor();
  const selected = selection.kind === "slot" && selection.sectionId === sectionId && selection.slotId === slot.id;
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${sectionId}-${slot.id}`,
    data: { kind: "slot", sectionId, slotId: slot.id },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        setSelection({ kind: "slot", sectionId, slotId: slot.id });
      }}
      className={cn(
        "flex w-full items-center justify-center rounded-lg border-2 border-dashed px-3 text-xs transition",
        compact ? "min-h-9 py-2" : "min-h-14 py-4",
        isOver
          ? "border-teal-500 bg-teal-50 text-teal-800"
          : selected
            ? "border-teal-600 bg-teal-50/70 text-teal-800"
            : "border-slate-300 bg-white/70 text-slate-500 hover:border-teal-400 hover:text-teal-800",
      )}
    >
      {compact ? `Add to ${slot.label}` : `Drop ${slot.accept?.join(" / ") ?? "an element"} into “${slot.label}”`}
    </button>
  );
}
