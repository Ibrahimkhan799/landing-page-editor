"use client";

import { motion, type Transition } from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useStylePreview } from "@/components/landing/style-preview";
import {
  ANIMATION_STYLESHEET,
  isTextAnimation,
  motionTransition,
  motionVariants,
} from "@/lib/animations";
import type { AnimationConfig, NodeMeta } from "@/lib/types";
import { cn } from "@/lib/utils";

const AnimPlaybackContext = createContext({ active: true, playKey: 0 });

export function useAnimPlayback() {
  return useContext(AnimPlaybackContext);
}

export function AnimationStyles() {
  return <style dangerouslySetInnerHTML={{ __html: ANIMATION_STYLESHEET }} />;
}

export function playNodeAnimation(id: string) {
  window.dispatchEvent(new CustomEvent("lp-play-anim", { detail: id }));
}

function splitUnits(text: string, preset: AnimationConfig["preset"]) {
  if (preset === "text-type") {
    return text.split("").map((char) => (char === " " ? "\u00A0" : char));
  }
  // Keep empty trailing slots out, but preserve intentional spacing via NBSP between units.
  return text.split(/\s+/).filter(Boolean);
}

export function AnimatedText({ text, anim }: { text: string; anim: AnimationConfig }) {
  const { active, playKey } = useAnimPlayback();
  const units = splitUnits(text, anim.preset);
  const byChar = anim.preset === "text-type";

  return (
    <>
      {units.map((unit, index) => (
        <motion.span
          key={`${playKey}-${index}-${unit}`}
          className="lp-anim-unit"
          style={{ display: "inline-block", whiteSpace: "pre" }}
          variants={motionVariants(anim.preset, anim.distance)}
          initial="hidden"
          animate={active ? "visible" : "hidden"}
          transition={motionTransition(anim, index)}
        >
          {unit}
          {!byChar && index < units.length - 1 ? "\u00A0" : null}
        </motion.span>
      ))}
    </>
  );
}

export function renderAnimatedText(node: NodeMeta | undefined, text: string) {
  if (isTextAnimation(node?.animation?.preset) && node?.animation) {
    return <AnimatedText text={text} anim={node.animation} />;
  }
  return text;
}

export function AnimateHost({
  node,
  className,
  children,
}: {
  node?: (NodeMeta & { id?: string }) | null;
  className?: string;
  children: ReactNode;
}) {
  const preview = useStylePreview();
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [playKey, setPlayKey] = useState(0);
  const [active, setActive] = useState(true);
  const anim = node?.animation ?? null;
  const textMode = Boolean(anim && isTextAnimation(anim.preset));

  const play = useCallback(() => {
    if (!anim) return;
    // Remount + flip active so both host and text units replay from hidden → visible.
    setActive(false);
    setPlayKey((value) => value + 1);
  }, [anim]);

  useEffect(() => {
    if (playKey === 0) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setActive(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [playKey]);

  useEffect(() => {
    if (!node || !anim || !el) return;

    if (!preview.live) {
      const handler = (event: Event) => {
        const target = (event as CustomEvent<string>).detail;
        if (target && target !== node.id) return;
        play();
      };
      window.addEventListener("lp-play-anim", handler);
      return () => window.removeEventListener("lp-play-anim", handler);
    }

    if (anim.trigger === "load") {
      play();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          play();
          if (anim.trigger === "in-view") observer.disconnect();
        } else if (anim.trigger === "in-view-replay" || anim.trigger === "loop") {
          setActive(false);
        }
      },
      { threshold: 0.16 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [el, node, anim, preview.live, play]);

  if (!node || !anim) return children;

  const variants = motionVariants(anim.preset, anim.distance);
  const transition: Transition = motionTransition(anim);
  const shouldStartHidden = preview.live || playKey > 0;

  return (
    <AnimPlaybackContext.Provider value={{ active, playKey }}>
      <motion.div
        key={`${node.id}-${playKey}`}
        ref={setEl}
        className={cn(className)}
        data-lp-anim={anim.preset}
        data-lp-trigger={anim.trigger}
        data-lp-node={node.id}
        variants={textMode ? undefined : variants}
        initial={textMode ? false : shouldStartHidden ? "hidden" : "visible"}
        animate={textMode ? undefined : active ? "visible" : "hidden"}
        transition={textMode ? undefined : transition}
        style={
          anim.preset === "flip-in" || anim.preset === "text-flip"
            ? { transformPerspective: 800 }
            : undefined
        }
      >
        {children}
      </motion.div>
    </AnimPlaybackContext.Provider>
  );
}
