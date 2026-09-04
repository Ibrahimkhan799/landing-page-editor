"use client";

import { useCallback } from "react";
import { EditorProvider } from "@/components/editor/editor-context";
import { EditorShell } from "@/components/editor/editor-shell";
import type { LandingPage } from "@/lib/types";

export function ComponentEditorClient({
  componentId,
  initialPage,
}: {
  componentId: string;
  initialPage: LandingPage;
}) {
  const persistPage = useCallback(
    async (page: LandingPage) => {
      const section = page.sections[0];
      if (!section) throw new Error("Component has no section");
      const response = await fetch(`/api/components/${componentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: page.name,
          section: { ...section, componentId: undefined },
        }),
      });
      if (!response.ok) throw new Error("Save failed");
      const saved = await response.json();
      return {
        ...page,
        name: saved.name,
        sections: [{ ...saved.section, id: componentId, componentId }],
        updatedAt: new Date().toISOString(),
      } satisfies LandingPage;
    },
    [componentId],
  );

  return (
    <EditorProvider initialPage={initialPage} persistPage={persistPage} mode="component">
      <EditorShell />
    </EditorProvider>
  );
}
