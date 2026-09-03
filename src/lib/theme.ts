import type { CSSProperties } from "react";
import { contrastText } from "@/lib/utils";
import type { ThemeConfig } from "@/lib/types";

export function themeStyle(theme: ThemeConfig): CSSProperties {
  return {
    "--lp-primary": theme.colors.primary,
    "--lp-primary-fg": contrastText(theme.colors.primary),
    "--lp-secondary": theme.colors.secondary,
    "--lp-secondary-fg": contrastText(theme.colors.secondary),
    "--lp-accent": theme.colors.accent,
    "--lp-accent-fg": contrastText(theme.colors.accent),
    "--lp-bg": theme.colors.background,
    "--lp-fg": theme.colors.foreground,
    "--lp-muted": theme.colors.muted,
    "--lp-muted-fg": theme.colors.mutedForeground,
    "--lp-card": theme.colors.card,
    "--lp-border": theme.colors.border,
    "--lp-radius": `${theme.radius}px`,
    "--lp-font-heading": theme.fonts.heading,
    "--lp-font-body": theme.fonts.body,
    backgroundColor: theme.colors.background,
    color: theme.colors.foreground,
    fontFamily: theme.fonts.body,
  } as CSSProperties;
}
