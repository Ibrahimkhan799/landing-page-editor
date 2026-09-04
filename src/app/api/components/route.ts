import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createBlankBlockSection } from "@/lib/defaults";
import { listComponents, saveComponent } from "@/lib/store";
import type { PageSection } from "@/lib/types";

export async function GET() {
  return NextResponse.json(await listComponents());
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    section?: PageSection;
    blank?: boolean;
  };

  let sectionSource: Omit<PageSection, "id">;
  if (body.section) {
    sectionSource = {
      type: body.section.type,
      name: body.section.name,
      props: body.section.props,
      slots: body.section.slots,
      className: body.section.className,
      htmlId: body.section.htmlId,
      styles: body.section.styles,
      responsive: body.section.responsive,
      states: body.section.states,
      elements: body.section.elements,
      animation: body.section.animation,
      slotOverrides: undefined,
    };
  } else if (body.blank || !body.section) {
    const blank = createBlankBlockSection({ name: body.name?.trim() || "New component" });
    const { id: _id, ...rest } = blank;
    sectionSource = rest;
  } else {
    return NextResponse.json({ error: "Section required" }, { status: 400 });
  }

  const saved = await saveComponent({
    id: nanoid(10),
    name: body.name?.trim() || sectionSource.name || "Saved component",
    createdAt: new Date().toISOString(),
    section: sectionSource,
  });
  return NextResponse.json(saved, { status: 201 });
}
