"use client";

import { motion, useAnimationControls, type Transition } from "framer-motion";
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

const AnimPlaybackContext = createContext(true);

export function useAnimPlayback() {
  return useContext(AnimPlaybackContext);
}

export function AnimationStyles() {
  return <style dangerouslySetInnerHTML={{ __html: ANIMATION_STYLESHEET }} />;
}

export function playNodeAnimation(id: string) {
  window.dispatchEvent(new CustomEvent("lp-play-anim", { detail: id }));
}

export function AnimatedText({ text, anim }: { text: string; anim: AnimationConfig }) {
  const active = useAnimPlayback();
  const words = text.split(/\s+/).filter(Boolean);

  return (
    <>
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          className="lp-anim-unit"
          style={{ display: "inline-block", whiteSpace: "pre", marginRight: index < words.length - 1 ? "0.35em" : undefined }}
          variants={motionVariants(anim.preset, anim.distance)}
          initial={false}
          animate={active ? "visible" : "hidden"}
          transition={motionTransition(anim, index)}
        >
          {word}
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
  const [active, setActive] = useState(!preview.live);
  const controls = useAnimationControls();
  const anim = node?.animation ?? null;

  const play = useCallback(() => {
    setActive(true);
    void controls.start("visible");
  }, [controls]);

  const reset = useCallback(() => {
    setActive(false);
    void controls.start("hidden");
  }, [controls]);

  useEffect(() => {
    if (!node || !anim || !el) return;

    if (!preview.live) {
      play();
      const handler = (event: Event) => {
        const target = (event as CustomEvent<string>).detail;
        if (target && target !== node.id) return;
        reset();
        requestAnimationFrame(() => play());
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
        if (entry.isIntersecting) play();
        else if (anim.trigger === "in-view-replay" || anim.trigger === "loop") reset();
      },
      { threshold: 0.16 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [el, node, anim, preview.live, play, reset]);

  if (!node || !anim) return children;

  const textMode = isTextAnimation(anim.preset);
  const variants = motionVariants(anim.preset, anim.distance);
  const transition: Transition = motionTransition(anim);

  return (
    <AnimPlaybackContext.Provider value={active}>
      <motion.div
        ref={setEl}
        className={cn(className)}
        data-lp-anim={anim.preset}
        data-lp-trigger={anim.trigger}
        data-lp-node={node.id}
        variants={textMode ? undefined : variants}
        initial={preview.live ? "hidden" : false}
        animate={textMode ? undefined : controls}
        transition={textMode ? undefined : transition}
      >
        {children}
      </motion.div>
    </AnimPlaybackContext.Provider>
  );
}
