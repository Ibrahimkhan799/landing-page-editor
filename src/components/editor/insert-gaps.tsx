"use client";

import { useDndContext, useDroppable } from "@dnd-kit/core";
import { useEffect, useRef, useState } from "react";
import { measuredLayout, verticalLayout } from "@/components/editor/layout-drop";

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
  const { setNodeRef } = useDroppable({
    id: `section-gap-${index}`,
    data: { kind: "section-gap", atIndex: index },
    disabled,
  });

  return (
    <div data-page-export-remove className="relative mx-auto h-2 max-w-6xl">
      <div ref={setNodeRef} className="pointer-events-none absolute -inset-y-2 inset-x-0 z-6" />
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
  const host = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState(verticalLayout);
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const read = () => {
      const next = measuredLayout(node);
      setLayout((current) => current.axis === next.axis && current.mode === next.mode && current.reverse === next.reverse ? current : next);
    };
    const frame = requestAnimationFrame(read);
    document.addEventListener("editor-viewport-styles", read);
    const resize = new ResizeObserver(read);
    if (node.parentElement) resize.observe(node.parentElement);
    const observer = new MutationObserver(read);
    if (node.parentElement) observer.observe(node.parentElement, { attributes: true, attributeFilter: ["class", "style"] });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("editor-viewport-styles", read);
      resize.disconnect();
      observer.disconnect();
    };
  }, []);
  const dropDisabled =
    disabled || layout.mode === "grid" ||
    Boolean(
      activeKind &&
        activeKind !== "element" &&
        activeKind !== "layer-element" &&
        activeKind !== "library-element",
    );
  const { setNodeRef } = useDroppable({
    id: `element-insert-${sectionId}-${slotId}-${index}`,
    data: { kind: "element-insert", sectionId, slotId, atIndex: index, layout },
    disabled: dropDisabled,
  });

  return (
    <div
      ref={host}
      data-page-export-remove
      data-drop-axis={layout.axis}
      // A gap must not become an extra grid cell. Grid placement is measured
      // against the real items by the shared resolver instead.
      style={layout.mode === "grid" ? { display: "none" } : undefined}
      className={layout.axis === "x" ? "relative w-1.5 shrink-0 self-stretch" : "relative h-1.5 w-full shrink-0"}
    >
      <div ref={setNodeRef} className={layout.axis === "x"
        ? "pointer-events-none absolute -inset-x-1.5 inset-y-0 z-6"
        : "pointer-events-none absolute -inset-y-1.5 inset-x-0 z-6"} />
    </div>
  );
}
