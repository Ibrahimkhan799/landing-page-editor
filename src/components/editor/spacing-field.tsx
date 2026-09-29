"use client";

import { useState } from "react";
import { Link2, Unlink } from "lucide-react";
import { LengthInput } from "@/components/editor/compact-controls";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { BoxEdges } from "@/lib/types";
import { emptyBox } from "@/lib/styles";

const edges = [
  { id: "top", short: "T" },
  { id: "right", short: "R" },
  { id: "bottom", short: "B" },
  { id: "left", short: "L" },
] as const;

type BoxSpacingFieldProps = {
  label: string;
  value?: Partial<BoxEdges>;
  onChange: (value: BoxEdges) => void;
  placeholder?: string;
  extraActions?: React.ReactNode;
};

function BoxSpacingField({ label, value, onChange, placeholder = "0px", extraActions }: BoxSpacingFieldProps) {
  const box: BoxEdges = { ...emptyBox(), ...value };
  const autoLinked = box.top === box.right && box.right === box.bottom && box.bottom === box.left;
  const [linkedOverride, setLinkedOverride] = useState<boolean | null>(null);
  const linked = linkedOverride ?? autoLinked;

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[11px] text-zinc-500">{label}</Label>
        <div className="flex items-center gap-1">
          {extraActions}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            title={linked ? `Unlink ${label.toLowerCase()} edges` : `Link ${label.toLowerCase()} edges`}
            aria-label={linked ? `Unlink ${label.toLowerCase()} edges` : `Link ${label.toLowerCase()} edges`}
            aria-pressed={linked}
            onClick={() => setLinkedOverride((current) => !(current ?? autoLinked))}
          >
            {linked ? <Link2 className="size-3" /> : <Unlink className="size-3" />}
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {edges.map((edge) => (
          <LengthInput
            key={edge.id}
            value={box[edge.id]}
            placeholder={placeholder}
            allowAuto={label === "Margin"}
            prefix={edge.short}
            ariaLabel={`${label} ${edge.id}`}
            onChange={(nextValue) => {
              if (linked) {
                onChange({ top: nextValue, right: nextValue, bottom: nextValue, left: nextValue });
                return;
              }
              onChange({ ...box, [edge.id]: nextValue });
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function PaddingField({ value, onChange }: { value?: Partial<BoxEdges>; onChange: (value: BoxEdges) => void }) {
  return <BoxSpacingField label="Padding" value={value} onChange={onChange} placeholder="0px" />;
}

export function MarginField({ value, onChange }: { value?: Partial<BoxEdges>; onChange: (value: BoxEdges) => void }) {
  const box: BoxEdges = { ...emptyBox(), ...value };
  return (
    <BoxSpacingField
      label="Margin"
      value={value}
      onChange={onChange}
      placeholder="0px or auto"
      extraActions={
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-[10px]"
          title="Center horizontally with auto margins"
          onClick={() => onChange({ ...box, left: "auto", right: "auto" })}
        >
          Center X
        </Button>
      }
    />
  );
}
