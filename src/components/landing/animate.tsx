"use client";

import { motion, type Transition } from "framer-motion";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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

function LiveTextHost({
  anim,
  className,
  children,
  nodeId,
}: {
  anim: AnimationConfig;
  className?: string;
  children: ReactNode;
  nodeId?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(anim.trigger === "load");

  useEffect(() => {
    if (anim.trigger === "load") {
      setActive(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          if (anim.trigger === "in-view") observer.disconnect();
        } else if (anim.trigger === "in-view-replay" || anim.trigger === "loop") {
          setActive(false);
        }
      },
      { threshold: 0.16 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [anim.trigger]);

  return (
    <AnimPlaybackContext.Provider value={{ active, playKey: 0 }}>
      <div
        ref={ref}
        className={cn(className)}
        data-lp-anim={anim.preset}
        data-lp-trigger={anim.trigger}
        data-lp-node={nodeId}
      >
        {children}
      </div>
    </AnimPlaybackContext.Provider>
  );
}

function LiveAnimateHost({
  anim,
  textMode,
  className,
  children,
  nodeId,
}: {
  anim: AnimationConfig;
  textMode: boolean;
  className?: string;
  children: ReactNode;
  nodeId?: string;
}) {
  const variants = motionVariants(anim.preset, anim.distance);
  const transition: Transition = motionTransition(anim);
  const perspective =
    anim.preset === "flip-in" || anim.preset === "text-flip" ? { transformPerspective: 800 } : undefined;

  if (textMode) {
    return (
      <LiveTextHost anim={anim} className={className} nodeId={nodeId}>
        {children}
      </LiveTextHost>
    );
  }

  if (anim.trigger === "load") {
    return (
      <motion.div
        className={cn(className)}
        data-lp-anim={anim.preset}
        data-lp-trigger={anim.trigger}
        data-lp-node={nodeId}
        variants={variants}
        initial="hidden"
        animate="visible"
        transition={transition}
        style={perspective}
      >
        {children}
      </motion.div>
    );
  }

  if (anim.trigger === "loop") {
    return (
      <motion.div
        className={cn(className)}
        data-lp-anim={anim.preset}
        data-lp-trigger={anim.trigger}
        data-lp-node={nodeId}
        variants={variants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.16 }}
        transition={{ ...transition, repeat: Infinity, repeatType: "reverse", repeatDelay: 0.35 }}
        style={perspective}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cn(className)}
      data-lp-anim={anim.preset}
      data-lp-trigger={anim.trigger}
      data-lp-node={nodeId}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: anim.trigger === "in-view", amount: 0.16 }}
      transition={transition}
      style={perspective}
    >
      {children}
    </motion.div>
  );
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
  const anim = node?.animation ?? null;
  const textMode = Boolean(anim && isTextAnimation(anim.preset));
  const [playKey, setPlayKey] = useState(0);
  const [active, setActive] = useState(true);

  // Editor-only Play. Live page uses declarative motion — never remounts via setState.
  useEffect(() => {
    if (preview.live || !node?.id || !anim) return;
    const handler = (event: Event) => {
      const target = (event as CustomEvent<string>).detail;
      if (target && target !== node.id) return;
      setActive(false);
      setPlayKey((value) => value + 1);
    };
    window.addEventListener("lp-play-anim", handler);
    return () => window.removeEventListener("lp-play-anim", handler);
  }, [preview.live, node?.id, anim?.preset, anim?.trigger, anim?.duration, anim?.delay]);

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

  if (!node || !anim) return children;

  if (preview.live) {
    return (
      <LiveAnimateHost anim={anim} textMode={textMode} className={className} nodeId={node.id}>
        {children}
      </LiveAnimateHost>
    );
  }

  const variants = motionVariants(anim.preset, anim.distance);
  const transition: Transition = motionTransition(anim);
  const shouldStartHidden = playKey > 0;

  return (
    <AnimPlaybackContext.Provider value={{ active, playKey }}>
      <motion.div
        key={`${node.id}-${playKey}`}
        className={cn(className)}
        data-lp-anim={anim.preset}
        data-lp-trigger={anim.trigger}
        data-lp-node={node.id}
        variants={textMode ? undefined : variants}
        initial={textMode ? false : shouldStartHidden ? "hidden" : false}
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
