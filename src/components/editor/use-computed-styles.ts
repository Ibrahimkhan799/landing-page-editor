"use client";

import { useEffect, useState } from "react";
import { readComputedStyleProps } from "@/lib/computed-styles";
import type { StyleProps } from "@/lib/types";

export function useComputedStyles(nodeId: string | null, revision: unknown, resetKey = "") {
  const [snapshot, setSnapshot] = useState<{
    id: string | null;
    resetKey: string;
    computed: StyleProps;
    box: { width: number; height: number };
  }>({ id: null, resetKey: "", computed: {}, box: { width: 0, height: 0 } });

  useEffect(() => {
    if (!nodeId) return;
    let cancelled = false;
    let observed: HTMLElement | null = null;
    const observer = new ResizeObserver(() => schedule());
    let pending = 0;
    const schedule = () => {
      if (!pending) pending = requestAnimationFrame(read);
    };
    const read = () => {
      pending = 0;
      const selector = `[data-editor-node="${CSS.escape(nodeId)}"]`;
      // Never inspect an iframe while the editing canvas exists, even if the
      // selected node is absent there (e.g. a hidden node or stale selection).
      const root = document.querySelector("[data-editor-canvas]") ??
        document.querySelector<HTMLIFrameElement>("[data-editor-preview-frame]")?.contentDocument ?? document;
      const matches = [...root.querySelectorAll<HTMLElement>(selector)];
      const el =
        matches.find(
          (node) =>
            !node.closest("[data-editor-chrome]") &&
            node.matches("span,a,h1,h2,h3,h4,p,img,video,label,button,input,textarea,section,header,footer,div"),
        ) ?? matches[0];
      if (!el || cancelled) return;
      if (observed !== el) {
        observer.disconnect();
        observer.observe(el);
        observed = el;
      }
      setSnapshot({
        id: nodeId,
        resetKey,
        computed: readComputedStyleProps(el),
        box: {
          // offset sizes are CSS pixels, unaffected by canvas zoom/transform.
          width: el.offsetWidth,
          height: el.offsetHeight,
        },
      });
    };
    schedule();
    const later = window.setTimeout(schedule, 80);
    window.addEventListener("resize", schedule);
    document.addEventListener("editor-viewport-styles", schedule);
    return () => {
      cancelled = true;
      cancelAnimationFrame(pending);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      document.removeEventListener("editor-viewport-styles", schedule);
      window.clearTimeout(later);
    };
  }, [nodeId, revision, resetKey]);

  if (snapshot.id !== nodeId || snapshot.resetKey !== resetKey) {
    return { computed: {} as StyleProps, box: snapshot.id === nodeId ? snapshot.box : { width: 0, height: 0 } };
  }
  return { computed: snapshot.computed, box: snapshot.box };
}
