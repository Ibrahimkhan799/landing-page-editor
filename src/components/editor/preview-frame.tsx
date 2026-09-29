"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { EditorThemeProvider } from "@/components/editor/editor-theme";
import { PageRenderer } from "@/components/landing/page-renderer";
import { StylePreviewProvider } from "@/components/landing/style-preview";
import type { Breakpoint, LandingPage } from "@/lib/types";

const frameDocument = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>html{color-scheme:light}html,body{margin:0;min-height:100%}body{background:white}#preview-root{min-height:100vh}</style></head><body><div id="preview-root" data-page-export-root></div></body></html>`;

// Clone the actual Next/Tailwind assets rather than guessing a build URL. Keep
// their order and update both DOM-based HMR and CSSOM-only style injections.
function mirrorAppStyles(source: Document, target: Document) {
  const copies = new Map<Element, { node: Element; signature: string }>();
  const end = target.createComment("end of app styles");
  target.head.append(end);
  let pending = 0;
  const sync = () => {
    pending = 0;
    const originals = [...source.querySelectorAll<HTMLStyleElement | HTMLLinkElement>('style, link[rel="stylesheet"]')]
      .filter((node) => !node.closest("[data-editor-canvas]") && !node.hasAttribute("data-editor-viewport-styles"));
    for (const [original, copy] of copies) {
      if (!originals.includes(original as HTMLStyleElement | HTMLLinkElement)) {
        copy.node.remove();
        copies.delete(original);
      }
    }
    for (const original of originals) {
      let text = original.textContent || "";
      if (original.tagName === "STYLE") {
        try {
          const rules = original.sheet?.cssRules;
          if (rules?.length) text = [...rules].map((rule) => rule.cssText).join("\n");
        } catch { /* A cross-origin stylesheet is mirrored by its link instead. */ }
      }
      const signature = original.outerHTML + text + String(original.sheet?.disabled ?? false);
      let copy = copies.get(original);
      if (!copy || copy.signature !== signature) {
        const node = original.cloneNode(true) as HTMLStyleElement | HTMLLinkElement;
        if (original.tagName === "LINK") (node as HTMLLinkElement).href = (original as HTMLLinkElement).href;
        else node.textContent = text;
        if (original.sheet?.disabled) node.setAttribute("media", "not all");
        copy?.node.remove();
        copy = { node, signature };
        copies.set(original, copy);
      }
      target.head.insertBefore(copy.node, end);
    }
    // next/font attaches variables to the host body; do not copy its dark or
    // editor-ui classes (or the editor's other inherited custom properties).
    const computed = source.defaultView?.getComputedStyle(source.body);
    for (const name of ["--font-geist-sans", "--font-geist-mono"]) {
      target.documentElement.style.setProperty(name, computed?.getPropertyValue(name) || "");
    }
  };
  const schedule = () => {
    if (!pending) pending = requestAnimationFrame(sync);
  };
  const observer = new MutationObserver(schedule);
  observer.observe(source.head, { childList: true, subtree: true, attributes: true, characterData: true });
  // Styles may be emitted in the body by React; ignore ordinary content edits.
  const bodyObserver = new MutationObserver((records) => {
    if (records.some((record) =>
      (record.target as Element).closest?.("style") ||
      [...record.addedNodes, ...record.removedNodes].some((node) =>
        node.nodeType === 1 && ((node as Element).matches("style,link") || (node as Element).querySelector("style,link")),
      ),
    )) schedule();
  });
  bodyObserver.observe(source.body, { childList: true, subtree: true, characterData: true });
  source.addEventListener("load", schedule, true);
  const timer = window.setInterval(schedule, 1000);
  sync();
  return () => {
    observer.disconnect();
    bodyObserver.disconnect();
    source.removeEventListener("load", schedule, true);
    window.clearInterval(timer);
    cancelAnimationFrame(pending);
    for (const copy of copies.values()) copy.node.remove();
    end.remove();
  };
}

// Editing stays in the parent document for dnd-kit's sensors and inspector
// queries. Replay app CSS in a scope, evaluating width media queries against a
// measurement document. Reset inactive media declarations *before* replaying
// defaults, so host md: utilities cannot win when the selected viewport is small.
function viewportRules(rules: CSSRuleList, view: Window, reset: boolean, inWidth = false): string {
  return [...rules].map((rule) => {
    const group = rule as CSSRule & { cssRules?: CSSRuleList; conditionText?: string; selectorText?: string; style?: CSSStyleDeclaration };
    if (group.selectorText && group.style) {
      const declarations = reset
        ? inWidth ? [...group.style].map((property) => `${property}:revert-layer${group.style!.getPropertyPriority(property) ? " !important" : ""};`).join("") : ""
        : group.style.cssText;
      const nested = group.cssRules ? viewportRules(group.cssRules, view, reset, inWidth) : "";
      return declarations || nested ? `${group.selectorText}{${declarations}${nested}}` : "";
    }
    if (!group.cssRules) {
      // Nested declaration blocks have no selector (CSSNestedDeclarations).
      if (group.style) return reset
        ? inWidth ? [...group.style].map((property) => `${property}:revert-layer;`).join("") : ""
        : group.style.cssText;
      return "";
    }
    if (rule.type === CSSRule.MEDIA_RULE && /\bwidth\b/.test(group.conditionText || "")) {
      if (!reset && !view.matchMedia(group.conditionText!).matches) return "";
      return viewportRules(group.cssRules, view, reset, true);
    }
    // Keyframes, font faces and property registrations are global assets, not
    // selector rules; the original app stylesheet already supplies them.
    const header = rule.cssText.slice(0, rule.cssText.indexOf("{"));
    if (!/^@(layer|supports|media|container|scope)\b/.test(header)) return "";
    const body = viewportRules(group.cssRules, view, reset, inWidth);
    return body ? `${header}{${body}}` : "";
  }).join("\n");
}

