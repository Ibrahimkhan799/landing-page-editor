"use client";

import { useEffect, useState } from "react";
import { readComputedStyleProps } from "@/lib/computed-styles";
import type { StyleProps } from "@/lib/types";

export function useComputedStyles(nodeId: string | null, revision: unknown) {
  const [snapshot, setSnapshot] = useState<{
    id: string | null;
    computed: StyleProps;
    box: { width: number; height: number };
  }>({ id: null, computed: {}, box: { width: 0, height: 0 } });

  useEffect(() => {
    if (!nodeId) return;
    let cancelled = false;
    const read = () => {
      const matches = [
        ...document.querySelectorAll(`[data-editor-node="${CSS.escape(nodeId)}"]`),
      ] as HTMLElement[];
      const el =
        matches.find((node) => node.matches("span,a,h1,h2,h3,h4,p,img,video,label,button,section,header,footer")) ??
        matches[0];
      if (!el || cancelled) return;
      setSnapshot({
        id: nodeId,
        computed: readComputedStyleProps(el),
        box: {
          width: Math.round(el.getBoundingClientRect().width),
          height: Math.round(el.getBoundingClientRect().height),
        },
      });
    };
    const frame = requestAnimationFrame(read);
    const later = window.setTimeout(read, 120);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(later);
    };
  }, [nodeId, revision]);

  if (snapshot.id !== nodeId) {
    return { computed: {} as StyleProps, box: { width: 0, height: 0 } };
  }
  return { computed: snapshot.computed, box: snapshot.box };
}
