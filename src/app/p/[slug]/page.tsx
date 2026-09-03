import { notFound } from "next/navigation";
import { PageRenderer } from "@/components/landing/page-renderer";
import { getPageBySlug } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function PublishedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page) notFound();

  return <PageRenderer page={page} />;
}
