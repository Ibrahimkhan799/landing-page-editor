"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { STOCK_MEDIA } from "@/lib/styles";

export function MediaPicker({
  label,
  value,
  kind = "image",
  onChange,
}: {
  label: string;
  value: string;
  kind?: "image" | "video";
  onChange: (src: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(value);

  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange(reader.result);
        setOpen(false);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="grid gap-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {value ? (
        kind === "video" ? (
          <video src={value} className="h-24 w-full rounded-md object-cover" muted />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-24 w-full rounded-md object-cover" />
        )
      ) : (
        <div className="grid h-24 place-items-center rounded-md border text-xs text-muted-foreground">
          No media
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            Choose media
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Media picker</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Upload</Label>
              <Input
                type="file"
                accept={kind === "video" ? "video/*" : "image/*"}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) readFile(file);
                }}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>URL</Label>
              <div className="flex gap-2">
                <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" />
                <Button
                  onClick={() => {
                    onChange(url);
                    setOpen(false);
                  }}
                >
                  Use
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Library</Label>
              <div className="grid grid-cols-3 gap-2">
                {STOCK_MEDIA.filter((item) => item.type === kind).map((item) => (
                  <button
                    key={item.src}
                    type="button"
                    className="overflow-hidden rounded-md border"
                    onClick={() => {
                      onChange(item.src);
                      setOpen(false);
                    }}
                  >
                    {item.type === "video" ? (
                      <div className="grid h-16 place-items-center bg-muted text-[10px]">{item.label}</div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.src} alt={item.label} className="h-16 w-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
