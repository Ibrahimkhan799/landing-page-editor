"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function DeletePageButton({ id }: { id: string }) {
  const router = useRouter();

  async function remove() {
    if (!window.confirm("Delete this landing page?")) return;
    await fetch(`/api/pages/${id}`, { method: "DELETE" });
    toast.success("Page deleted");
    router.refresh();
  }

  return (
    <Button size="sm" variant="ghost" onClick={remove}>
      <Trash2 className="size-4" />
      Delete
    </Button>
  );
}
