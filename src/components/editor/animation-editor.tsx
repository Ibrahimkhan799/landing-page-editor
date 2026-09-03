"use client";

import { Play } from "lucide-react";
import { SliderRow } from "@/components/editor/compact-controls";
import { playNodeAnimation } from "@/components/landing/animate";
import {
  ANIMATION_EASINGS,
  ANIMATION_PRESETS,
  ANIMATION_TRIGGERS,
  defaultAnimation,
  isTextAnimation,
  needsDistance,
} from "@/lib/animations";
import type { AnimationConfig, AnimationPreset, AnimationTrigger, NodeMeta } from "@/lib/types";
import { cn } from "@/lib/utils";

const groups = ["Appear", "Move", "Text"] as const;

export function AnimationEditor({
  node,
  onChange,
}: {
  node: NodeMeta & { id?: string };
  onChange: (animation: AnimationConfig | null) => void;
}) {
  const anim = node.animation ?? null;

  function patch(next: Partial<AnimationConfig>) {
    onChange({ ...(anim ?? defaultAnimation()), ...next });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Motion</p>
        {anim ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="grid size-5 place-items-center rounded-[3px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
              title="Preview"
              onClick={() => node.id && playNodeAnimation(node.id)}
            >
              <Play className="size-3 fill-current" />
            </button>
            <button type="button" className="text-[10px] text-zinc-400 hover:text-zinc-700" onClick={() => onChange(null)}>
              None
            </button>
          </div>
        ) : null}
      </div>

      <div>
        <p className="mb-1 text-[10px] uppercase tracking-wide text-zinc-400">Trigger</p>
        <div className="grid grid-cols-4 gap-0.5 rounded-md bg-zinc-100 p-0.5">
          {ANIMATION_TRIGGERS.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.hint}
              onClick={() => patch({ trigger: item.id as AnimationTrigger, preset: anim?.preset ?? "fade-in" })}
              className={cn(
                "h-6 rounded text-[10px] font-medium",
                (anim?.trigger ?? "in-view-replay") === item.id && anim
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[10px] leading-4 text-zinc-400">
          {ANIMATION_TRIGGERS.find((item) => item.id === (anim?.trigger ?? "in-view-replay"))?.hint}
        </p>
      </div>

      {groups.map((group) => (
        <div key={group}>
          <p className="mb-1 text-[10px] uppercase tracking-wide text-zinc-400">{group}</p>
          <div className="grid grid-cols-2 gap-1">
            {ANIMATION_PRESETS.filter((item) => item.group === group).map((item) => {
              const active = anim?.preset === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => patch({ preset: item.id, trigger: anim?.trigger ?? "in-view-replay" })}
                  className={cn(
                    "flex h-14 flex-col items-start justify-between rounded-md px-2 py-1.5 text-left",
                    active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200/70",
                  )}
                >
                  <PresetMark preset={item.id} active={active} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {anim ? (
        <div className="space-y-2 border-t border-zinc-100 pt-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">Timing</p>
          <div className="h-8 overflow-hidden rounded-sm bg-zinc-100">
            <div
              className="h-full bg-zinc-300/80"
              style={{
                width: `${Math.min(100, (anim.duration / 2) * 100)}%`,
                marginLeft: `${Math.min(70, anim.delay * 20)}%`,
              }}
            />
          </div>
          <SliderRow
            label="Time"
            value={anim.duration}
            min={0.1}
            max={3}
            step={0.05}
            suffix="s"
            onChange={(duration) => patch({ duration })}
          />
          <SliderRow
            label="Delay"
            value={anim.delay}
            min={0}
            max={2}
            step={0.05}
            suffix="s"
            onChange={(delay) => patch({ delay })}
          />
          {needsDistance(anim.preset) ? (
            <SliderRow
              label="Move"
              value={anim.distance}
              min={4}
              max={80}
              suffix="px"
              onChange={(distance) => patch({ distance })}
            />
          ) : null}
          {isTextAnimation(anim.preset) ? (
            <SliderRow
              label="Stagger"
              value={anim.stagger}
              min={0}
              max={0.2}
              step={0.005}
              suffix="s"
              onChange={(stagger) => patch({ stagger })}
            />
          ) : null}
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wide text-zinc-400">Easing</span>
            <select
              value={anim.easing}
              onChange={(event) => patch({ easing: event.target.value as AnimationConfig["easing"] })}
              className="h-5 rounded-[3px] border-0 bg-zinc-100 px-1.5 text-[11px] text-zinc-700 outline-none"
            >
              {ANIMATION_EASINGS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <p className="text-[11px] leading-4 text-zinc-400">Choose a trigger and effect. In view replays every time the layer enters the viewport.</p>
      )}
    </div>
  );
}

function PresetMark({ preset, active }: { preset: AnimationPreset; active: boolean }) {
  return (
    <span
      className={cn("block h-5 w-full rounded-[3px]", active ? "bg-white/20" : "bg-white")}
      style={{
        boxShadow:
          preset === "fade-in" || preset === "text-fade"
            ? "inset 0 0 0 1px rgba(0,0,0,0.06)"
            : preset.includes("slide")
              ? "2px 2px 0 rgba(0,0,0,0.08)"
              : preset.includes("blur")
                ? "0 0 6px rgba(0,0,0,0.12)"
                : "0 1px 0 rgba(0,0,0,0.08)",
        transform: preset === "scale-in" ? "scale(0.86)" : undefined,
      }}
    />
  );
}
