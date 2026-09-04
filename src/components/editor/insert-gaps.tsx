"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

export function SectionGapDrop({ index }: { index: number }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `section-gap-${index}`,
    data: { kind: "section-gap", atIndex: index },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group relative mx-auto flex h-2 max-w-6xl items-center justify-center transition-[height] duration-75",
        "[[data-dragging]_&]:h-5",
        isOver && "h-9",
      )}
    >
      <div
        className={cn(
          "h-0.5 w-full rounded-full bg-transparent transition-colors duration-75",
          isOver ? "bg-[#0d99ff]" : "[[data-dragging]_&]:bg-zinc-300 group-hover:bg-zinc-300",
        )}
      />
      {isOver ? (
        <span className="absolute rounded-full bg-[#0d99ff] px-2 py-0.5 text-[10px] font-medium text-white">
          Insert here
        </span>
      ) : null}
    </div>
  );
}

export function ElementInsertDrop({
  sectionId,
  slotId,
  index,
}: {
  sectionId: string;
  slotId: string;
  index: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `element-insert-${sectionId}-${slotId}-${index}`,
    data: { kind: "element-insert", sectionId, slotId, atIndex: index },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative flex h-1.5 w-full items-center justify-center transition-[height] duration-75",
        "[[data-dragging]_&]:h-3",
        isOver && "h-5",
      )}
    >
      <div
        className={cn(
          "h-px w-full",
          isOver ? "bg-[#0d99ff]" : "bg-transparent [[data-dragging]_&]:bg-zinc-200",
        )}
      />
      {isOver ? (
        <span className="absolute rounded-full bg-[#0d99ff] px-2 py-0.5 text-[10px] font-medium text-white">
          Insert here
        </span>
      ) : null}
    </div>
  );
}
