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
        "group relative mx-auto flex h-3 max-w-6xl items-center justify-center transition",
        isOver && "h-10",
      )}
    >
      <div
        className={cn(
          "h-px w-full bg-transparent transition",
          isOver ? "bg-[#0d99ff]" : "group-hover:bg-zinc-300",
        )}
      />
      {isOver ? (
        <span className="absolute rounded-full bg-[#0d99ff] px-2 py-0.5 text-[10px] font-medium text-white">
          Drop to insert block
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
      className={cn("relative flex h-2 w-full items-center justify-center", isOver && "h-6")}
    >
      <div className={cn("h-px w-full", isOver ? "bg-[#0d99ff]" : "bg-transparent")} />
      {isOver ? (
        <span className="absolute rounded-full bg-[#0d99ff] px-2 py-0.5 text-[10px] font-medium text-white">
          Insert here
        </span>
      ) : null}
    </div>
  );
}
