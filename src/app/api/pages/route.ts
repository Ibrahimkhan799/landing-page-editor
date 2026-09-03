import { NextResponse } from "next/server";
import { createBlankPage } from "@/lib/defaults";
import { listPages, savePage } from "@/lib/store";
import { slugify } from "@/lib/utils";

export async function GET() {
  const pages = await listPages();
  return NextResponse.json(pages);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    clientName?: string;
    slug?: string;
  };
  const name = body.name?.trim() || "New landing page";
  const clientName = body.clientName?.trim() || "Client";
  const slug = slugify(body.slug || name) || "landing-page";
  const page = createBlankPage({ name, clientName, slug });
  const saved = await savePage(page);
  return NextResponse.json(saved, { status: 201 });
}
