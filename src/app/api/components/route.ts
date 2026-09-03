import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { listComponents, saveComponent } from "@/lib/store";
import type { PageSection } from "@/lib/types";

export async function GET() {
  return NextResponse.json(await listComponents());
}

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string; section?: PageSection };
  if (!body.section) {
    return NextResponse.json({ error: "Section required" }, { status: 400 });
  }
  const section: Omit<PageSection, "id"> = {
    type: body.section.type,
    name: body.section.name,
    props: body.section.props,
    slots: body.section.slots,
    className: body.section.className,
    htmlId: body.section.htmlId,
    styles: body.section.styles,
    elements: body.section.elements,
  };
  const saved = await saveComponent({
    id: nanoid(10),
    name: body.name?.trim() || section.name || "Saved component",
    createdAt: new Date().toISOString(),
    section,
  });
  return NextResponse.json(saved, { status: 201 });
}
