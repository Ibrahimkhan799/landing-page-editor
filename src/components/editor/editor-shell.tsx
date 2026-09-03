"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ExternalLink, Monitor, Smartphone, Tablet, Save, ArrowLeft } from "lucide-react";
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

export function EditorShell() {
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
  } = useEditor();

  useEffect(() => {
    if (selectedElement?.type !== "button") setPreviewState("default");
  }, [selectedElement, setPreviewState]);

  async function persist() {
    try {
      await save();
      toast.success("Page saved");
    } catch {
      toast.error("Could not save page");
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;
      const meta = event.metaKey || event.ctrlKey;
      if (event.key === "Escape") {
        setSelection({ kind: "page" });
        setPreviewState("default");
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedSection) {
        event.preventDefault();
        if (selectedRefs.length) {
          for (const ref of selectedRefs) removeElement(ref.sectionId, ref.elementId);
        } else {
          removeSection(selectedSection.id);
        }
        return;
      }
      if (meta && event.key.toLowerCase() === "d" && selectedSection) {
        event.preventDefault();
        if (selectedElement) duplicateElement(selectedSection.id, selectedElement.id);
        else duplicateSection(selectedSection.id);
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
  ]);

  return (
    <div className="editor-ui flex h-screen flex-col bg-white text-zinc-900">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-zinc-200 px-2">
        <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-zinc-600">
          <Link href="/admin">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <Input
            value={page.name}
            onChange={(event) => updatePage({ name: event.target.value })}
            className="h-7 max-w-xs border-transparent bg-transparent px-1.5 text-sm font-medium shadow-none focus-visible:border-zinc-200"
          />
        </div>
        {dirty ? <span className="text-[11px] text-zinc-400">Unsaved</span> : null}
        <div className="flex rounded-md bg-zinc-100 p-0.5">
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
                breakpoint === value && "bg-white text-zinc-900 shadow-sm",
              )}
              onClick={() => setBreakpoint(value as Breakpoint)}
            >
              <Icon className="size-3.5" />
            </button>
          ))}
        </div>
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
        <Button size="sm" className="h-8 px-3" onClick={persist} disabled={saving}>
          <Save className="size-3.5" />
          {saving ? "Saving" : "Save"}
        </Button>
      </header>
      <div className="flex min-h-0 flex-1">
        <EditorDnd>
          <LibrarySidebar />
          <EditorCanvas />
          <Inspector />
        </EditorDnd>
      </div>
    </div>
  );
}
