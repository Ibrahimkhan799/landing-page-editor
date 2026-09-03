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
        "flex w-full items-center justify-center rounded-md border border-dashed px-3 text-[11px] transition",
        compact ? "min-h-8 py-1.5" : "min-h-11 py-3",
        isOver
          ? "border-[#0d99ff] bg-[#0d99ff]/5 text-zinc-700"
          : selected
            ? "border-[#0d99ff] bg-[#0d99ff]/5 text-zinc-700"
            : "border-zinc-300 text-zinc-400 hover:border-[#0d99ff]/70",
      )}
    >
      {compact ? `Add to ${slot.label}` : `Drop ${slot.accept?.join(" / ") ?? "an element"} into “${slot.label}”`}
    </button>
  );
}
