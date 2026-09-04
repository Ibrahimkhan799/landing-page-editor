"use client";

import { useDroppable } from "@dnd-kit/core";
import { useEditor } from "@/components/editor/editor-context";
import { frameSlotId } from "@/lib/slots";
import { cn } from "@/lib/utils";

export function FrameDropZone({
  sectionId,
  parentId,
  compact,
  label,
}: {
  sectionId: string;
  parentId: string;
  compact?: boolean;
  label?: string;
}) {
  const { selection, setSelection } = useEditor();
  const slotId = frameSlotId(parentId);
  const selected = selection.kind === "slot" && selection.sectionId === sectionId && selection.slotId === slotId;
  const { setNodeRef, isOver } = useDroppable({
    id: `frame-drop-${sectionId}-${parentId}`,
    data: { kind: "frame", sectionId, slotId, parentId },
  });

  // Filled frames: invisible hit target while dragging — no permanent "Add inside" chrome
  if (compact) {
    return (
      <div
        ref={setNodeRef}
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 z-[4] rounded-[inherit]",
          "[[data-dragging]_&]:pointer-events-auto",
          isOver && "bg-[#0d99ff]/12 shadow-[inset_0_0_0_2px_#0d99ff]",
          selected && !isOver && "shadow-[inset_0_0_0_1px_rgba(13,153,255,0.35)]",
        )}
      />
    );
  }

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        setSelection({ kind: "slot", sectionId, slotId });
      }}
      className={cn(
        "relative flex w-full min-h-12 items-center justify-center rounded-[2px] border border-dashed px-3 py-3 text-[11px] transition",
        isOver || selected
          ? "border-[#0d99ff] bg-[#0d99ff]/5 text-zinc-700"
          : "border-zinc-300/80 text-zinc-400 hover:border-[#0d99ff]/70",
      )}
    >
      {label || "Drop elements here"}
    </button>
  );
}
