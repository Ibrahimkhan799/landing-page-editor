import type { AnimationConfig, AnimationPreset, AnimationTrigger } from "@/lib/types";

export const ANIMATION_TRIGGERS: { id: AnimationTrigger; label: string; hint: string }[] = [
  { id: "in-view-replay", label: "In view", hint: "Plays each time it enters, resets when it leaves" },
  { id: "in-view", label: "Once", hint: "Plays the first time it enters the viewport" },
  { id: "load", label: "On load", hint: "Plays when the page loads" },
  { id: "loop", label: "Loop", hint: "Repeats while the element is visible" },
];

export const ANIMATION_PRESETS: {
  id: AnimationPreset;
  label: string;
  group: "Appear" | "Move" | "Text";
}[] = [
  { id: "fade-in", label: "Fade in", group: "Appear" },
  { id: "fade-out", label: "Fade out", group: "Appear" },
  { id: "blur-in", label: "Blur in", group: "Appear" },
  { id: "scale-in", label: "Scale in", group: "Appear" },
  { id: "slide-up", label: "Slide up", group: "Move" },
  { id: "slide-down", label: "Slide down", group: "Move" },
  { id: "slide-left", label: "Slide left", group: "Move" },
  { id: "slide-right", label: "Slide right", group: "Move" },
  { id: "text-fade", label: "Text fade", group: "Text" },
  { id: "text-slide", label: "Text slide", group: "Text" },
  { id: "text-blur", label: "Text blur", group: "Text" },
];

export const ANIMATION_EASINGS = [
  { id: "ease-out", label: "Ease out" },
  { id: "ease-in", label: "Ease in" },
  { id: "ease-in-out", label: "Ease in-out" },
  { id: "ease", label: "Ease" },
  { id: "linear", label: "Linear" },
] as const;

export function defaultAnimation(preset: AnimationPreset = "fade-in"): AnimationConfig {
  return {
    preset,
    trigger: "in-view-replay",
    duration: 0.7,
    delay: 0,
    easing: "ease-out",
    distance: 28,
    stagger: 0.045,
  };
}

export function isTextAnimation(preset?: AnimationPreset) {
  return preset === "text-fade" || preset === "text-slide" || preset === "text-blur";
}

export function needsDistance(preset?: AnimationPreset) {
  return Boolean(preset && (preset.startsWith("slide") || preset === "text-slide"));
}

export function animationTracks(preset: AnimationPreset) {
  const tracks: { id: string; label: string; color: string }[] = [{ id: "opacity", label: "Opacity", color: "#0d99ff" }];
  if (preset.startsWith("slide") || preset === "text-slide") tracks.push({ id: "move", label: "Move", color: "#7b61ff" });
  if (preset === "scale-in") tracks.push({ id: "scale", label: "Scale", color: "#f59e0b" });
  if (preset.includes("blur")) tracks.push({ id: "blur", label: "Blur", color: "#0f766e" });
  if (preset.startsWith("text")) tracks.push({ id: "text", label: "Text", color: "#e11d48" });
  return tracks;
}

export function animationVars(anim: AnimationConfig): Record<string, string> {
  return {
    "--lp-anim-duration": `${anim.duration}s`,
    "--lp-anim-delay": `${anim.delay}s`,
    "--lp-anim-ease": anim.easing,
    "--lp-anim-distance": `${anim.distance}px`,
    "--lp-anim-stagger": `${anim.stagger}s`,
  };
}

