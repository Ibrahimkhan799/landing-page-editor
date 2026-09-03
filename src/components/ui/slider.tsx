"use client";

import type { ComponentProps } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

function Slider({ className, ...props }: ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      className={cn("relative flex h-3 w-full touch-none items-center select-none", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-px w-full grow overflow-visible rounded-full bg-zinc-200">
        <SliderPrimitive.Range className="absolute h-px bg-zinc-900" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-2 rounded-full border border-zinc-900 bg-white shadow-none focus-visible:outline-none" />
    </SliderPrimitive.Root>
  );
}

export { Slider };
