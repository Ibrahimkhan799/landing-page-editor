"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LandingPage } from "@/lib/types";

export function CreatePageDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");

  async function createPage() {
    const response = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, clientName }),
    });
    if (!response.ok) {
      toast.error("Could not create page");
      return;
    }
    const page = (await response.json()) as LandingPage;
    toast.success("Landing page created");
    setOpen(false);
    setName("");
    setClientName("");
    router.push(`/admin/editor/${page.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          New page
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a client landing page</DialogTitle>
          <DialogDescription>
            Starts with a navbar, hero, and footer. Add the rest in the editor.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>Page name</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Summit Dental" />
          </div>
          <div className="grid gap-1.5">
            <Label>Client</Label>
            <Input
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              placeholder="Summit Dental Group"
            />
          </div>
          <Button onClick={createPage}>Create and open editor</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
