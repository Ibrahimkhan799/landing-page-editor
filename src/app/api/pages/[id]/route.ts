import { NextResponse } from "next/server";
import { deletePage, getPage, savePage } from "@/lib/store";
import type { LandingPage } from "@/lib/types";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = await getPage(id);
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(page);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await getPage(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await request.json()) as LandingPage;
  const saved = await savePage({ ...existing, ...body, id });
  return NextResponse.json(saved);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deletePage(id);
  return NextResponse.json({ ok: true });
}
