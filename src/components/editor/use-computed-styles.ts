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
      const el = document.querySelector(`[data-editor-node="${CSS.escape(nodeId)}"]`) as HTMLElement | null;
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
    const timer = window.setTimeout(read, 50);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [nodeId, revision]);

  if (snapshot.id !== nodeId) {
    return { computed: {} as StyleProps, box: { width: 0, height: 0 } };
  }
  return { computed: snapshot.computed, box: snapshot.box };
}
