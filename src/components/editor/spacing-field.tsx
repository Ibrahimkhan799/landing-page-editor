"use client";

import { useState } from "react";
import { Link2, Unlink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { BoxEdges } from "@/lib/types";
import { emptyBox } from "@/lib/styles";

const edges = ["top", "right", "bottom", "left"] as const;

export function SpacingField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: Partial<BoxEdges>;
  onChange: (value: BoxEdges) => void;
}) {
  const box: BoxEdges = { ...emptyBox(), ...value };
  const [linked, setLinked] = useState(box.top === box.right && box.right === box.bottom && box.bottom === box.left);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setLinked((current) => !current)}>
          {linked ? <Link2 className="size-3.5" /> : <Unlink className="size-3.5" />}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {edges.map((edge) => (
          <div key={edge} className="grid gap-1">
            <span className="text-[10px] uppercase text-muted-foreground">{edge}</span>
            <Input
              value={box[edge]}
              placeholder="0px"
              onChange={(event) => {
                const nextValue = event.target.value;
                if (linked) {
                  onChange({ top: nextValue, right: nextValue, bottom: nextValue, left: nextValue });
                  return;
                }
                onChange({ ...box, [edge]: nextValue });
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
