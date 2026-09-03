import Link from "next/link";
import { listPages } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreatePageDialog } from "@/components/admin/create-page-dialog";
import { DeletePageButton } from "@/components/admin/delete-page-button";
import { Pencil, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const pages = await listPages();

  return (
    <div className="min-h-full bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <Link href="/" className="text-xs font-medium text-muted-foreground hover:text-foreground">
              ← Northstar
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">Client pages</h1>
            <p className="text-sm text-muted-foreground">
              Create a landing page per client, then open the visual CMS.
            </p>
          </div>
          <CreatePageDialog />
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-4 px-6 py-8 md:grid-cols-2">
        {pages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pages yet. Create your first client site.</p>
        ) : null}
        {pages.map((page) => (
          <Card key={page.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{page.name}</CardTitle>
                  <CardDescription>
                    {page.clientName} · /p/{page.slug}
                  </CardDescription>
                </div>
                <Badge variant={page.status === "published" ? "default" : "secondary"}>{page.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href={`/admin/editor/${page.id}`}>
                  <Pencil className="size-4" />
                  Edit
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/p/${page.slug}`} target="_blank">
                  <ExternalLink className="size-4" />
                  Live
                </Link>
              </Button>
              <DeletePageButton id={page.id} />
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