export function useEditViewportStyles(width: number, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const probe = document.createElement("iframe");
    probe.title = "Editor viewport style measurement";
    probe.setAttribute("aria-hidden", "true");
    probe.tabIndex = -1;
    probe.setAttribute("sandbox", "allow-same-origin");
    probe.style.cssText = `position:fixed;left:-100000px;top:0;width:${width}px;height:800px;border:0;visibility:hidden;pointer-events:none`;
    const style = document.createElement("style");
    style.setAttribute("data-editor-viewport-styles", "");
    document.body.append(probe);
    document.head.append(style);
    let pending = 0;
    const sync = () => {
      pending = 0;
      const view = probe.contentWindow;
      if (!view) return;
      const sheets = [...document.styleSheets].filter((sheet) => sheet.ownerNode !== style &&
        !(sheet.ownerNode as Element | null)?.closest?.("[data-editor-canvas]"));
      const serialize = (reset: boolean) => sheets.map((sheet) => {
        try {
          if (sheet.disabled) return "";
          const media = sheet.media.mediaText;
          const widthMedia = /\bwidth\b/.test(media);
          if (widthMedia && !reset && !view.matchMedia(media).matches) return "";
          const css = viewportRules(sheet.cssRules, view, reset, widthMedia);
          return media && !widthMedia ? `@media ${media}{${css}}` : css;
        } catch { return ""; } // Cross-origin font sheets do not contain app utilities.
      }).join("\n");
      const css = `@scope ([data-editor-canvas]) {${serialize(true)}\n${serialize(false)}}`;
      if (style.textContent !== css) {
        style.textContent = css;
        document.dispatchEvent(new Event("editor-viewport-styles"));
      }
    };
    const schedule = () => { if (!pending) pending = requestAnimationFrame(sync); };
    const observer = new MutationObserver(schedule);
    observer.observe(document.head, { subtree: true, attributes: true, characterData: true, childList: true });
    probe.addEventListener("load", schedule);
    document.addEventListener("load", schedule, true);
    const timer = window.setInterval(schedule, 1000);
    schedule();
    return () => {
      observer.disconnect();
      probe.removeEventListener("load", schedule);
      document.removeEventListener("load", schedule, true);
      window.clearInterval(timer);
      cancelAnimationFrame(pending);
      style.remove();
      probe.remove();
    };
  }, [width, enabled]);
}

export function PreviewFrame({ page, width, breakpoint }: {
  page: LandingPage;
  width: number;
  breakpoint: Breakpoint;
}) {
  const [frame, setFrame] = useState<HTMLIFrameElement | null>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const doc = target?.ownerDocument;
    if (!doc || !frame) return;
    const cleanupStyles = mirrorAppStyles(frame.ownerDocument, doc);
    const preventNavigation = (event: Event) => {
      const element = (event.target as Element | null)?.closest?.("a[href],area[href]");
      if (!element) return;
      event.preventDefault();
      const href = element.getAttribute("href");
      if (event.type === "click" && href?.startsWith("#") && href.length > 1) {
        try { doc.getElementById(decodeURIComponent(href.slice(1)))?.scrollIntoView({ behavior: "smooth" }); }
        catch { /* Malformed fragment URLs are inert in preview. */ }
      }
    };
    const preventDefault = (event: Event) => event.preventDefault();
    const editorShortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || (event.key !== "Escape" && !((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s"))) return;
      event.preventDefault();
      frame.ownerDocument.defaultView?.dispatchEvent(new KeyboardEvent("keydown", {
        key: event.key, code: event.code, metaKey: event.metaKey, ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey, altKey: event.altKey, bubbles: true, cancelable: true,
      }));
    };
    doc.addEventListener("keydown", editorShortcut);
    doc.addEventListener("click", preventNavigation, true);
    doc.addEventListener("auxclick", preventNavigation, true);
    doc.addEventListener("submit", preventDefault, true);
    doc.addEventListener("dragover", preventDefault);
    doc.addEventListener("drop", preventDefault);
    return () => {
      cleanupStyles();
      doc.removeEventListener("keydown", editorShortcut);
      doc.removeEventListener("click", preventNavigation, true);
      doc.removeEventListener("auxclick", preventNavigation, true);
      doc.removeEventListener("submit", preventDefault, true);
      doc.removeEventListener("dragover", preventDefault);
      doc.removeEventListener("drop", preventDefault);
    };
  }, [frame, target]);

  return (
    <>
      <iframe
        ref={setFrame}
        data-editor-preview-frame
        title={`Live page preview — ${breakpoint}, ${width}px wide`}
        srcDoc={frameDocument}
        // No scripts, forms, popups or top navigation. React's parent-realm
        // portal still handles interactions without a second React root.
        sandbox="allow-same-origin"
        onLoad={(event) => setTarget(event.currentTarget.contentDocument?.getElementById("preview-root") ?? null)}
        style={{ display: "block", width, height: 800, border: 0, background: "white", colorScheme: "light" }}
      />
      {target && createPortal(
        <EditorThemeProvider dark={false}>
          <StylePreviewProvider value={{ breakpoint, previewState: "default", live: true, interactivePreview: true, previewNodeId: null }}>
            <PageRenderer page={page} interactive />
          </StylePreviewProvider>
        </EditorThemeProvider>,
        target,
      )}
    </>
  );
}
