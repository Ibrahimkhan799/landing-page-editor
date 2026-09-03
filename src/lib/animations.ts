import type { AnimationConfig, AnimationPreset, AnimationTrigger } from "@/lib/types";
import type { Transition, Variants } from "framer-motion";

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

export function motionEase(easing: AnimationConfig["easing"]): Transition["ease"] {
  if (easing === "linear") return "linear";
  if (easing === "ease-in") return "easeIn";
  if (easing === "ease-out") return "easeOut";
  if (easing === "ease-in-out") return "easeInOut";
  return "easeInOut";
}

export function motionTransition(anim: AnimationConfig, index = 0): Transition {
  return {
    duration: anim.duration,
    delay: anim.delay + index * (isTextAnimation(anim.preset) ? anim.stagger : 0),
    ease: motionEase(anim.easing),
    ...(anim.trigger === "loop" ? { repeat: Infinity, repeatType: "loop" as const } : {}),
  };
}

export function motionVariants(preset: AnimationPreset, distance: number): Variants {
  const d = distance;
  switch (preset) {
    case "fade-out":
      return { hidden: { opacity: 1 }, visible: { opacity: 0 } };
    case "blur-in":
    case "text-blur":
      return { hidden: { opacity: 0, filter: "blur(12px)" }, visible: { opacity: 1, filter: "blur(0px)" } };
    case "scale-in":
      return { hidden: { opacity: 0, scale: 0.92 }, visible: { opacity: 1, scale: 1 } };
    case "slide-up":
    case "text-slide":
      return { hidden: { opacity: 0, y: d }, visible: { opacity: 1, y: 0 } };
    case "slide-down":
      return { hidden: { opacity: 0, y: -d }, visible: { opacity: 1, y: 0 } };
    case "slide-left":
      return { hidden: { opacity: 0, x: d }, visible: { opacity: 1, x: 0 } };
    case "slide-right":
      return { hidden: { opacity: 0, x: -d }, visible: { opacity: 1, x: 0 } };
    case "text-fade":
    case "fade-in":
    default:
      return { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  }
}

/** Kept for editor glyph fallbacks / legacy stylesheets. */
export const ANIMATION_STYLESHEET = `
.lp-anim-unit { display: inline-block; }
`;
