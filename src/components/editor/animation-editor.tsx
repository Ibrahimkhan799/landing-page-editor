"use client";

import { Play, Trash2 } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { SliderRow } from "@/components/editor/compact-controls";
import { playNodeAnimation } from "@/components/landing/animate";
import {
  ANIMATION_EASINGS,
  ANIMATION_PRESETS,
  ANIMATION_TRIGGERS,
  animationTracks,
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
  const [picking, setPicking] = useState(!anim);

  function patch(next: Partial<AnimationConfig>) {
    onChange({ ...(anim ?? defaultAnimation()), ...next });
    setPicking(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Effects</p>
        {anim ? (
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              className="grid size-5 place-items-center rounded-[3px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
              title="Preview"
              onClick={() => node.id && playNodeAnimation(node.id)}
            >
              <Play className="size-3 fill-current" />
            </button>
            <button
              type="button"
              className="grid size-5 place-items-center rounded-[3px] text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800"
              title="Remove"
              onClick={() => {
                onChange(null);
                setPicking(true);
              }}
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ) : null}
      </div>

      <section className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-wide text-zinc-400">Trigger</p>
        <div className="grid grid-cols-2 gap-0.5 rounded-md bg-zinc-100 p-0.5">
          {ANIMATION_TRIGGERS.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.hint}
              onClick={() => patch({ trigger: item.id as AnimationTrigger, preset: anim?.preset ?? "fade-in" })}
              className={cn(
                "h-6 rounded-[4px] text-[10px] font-medium",
                (anim?.trigger ?? "in-view-replay") === item.id && anim
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] leading-4 text-zinc-400">
          {ANIMATION_TRIGGERS.find((item) => item.id === (anim?.trigger ?? "in-view-replay"))?.hint}
        </p>
      </section>

      {anim && !picking ? (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="flex w-full items-center gap-2 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-left hover:border-zinc-300"
        >
          <PreviewGlyph preset={anim.preset} active />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-medium text-zinc-800">
              {ANIMATION_PRESETS.find((item) => item.id === anim.preset)?.label}
            </span>
            <span className="block text-[10px] text-zinc-400">
              {ANIMATION_TRIGGERS.find((item) => item.id === anim.trigger)?.label}
            </span>
          </span>
          <span className="text-[10px] text-zinc-400">Change</span>
        </button>
      ) : (
        <EffectLibrary
          active={anim?.preset}
          onPick={(preset) => patch({ preset, trigger: anim?.trigger ?? "in-view-replay" })}
        />
      )}

      {anim ? (
        <div className="space-y-3 border-t border-zinc-100 pt-3">
          <PreviewStage preset={anim.preset} anim={anim} />
          <Timeline anim={anim} />
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wide text-zinc-400">From</p>
            <FromValues preset={anim.preset} distance={anim.distance} />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wide text-zinc-400">Transition</p>
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
        </div>
      ) : (
        <p className="text-[11px] leading-4 text-zinc-400">
          Add an effect, then choose when it plays. In view replays every time the layer enters the viewport.
        </p>
      )}
    </div>
  );
}

function EffectLibrary({
  active,
  onPick,
}: {
  active?: AnimationPreset;
  onPick: (preset: AnimationPreset) => void;
}) {
  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <div key={group}>
          <p className="mb-1 text-[10px] uppercase tracking-wide text-zinc-400">{group}</p>
          <div className="overflow-hidden rounded-md border border-zinc-200">
            {ANIMATION_PRESETS.filter((item) => item.group === group).map((item, index) => {
              const selected = active === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onPick(item.id)}
                  className={cn(
                    "flex h-8 w-full items-center gap-2 px-1.5 text-left",
                    index > 0 && "border-t border-zinc-100",
                    selected ? "bg-zinc-900 text-white" : "bg-white text-zinc-700 hover:bg-zinc-50",
                  )}
                >
                  <PreviewGlyph preset={item.id} active={selected} />
                  <span className="text-[11px] font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Timeline({ anim }: { anim: AnimationConfig }) {
  const total = Math.max(2, anim.delay + anim.duration + 0.35);
  const ticks = [0, 0.5, 1, 1.5, 2, 2.5, 3].filter((tick) => tick <= total + 0.01);
  const tracks = animationTracks(anim.preset);
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-wide text-zinc-400">Timeline</p>
      <div className="rounded-md border border-zinc-200 bg-zinc-50/80 p-1.5">
        <div className="mb-1 flex justify-between font-mono text-[9px] text-zinc-400">
          {ticks.map((tick) => (
            <span key={tick}>{tick === 0 ? "0s" : `${tick}`}</span>
          ))}
        </div>
        <div className="space-y-1">
          {tracks.map((track) => (
            <div key={track.id} className="flex items-center gap-1.5">
              <span className="w-10 shrink-0 text-[9px] uppercase tracking-wide text-zinc-400">{track.label}</span>
              <div className="relative h-3 flex-1 overflow-hidden rounded-[3px] bg-white ring-1 ring-zinc-200">
                <div
                  className="absolute inset-y-0.5 rounded-[2px]"
                  style={{
                    left: `${(anim.delay / total) * 100}%`,
                    width: `${Math.max(8, (anim.duration / total) * 100)}%`,
                    background: track.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FromValues({ preset, distance }: { preset: AnimationPreset; distance: number }) {
  const items = [
    { label: "Opacity", value: preset === "fade-out" ? "100%" : "0%" },
    needsDistance(preset) ? { label: preset.includes("left") || preset.includes("right") ? "X" : "Y", value: `${distance}px` } : null,
    preset === "scale-in" ? { label: "Scale", value: "92%" } : null,
    preset.includes("blur") ? { label: "Blur", value: "12px" } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="grid grid-cols-2 gap-1">
      {items.map((item) => (
        <div key={item.label} className="flex h-6 items-center justify-between rounded-[3px] bg-zinc-100 px-1.5">
          <span className="text-[10px] text-zinc-400">{item.label}</span>
          <span className="font-mono text-[10px] text-zinc-700">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function PreviewStage({ preset, anim }: { preset: AnimationPreset; anim: AnimationConfig }) {
  return (
    <div className="overflow-hidden rounded-md border border-zinc-200 bg-[linear-gradient(45deg,#f4f4f5_25%,transparent_25%,transparent_75%,#f4f4f5_75%),linear-gradient(45deg,#f4f4f5_25%,white_25%,white_75%,#f4f4f5_75%)] bg-[length:10px_10px] bg-[position:0_0,5px_5px]">
      <div className="flex h-16 items-center justify-center">
        {isTextAnimation(preset) ? (
          <span className="flex gap-0.5 text-[11px] font-medium text-zinc-700">
            {["In", "view"].map((word, index) => (
              <span
                key={word}
                className="lp-anim-unit"
                style={
                  {
                    "--lp-unit-i": index,
                    animation: `${preset === "text-blur" ? "lp-blur-in" : preset === "text-slide" ? "lp-slide-up" : "lp-fade-in"} ${anim.duration}s ${anim.easing} ${anim.delay + index * anim.stagger}s infinite both`,
                  } as CSSProperties
                }
              >
                {word}
              </span>
            ))}
          </span>
        ) : (
          <span
            className="block h-7 w-16 rounded-[4px] bg-zinc-800"
            style={{
              animation: `${keyframeName(preset)} ${anim.duration}s ${anim.easing} ${anim.delay}s infinite both`,
              ["--lp-anim-distance" as string]: `${anim.distance}px`,
            }}
          />
        )}
      </div>
    </div>
  );
}

function PreviewGlyph({ preset, active }: { preset: AnimationPreset; active?: boolean }) {
  return (
    <span
      className={cn(
        "grid size-6 shrink-0 place-items-center overflow-hidden rounded-[3px]",
        active ? "bg-white/15" : "bg-zinc-100",
      )}
    >
      <span
        className={cn("block h-2.5 w-3.5 rounded-[2px]", active ? "bg-white" : "bg-zinc-700")}
        style={{
          animation: `${keyframeName(preset)} 1.6s ease-out infinite both`,
          ["--lp-anim-distance" as string]: "6px",
        }}
      />
    </span>
  );
}

function keyframeName(preset: AnimationPreset) {
  if (preset === "text-fade" || preset === "fade-in") return "lp-fade-in";
  if (preset === "fade-out") return "lp-fade-out";
  if (preset.includes("blur")) return "lp-blur-in";
  if (preset === "scale-in") return "lp-scale-in";
  if (preset.includes("down")) return "lp-slide-down";
  if (preset.includes("left")) return "lp-slide-left";
  if (preset.includes("right")) return "lp-slide-right";
  return "lp-slide-up";
}
