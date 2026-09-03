"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useStylePreview } from "@/components/landing/style-preview";
import { ANIMATION_STYLESHEET, animationVars, isTextAnimation } from "@/lib/animations";
import type { AnimationConfig, NodeMeta } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AnimationStyles() {
  return <style dangerouslySetInnerHTML={{ __html: ANIMATION_STYLESHEET }} />;
}

export function playNodeAnimation(id: string) {
  window.dispatchEvent(new CustomEvent("lp-play-anim", { detail: id }));
}

export function AnimatedText({ text }: { text: string }) {
  let index = 0;
  return (
    <>
      {text.split(/(\s+)/).map((part, key) => {
        if (!part.trim()) return <span key={key}>{part}</span>;
        const i = index++;
        return (
          <span key={key} className="lp-anim-unit" style={{ "--lp-unit-i": i } as CSSProperties}>
            {part}
          </span>
        );
      })}
    </>
  );
}

export function renderAnimatedText(node: NodeMeta | undefined, text: string) {
  if (isTextAnimation(node?.animation?.preset)) return <AnimatedText text={text} />;
  return text;
}

function useViewportTrigger(node: HTMLElement | null, id: string | undefined, anim: AnimationConfig | null | undefined, live: boolean) {
  useEffect(() => {
    if (!node || !anim) return;
    const play = () => {
      node.classList.remove("is-in");
      void node.offsetWidth;
      node.classList.add("is-in");
    };
    const reset = () => node.classList.remove("is-in");

    if (!live) {
      node.classList.add("is-in");
      const onPlay = (event: Event) => {
        const target = (event as CustomEvent<string>).detail;
        if (target && target !== id) return;
        play();
      };
      window.addEventListener("lp-play-anim", onPlay);
      return () => window.removeEventListener("lp-play-anim", onPlay);
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
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, id, anim, live]);
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
  const anim = node?.animation ?? null;
  useViewportTrigger(el, node?.id, anim, preview.live);

  if (!node || !anim) return children;

  return (
    <div
      ref={setEl}
      className={cn("lp-anim", className)}
      data-lp-anim={anim.preset}
      data-lp-trigger={anim.trigger}
      data-lp-node={node.id}
      style={animationVars(anim) as CSSProperties}
    >
      {children}
    </div>
  );
}
