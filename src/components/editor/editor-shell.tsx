"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Monitor, Moon, Smartphone, Sun, Tablet, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { EditorCanvas } from "@/components/editor/canvas";
import { EditorDnd } from "@/components/editor/editor-dnd";
import { isTypingTarget, useEditor } from "@/components/editor/editor-context";
import { Inspector } from "@/components/editor/inspector";
import { LibrarySidebar } from "@/components/editor/library-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Breakpoint } from "@/lib/types";

const DARK_KEY = "lp-editor-chrome-dark";

export function EditorShell({ backHref }: { backHref?: string }) {
  const {
    page,
    updatePage,
    dirty,
    saving,
    save,
    selection,
    setSelection,
    selectedSection,
    selectedElement,
    selectedRefs,
    duplicateSection,
    removeSection,
    duplicateElement,
    removeElement,
    copySelection,
    pasteClipboard,
    selectSlotSiblings,
    breakpoint,
    setBreakpoint,
    setPreviewState,
    editorMode,
  } = useEditor();

  const isComponent = editorMode === "component";
  const backTo = backHref || "/admin";
  const [dark, setDark] = useState(false);

  useEffect(() => {
    try {
      setDark(window.localStorage.getItem(DARK_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  function toggleDark() {
    setDark((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(DARK_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  useEffect(() => {
    if (selectedElement?.type !== "button") setPreviewState("default");
  }, [selectedElement, setPreviewState]);

  const persist = useCallback(async () => {
    try {
      await save();
      toast.success(isComponent ? "Component saved — page instances updated" : "Page saved");
    } catch {
      toast.error(isComponent ? "Could not save component" : "Could not save page");
    }
  }, [save, isComponent]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void persist();
        return;
      }
      if (isTypingTarget(event.target)) return;
      if (event.key === "Escape") {
        setSelection({ kind: "page" });
        setPreviewState("default");
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedSection) {
        event.preventDefault();
        if (selectedRefs.length) {
          for (const ref of selectedRefs) removeElement(ref.sectionId, ref.elementId);
        } else if (!isComponent) {
          removeSection(selectedSection.id);
        }
        return;
      }
      if (meta && event.key.toLowerCase() === "d" && selectedSection) {
        event.preventDefault();
        if (selectedElement) duplicateElement(selectedSection.id, selectedElement.id);
        else if (!isComponent) duplicateSection(selectedSection.id);
        return;
      }
      if (meta && event.key.toLowerCase() === "c") {
        event.preventDefault();
        copySelection();
        toast.message("Copied");
        return;
      }
      if (meta && event.key.toLowerCase() === "v") {
        event.preventDefault();
        void pasteClipboard(event.shiftKey).then((ok) => {
          if (ok) toast.message(event.shiftKey ? "Pasted in place" : "Pasted");
        });
        return;
      }
      if (meta && event.key.toLowerCase() === "a" && selectedElement && selectedSection) {
        event.preventDefault();
        const slotId = selection.kind === "element" ? selection.slotId : selectedRefs[0]?.slotId;
        if (slotId) selectSlotSiblings(selectedSection.id, slotId);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    selectedSection,
    selectedElement,
    selectedRefs,
    selection,
    setSelection,
    setPreviewState,
    removeElement,
    removeSection,
    duplicateElement,
    duplicateSection,
    copySelection,
    pasteClipboard,
    selectSlotSiblings,
    isComponent,
    persist,
  ]);

  // Dark class only on chrome — never wrap the canvas so landing/shadcn stay light.
  return (
    <div className="editor-ui flex h-screen flex-col bg-zinc-100 text-zinc-900">
      <header
        className={cn(
          "flex h-11 shrink-0 items-center gap-2 border-b border-zinc-200 bg-white px-2",
          dark && "dark border-zinc-800 bg-zinc-950 text-zinc-100",
        )}
      >
        <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-zinc-600 dark:text-zinc-300">
          <Link href={backTo}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <Input
            value={page.name}
            onChange={(event) => updatePage({ name: event.target.value })}
            className="h-7 max-w-xs border-transparent bg-transparent px-1.5 text-sm font-medium shadow-none focus-visible:border-zinc-200 dark:text-zinc-100 dark:focus-visible:border-zinc-700"
          />
          {isComponent ? (
            <p className="px-1.5 text-[10px] uppercase tracking-[0.14em] text-zinc-400">Component editor</p>
          ) : null}
        </div>
        {dirty ? <span className="text-[11px] text-zinc-400">Unsaved</span> : null}
        <button
          type="button"
          title={dark ? "Light editor" : "Dark editor"}
          className="grid size-7 place-items-center rounded text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          onClick={toggleDark}
        >
          {dark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
        </button>
        <div className="flex rounded-md bg-zinc-100 p-0.5 dark:bg-zinc-900">
          {(
            [
              ["desktop", Monitor],
              ["tablet", Tablet],
              ["mobile", Smartphone],
            ] as const
          ).map(([value, Icon]) => (
            <button
              key={value}
              type="button"
              title={value}
              className={cn(
                "grid size-7 place-items-center rounded text-zinc-500",
                breakpoint === value && "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50",
              )}
              onClick={() => setBreakpoint(value as Breakpoint)}
            >
              <Icon className="size-3.5" />
            </button>
          ))}
        </div>
        {!isComponent ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-zinc-500"
            title="View live"
            onClick={async () => {
              if (dirty) {
                try {
                  await save();
                } catch {
                  toast.error("Save the page before previewing");
                  return;
                }
              }
              window.open(`/p/${page.slug}`, "_blank", "noopener,noreferrer");
            }}
          >
            <ExternalLink className="size-4" />
          </Button>
        ) : null}
        <Button size="sm" className="h-8 px-3" onClick={persist} disabled={saving}>
          <Save className="size-3.5" />
          {saving ? "Saving" : "Save"}
        </Button>
      </header>
      <div className="flex min-h-0 flex-1">
        <EditorDnd>
          <div className={cn("contents", dark && "dark")}>
            <LibrarySidebar />
          </div>
          <EditorCanvas />
          <div className={cn("contents", dark && "dark")}>
            <Inspector />
          </div>
        </EditorDnd>
      </div>
    </div>
  );
}
