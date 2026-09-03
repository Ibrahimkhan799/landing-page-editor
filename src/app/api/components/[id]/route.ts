import { NextResponse } from "next/server";
import { deleteComponent, getComponent, saveComponent } from "@/lib/store";
import type { PageSection } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const component = await getComponent(id);
  if (!component) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(component);
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const existing = await getComponent(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await request.json()) as { name?: string; section?: PageSection };
  const sectionSource = body.section ?? existing.section;
  const saved = await saveComponent({
    ...existing,
    name: body.name?.trim() || existing.name,
    section: {
      type: sectionSource.type,
      name: sectionSource.name,
      props: sectionSource.props,
      slots: sectionSource.slots,
      className: sectionSource.className,
      htmlId: sectionSource.htmlId,
      styles: sectionSource.styles,
      responsive: sectionSource.responsive,
      states: sectionSource.states,
      elements: sectionSource.elements,
      animation: sectionSource.animation,
    },
  });
  return NextResponse.json(saved);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await deleteComponent(id);
  return NextResponse.json({ ok: true });
}
