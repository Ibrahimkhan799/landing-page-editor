"use client";

import { useDroppable } from "@dnd-kit/core";
import { useEditor } from "@/components/editor/editor-context";
import type { SlotDefinition } from "@/lib/types";
import { cn } from "@/lib/utils";

export function EmptySlot({
  sectionId,
  slot,
  disabled = false,
}: {
  sectionId: string;
  slot: SlotDefinition;
  disabled?: boolean;
  /** @deprecated Filled slots no longer render chrome. */
  compact?: boolean;
}) {
  const { selection, setSelection } = useEditor();
  const selected = selection.kind === "slot" && selection.sectionId === sectionId && selection.slotId === slot.id;
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${sectionId}-${slot.id}`,
    data: { kind: "slot", sectionId, slotId: slot.id, accept: slot.accept },
    disabled,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        setSelection({ kind: "slot", sectionId, slotId: slot.id });
      }}
      className={cn(
        "flex w-full min-h-11 items-center justify-center rounded-md border border-dashed px-3 py-3 text-[11px] transition",
        isOver || selected
          ? "border-[#0d99ff] bg-[#0d99ff]/5 text-zinc-700"
          : "border-zinc-300 text-zinc-400 hover:border-[#0d99ff]/70",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {`Drop ${slot.accept?.join(" / ") ?? "an element"} into “${slot.label}”`}
    </button>
  );
}
