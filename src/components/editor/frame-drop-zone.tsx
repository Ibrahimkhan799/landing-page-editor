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

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        setSelection({ kind: "slot", sectionId, slotId });
      }}
      className={cn(
        "flex w-full items-center justify-center border border-dashed px-3 text-[11px] transition",
        compact ? "min-h-8 rounded-md py-1.5" : "min-h-12 rounded-[2px] py-3",
        isOver || selected
          ? "border-[#0d99ff] bg-[#0d99ff]/5 text-zinc-700"
          : "border-zinc-300/80 text-zinc-400 hover:border-[#0d99ff]/70",
      )}
    >
      {compact ? "Add inside" : label || "Drop elements here"}
    </button>
  );
}
