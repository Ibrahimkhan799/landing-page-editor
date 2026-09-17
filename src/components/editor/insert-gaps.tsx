"use client";

import { useDndContext, useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

export function SectionGapDrop({ index }: { index: number }) {
  const { active } = useDndContext();
  const activeKind = (active?.data.current as { kind?: string } | undefined)?.kind;
  const disabled = Boolean(
    activeKind &&
      activeKind !== "section" &&
      activeKind !== "layer-section" &&
      activeKind !== "library-section" &&
      activeKind !== "library-component" &&
      activeKind !== "library-element",
  );
  const { setNodeRef, isOver } = useDroppable({
    id: `section-gap-${index}`,
    data: { kind: "section-gap", atIndex: index },
    disabled,
  });

  return (
    <div className="relative mx-auto h-2 max-w-6xl">
      <div
        ref={setNodeRef}
        className="group pointer-events-none absolute -inset-y-2 inset-x-0 z-6 flex items-center justify-center"
      >
        <div
          className={cn(
            "h-0.5 w-full rounded-full bg-transparent transition-colors duration-100",
            disabled
              ? "bg-transparent"
              : isOver
                ? "bg-[#0d99ff]"
                : "in-data-dragging:bg-zinc-300 group-hover:bg-zinc-300",
          )}
        />
        {isOver ? (
          <span className="pointer-events-none absolute rounded-full bg-[#0d99ff] px-2 py-0.5 text-[10px] font-medium text-white">
            Insert here
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function ElementInsertDrop({
  sectionId,
  slotId,
  index,
  disabled = false,
}: {
  sectionId: string;
  slotId: string;
  index: number;
  disabled?: boolean;
}) {
  const { active } = useDndContext();
  const activeKind = (active?.data.current as { kind?: string } | undefined)?.kind;
  const dropDisabled =
    disabled ||
    Boolean(
      activeKind &&
        activeKind !== "element" &&
        activeKind !== "layer-element" &&
        activeKind !== "library-element",
    );
  const { setNodeRef, isOver } = useDroppable({
    id: `element-insert-${sectionId}-${slotId}-${index}`,
    data: { kind: "element-insert", sectionId, slotId, atIndex: index },
    disabled: dropDisabled,
  });

  return (
    <div className="relative h-1.5 w-full">
      <div
        ref={setNodeRef}
        className={cn(
          "pointer-events-none absolute -inset-y-1.5 inset-x-0 z-6 flex items-center justify-center",
          dropDisabled && "pointer-events-none",
        )}
      >
        <div
          className={cn(
            "h-px w-full transition-colors duration-100",
            dropDisabled
              ? "bg-transparent"
              : isOver
                ? "bg-[#0d99ff]"
                : "bg-transparent in-data-dragging:bg-zinc-200",
          )}
        />
        {isOver ? (
          <span className="pointer-events-none absolute rounded-full bg-[#0d99ff] px-2 py-0.5 text-[10px] font-medium text-white">
            Insert here
          </span>
        ) : null}
      </div>
    </div>
  );
}
