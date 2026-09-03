"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLink, Monitor, Smartphone, Tablet, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { EditorCanvas } from "@/components/editor/canvas";
import { useEditor } from "@/components/editor/editor-context";
import { Inspector } from "@/components/editor/inspector";
import { LibrarySidebar } from "@/components/editor/library-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EditorShell() {
  const { page, updatePage, dirty, saving, save } = useEditor();
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  async function persist() {
    try {
      await save();
      toast.success("Page saved");
    } catch {
      toast.error("Could not save page");
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin">
            <ArrowLeft className="size-4" />
            Studio
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <Input
            value={page.name}
            onChange={(event) => updatePage({ name: event.target.value })}
            className="h-8 max-w-xs border-transparent bg-transparent px-2 font-medium shadow-none focus-visible:border-input"
          />
        </div>
        <Badge variant={page.status === "published" ? "default" : "secondary"}>{page.status}</Badge>
        {dirty ? <span className="text-xs text-muted-foreground">Unsaved</span> : null}
        <div className="flex rounded-md border p-0.5">
          {(
            [
              ["desktop", Monitor],
              ["tablet", Tablet],
              ["mobile", Smartphone],
            ] as const
          ).map(([value, Icon]) => (
            <Button
              key={value}
              size="icon"
              variant={device === value ? "secondary" : "ghost"}
              className="h-8 w-8"
              onClick={() => setDevice(value)}
            >
              <Icon className="size-4" />
            </Button>
          ))}
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/p/${page.slug}`} target="_blank">
            <ExternalLink className="size-4" />
            View live
          </Link>
        </Button>
        <Button size="sm" onClick={persist} disabled={saving}>
          <Save className="size-4" />
          {saving ? "Saving…" : "Save"}
        </Button>
      </header>
      <div className="flex min-h-0 flex-1">
        <LibrarySidebar />
        <EditorCanvas device={device} />
        <Inspector />
      </div>
    </div>
  );
}
