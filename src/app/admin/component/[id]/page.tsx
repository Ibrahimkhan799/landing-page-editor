import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

import { ComponentEditorClient } from "@/components/editor/component-editor-client";
import { getComponent } from "@/lib/store";
import { defaultTheme } from "@/lib/defaults";
import type { LandingPage } from "@/lib/types";

export default async function ComponentEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const component = await getComponent(id);
  if (!component) notFound();

  const page: LandingPage = {
    id: `component-${component.id}`,
    name: component.name,
    slug: `component-${component.id}`,
    clientName: "Component",
    status: "draft",
    theme: defaultTheme(),
    sections: [{ ...component.section, id: component.id, componentId: component.id }],
    createdAt: component.createdAt,
    updatedAt: component.createdAt,
  };

  return <ComponentEditorClient componentId={component.id} initialPage={page} />;
}
