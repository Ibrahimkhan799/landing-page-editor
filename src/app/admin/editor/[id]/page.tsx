import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
import { EditorProvider } from "@/components/editor/editor-context";
import { EditorShell } from "@/components/editor/editor-shell";
import { getPage } from "@/lib/store";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const page = await getPage(id);
  if (!page) notFound();

  return (
    <EditorProvider initialPage={page}>
      <EditorShell />
    </EditorProvider>
  );
}