export const ANIMATION_STYLESHEET = `
.lp-anim { --lp-anim-duration: .7s; --lp-anim-delay: 0s; --lp-anim-ease: ease-out; --lp-anim-distance: 28px; --lp-anim-stagger: .045s; }
.lp-anim:not(.is-in) { }
.lp-anim.is-in { animation-duration: var(--lp-anim-duration); animation-delay: var(--lp-anim-delay); animation-timing-function: var(--lp-anim-ease); animation-fill-mode: both; }
.lp-anim[data-lp-trigger="loop"].is-in { animation-iteration-count: infinite; }

.lp-anim[data-lp-anim="fade-in"]:not(.is-in) { opacity: 0; }
.lp-anim[data-lp-anim="fade-in"].is-in { animation-name: lp-fade-in; }
.lp-anim[data-lp-anim="fade-out"]:not(.is-in) { opacity: 1; }
.lp-anim[data-lp-anim="fade-out"].is-in { animation-name: lp-fade-out; }
.lp-anim[data-lp-anim="blur-in"]:not(.is-in) { opacity: 0; filter: blur(12px); }
.lp-anim[data-lp-anim="blur-in"].is-in { animation-name: lp-blur-in; }
.lp-anim[data-lp-anim="scale-in"]:not(.is-in) { opacity: 0; transform: scale(.92); }
.lp-anim[data-lp-anim="scale-in"].is-in { animation-name: lp-scale-in; }
.lp-anim[data-lp-anim="slide-up"]:not(.is-in) { opacity: 0; transform: translateY(var(--lp-anim-distance)); }
.lp-anim[data-lp-anim="slide-up"].is-in { animation-name: lp-slide-up; }
.lp-anim[data-lp-anim="slide-down"]:not(.is-in) { opacity: 0; transform: translateY(calc(var(--lp-anim-distance) * -1)); }
.lp-anim[data-lp-anim="slide-down"].is-in { animation-name: lp-slide-down; }
.lp-anim[data-lp-anim="slide-left"]:not(.is-in) { opacity: 0; transform: translateX(var(--lp-anim-distance)); }
.lp-anim[data-lp-anim="slide-left"].is-in { animation-name: lp-slide-left; }
.lp-anim[data-lp-anim="slide-right"]:not(.is-in) { opacity: 0; transform: translateX(calc(var(--lp-anim-distance) * -1)); }
.lp-anim[data-lp-anim="slide-right"].is-in { animation-name: lp-slide-right; }

.lp-anim[data-lp-anim^="text"] .lp-anim-unit { display: inline-block; will-change: transform, opacity, filter; }
.lp-anim[data-lp-anim^="text"]:not(.is-in) .lp-anim-unit { opacity: 0; }
.lp-anim[data-lp-anim="text-slide"]:not(.is-in) .lp-anim-unit { transform: translateY(var(--lp-anim-distance)); }
.lp-anim[data-lp-anim="text-blur"]:not(.is-in) .lp-anim-unit { filter: blur(8px); }
.lp-anim[data-lp-anim="text-fade"].is-in .lp-anim-unit { animation: lp-fade-in var(--lp-anim-duration) var(--lp-anim-ease) both; animation-delay: calc(var(--lp-anim-delay) + var(--lp-unit-i, 0) * var(--lp-anim-stagger)); }
.lp-anim[data-lp-anim="text-slide"].is-in .lp-anim-unit { animation: lp-slide-up var(--lp-anim-duration) var(--lp-anim-ease) both; animation-delay: calc(var(--lp-anim-delay) + var(--lp-unit-i, 0) * var(--lp-anim-stagger)); }
.lp-anim[data-lp-anim="text-blur"].is-in .lp-anim-unit { animation: lp-blur-in var(--lp-anim-duration) var(--lp-anim-ease) both; animation-delay: calc(var(--lp-anim-delay) + var(--lp-unit-i, 0) * var(--lp-anim-stagger)); }

@keyframes lp-fade-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes lp-fade-out { from { opacity: 1 } to { opacity: 0 } }
@keyframes lp-blur-in { from { opacity: 0; filter: blur(12px) } to { opacity: 1; filter: blur(0) } }
@keyframes lp-scale-in { from { opacity: 0; transform: scale(.92) } to { opacity: 1; transform: none } }
@keyframes lp-slide-up { from { opacity: 0; transform: translateY(var(--lp-anim-distance)) } to { opacity: 1; transform: none } }
@keyframes lp-slide-down { from { opacity: 0; transform: translateY(calc(var(--lp-anim-distance) * -1)) } to { opacity: 1; transform: none } }
@keyframes lp-slide-left { from { opacity: 0; transform: translateX(var(--lp-anim-distance)) } to { opacity: 1; transform: none } }
@keyframes lp-slide-right { from { opacity: 0; transform: translateX(calc(var(--lp-anim-distance) * -1)) } to { opacity: 1; transform: none } }
`;
