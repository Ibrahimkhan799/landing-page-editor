"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { useEditor } from "@/components/editor/editor-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MAX_PAGE_IMPORT_BYTES,
  pageFileStem,
  parsePageImport,
  serializePageHtml,
  serializePageJson,
  serializePageSource,
  serializeStandalonePageSource,
  type PageSourceFormat,
  type StandaloneSourceFormat,
} from "@/lib/page-transfer";

type ExportFormat =
  | "json"
  | "html"
  | StandaloneSourceFormat
  | `project-${PageSourceFormat}`;

const FORMAT_LABELS: Record<ExportFormat, string> = {
  json: "Versioned JSON",
  html: "Standalone HTML",
  "standalone-jsx": "Standalone React JSX",
  "standalone-tsx": "Standalone React TSX",
  "project-jsx": "Project-compatible JSX",
  "project-tsx": "Project-compatible TSX",
};

function downloadText(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function PageTransferControls() {
  const { page, replacePage, editorMode } = useEditor();
  const [format, setFormat] = useState<ExportFormat>("json");
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (editorMode !== "page") return null;

  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      if (file.size > MAX_PAGE_IMPORT_BYTES) {
        throw new Error(`Page JSON exceeds the ${MAX_PAGE_IMPORT_BYTES / 1024 / 1024} MB import limit`);
      }
      const importedPage = parsePageImport(await file.text());
      const confirmed = window.confirm(
        `Replace the current editor page with “${importedPage.name}” (${importedPage.sections.length} sections)?\n\n` +
          "The current page ID and creation date will be preserved. This change remains unsaved until you click Save.",
      );
      if (!confirmed) return;
      replacePage(importedPage);
      toast.success("Page imported — save to persist changes");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not import page JSON");
    } finally {
      input.value = "";
    }
  }

  async function exportPage() {
    const stem = pageFileStem(page);
    setExporting(true);
    try {
      if (format === "json") {
        downloadText(`${stem}.landing-page.json`, serializePageJson(page), "application/json;charset=utf-8");
      } else if (format === "project-jsx" || format === "project-tsx") {
        const sourceFormat = format === "project-jsx" ? "jsx" : "tsx";
        downloadText(
          `${stem}.project.${sourceFormat}`,
          serializePageSource(page, sourceFormat),
          sourceFormat === "jsx" ? "text/jsx;charset=utf-8" : "text/tsx;charset=utf-8",
        );
      } else {
        const exportRoot = document.querySelector<HTMLElement>("[data-page-export-root]");
        if (!exportRoot) throw new Error("The page export root is not available");
        if (format === "html") {
          downloadText(`${stem}.html`, await serializePageHtml(page, exportRoot), "text/html;charset=utf-8");
        } else {
          const extension = format === "standalone-jsx" ? "jsx" : "tsx";
          downloadText(
            `${stem}.${extension}`,
            await serializeStandalonePageSource(page, exportRoot, format),
            extension === "jsx" ? "text/jsx;charset=utf-8" : "text/tsx;charset=utf-8",
          );
        }
      }
      toast.success(`${FORMAT_LABELS[format]} downloaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not export page");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
      <div>
        <h4 className="text-xs font-semibold">Import / export</h4>
        <p className="mt-1 text-[11px] leading-4 text-zinc-500">
          Import Northstar page JSON or export the current unsaved editor state.
        </p>
      </div>

      <Input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(event) => void importJson(event)}
      />
      <Button type="button" variant="outline" size="sm" className="h-7 w-full text-[11px]" onClick={() => fileInputRef.current?.click()}>
        <Upload className="size-3.5" />
        Import JSON
      </Button>

      <div className="grid gap-1">
        <Label className="text-[11px] text-zinc-500">Export format</Label>
        <Select value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="json">Versioned JSON</SelectItem>
            <SelectItem value="html">Standalone HTML</SelectItem>
            <SelectItem value="standalone-jsx">Standalone React JSX</SelectItem>
            <SelectItem value="standalone-tsx">Standalone React TSX</SelectItem>
            <SelectItem value="project-jsx">Project-compatible JSX</SelectItem>
            <SelectItem value="project-tsx">Project-compatible TSX</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        type="button"
        size="sm"
        className="h-7 w-full text-[11px]"
        disabled={exporting}
        onClick={() => void exportPage()}
      >
        <Download className="size-3.5" />
        {exporting ? "Preparing export…" : `Download ${FORMAT_LABELS[format]}`}
      </Button>
    </div>
  );
}
