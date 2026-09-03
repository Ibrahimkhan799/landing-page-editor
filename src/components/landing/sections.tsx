"use client";

import type { ReactNode } from "react";
import { AnimateHost } from "@/components/landing/animate";
import { LandingElement } from "@/components/landing/elements";
import { useNodeCss } from "@/components/landing/style-preview";
import { elementSlot, elementsSlot, textSlot } from "@/lib/slots";
import type { PageSection, ThemeConfig } from "@/lib/types";
import { cn } from "@/lib/utils";

function str(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function bool(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function list(value: unknown) {
  if (Array.isArray(value)) return value as Record<string, string>[];
  return [];
}

function lines(value: unknown) {
  return str(value)
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function BrandMark({ theme }: { theme: ThemeConfig }) {
  if (theme.logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={theme.logo} alt={theme.brandName} className="h-9 w-auto object-contain" />
    );
  }
  return (
    <span className="text-lg font-semibold" style={{ fontFamily: "var(--lp-font-heading)" }}>
      {theme.brandName}
    </span>
  );
}

function SectionShell({
  children,
  className,
  muted,
  id,
  node,
}: {
  children: ReactNode;
  className?: string;
  muted?: boolean;
  id?: string;
  node?: PageSection;
}) {
  const nodeCss = useNodeCss(node);
  return (
    <AnimateHost node={node} className="block">
      <section
        data-editor-node={node?.id}
        id={node?.htmlId || id}
        className={cn("px-6 py-16 md:px-10 md:py-24", className, node?.className)}
        style={{ backgroundColor: muted ? "var(--lp-muted)" : "var(--lp-bg)", ...nodeCss }}
      >
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </section>
    </AnimateHost>
  );
}

export function LandingSection({
  section,
  theme,
  interactive = true,
  renderElement,
  renderEmptySlot,
}: {
  section: PageSection;
  theme: ThemeConfig;
  interactive?: boolean;
  renderElement?: (element: import("@/lib/types").PageElement, slotId: string) => ReactNode;
  renderEmptySlot?: (slotId: string) => ReactNode;
}) {
  const p = section.props;
  const sectionCss = useNodeCss(section);
  const t = (id: string, fallback = "") => textSlot(section, id, str(p[id], fallback));
  const extras = (id: string) => elementsSlot(section, id);
  const node = (id: string) => elementSlot(section, id);
  const renderEl = (element: import("@/lib/types").PageElement, slotId: string) =>
    renderElement ? (
      renderElement(element, slotId)
    ) : (
      <AnimateHost node={element} className="inline-flex max-w-full">
        <LandingElement element={element} interactive={interactive} />
      </AnimateHost>
    );
  const empty = (id: string) => renderEmptySlot?.(id) ?? null;
  const stack = (slotId: string) => {
    const items = extras(slotId);
    if (!items.length && !renderEmptySlot) return null;
    return (
      <div className="mt-6 flex w-full flex-col items-stretch gap-4">
        {items.map((element) => (
          <div key={element.id}>{renderEl(element, slotId)}</div>
        ))}
        {empty(slotId)}
      </div>
    );
  };

  switch (section.type) {
    case "navbar": {
      const links = lines(t("links", str(p.links)));
      const cta = node("cta");
      return (
        <AnimateHost node={section} className="block">
        <header
          data-editor-node={section.id}
          id={section.htmlId || undefined}
          className={cn("border-b px-6", bool(p.sticky, true) && "sticky top-0 z-20 backdrop-blur", section.className)}
          style={{
            backgroundColor: "color-mix(in srgb, var(--lp-bg) 88%, transparent)",
            borderColor: "var(--lp-border)",
            ...sectionCss,
          }}
        >
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6">
            <BrandMark theme={theme} />
            <nav className="hidden items-center gap-6 text-sm md:flex" style={{ color: "var(--lp-muted-fg)" }}>
              {links.map((link) => (
                <span key={link}>{link}</span>
              ))}
            </nav>
            {cta ? renderEl(cta, "cta") : empty("cta")}
          </div>
        </header>
        </AnimateHost>
      );
    }
    case "hero": {
      const align = str(p.align, "center");
      return (
        <SectionShell node={section} id="hero">
          <div className={cn("mx-auto max-w-3xl space-y-6", align === "center" && "text-center")}>
            <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--lp-primary)" }}>
              {t("eyebrow")}
            </p>
            <h1 className="text-4xl font-semibold leading-[1.1] md:text-6xl" style={{ fontFamily: "var(--lp-font-heading)" }}>
              {t("headline")}
            </h1>
            <p className="text-lg leading-8" style={{ color: "var(--lp-muted-fg)" }}>
              {t("subheadline")}
            </p>
            <div className={cn("flex flex-wrap gap-3", align === "center" && "justify-center")}>
              {extras("actions").map((element) => (
                <div key={element.id}>{renderEl(element, "actions")}</div>
              ))}
              {empty("actions")}
            </div>
            {stack("extra")}
          </div>
        </SectionShell>
      );
    }
    case "hero-split": {
      const media = node("media");
      return (
        <SectionShell node={section} id="hero">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div className="space-y-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--lp-primary)" }}>
                {t("eyebrow")}
              </p>
              <h1 className="text-4xl font-semibold leading-[1.1] md:text-5xl" style={{ fontFamily: "var(--lp-font-heading)" }}>
                {t("headline")}
              </h1>
              <p className="text-lg leading-8" style={{ color: "var(--lp-muted-fg)" }}>
                {t("subheadline")}
              </p>
              <div className="flex flex-wrap gap-3">
                {extras("actions").map((element) => (
                  <div key={element.id}>{renderEl(element, "actions")}</div>
                ))}
                {empty("actions")}
              </div>
              {stack("extra")}
            </div>
            {media ? renderEl(media, "media") : empty("media")}
          </div>
        </SectionShell>
      );
    }
    case "logos":
      return (
        <SectionShell node={section} muted id="logos" className="py-12 md:py-14">
          <p className="mb-6 text-center text-sm font-medium" style={{ color: "var(--lp-muted-fg)" }}>
            {t("headline")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-lg font-semibold opacity-70">
            {lines(t("logos", str(p.logos))).map((logo) => (
              <span key={logo}>{logo}</span>
            ))}
          </div>
          {stack("extra")}
        </SectionShell>
      );
    case "features":
    case "services":
      return (
        <SectionShell node={section} id={section.type} muted={section.type === "services"}>
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold md:text-4xl" style={{ fontFamily: "var(--lp-font-heading)" }}>
              {t("headline")}
            </h2>
            <p className="mt-3" style={{ color: "var(--lp-muted-fg)" }}>
              {t("subheadline")}
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {list(p.items).map((item, index) => (
              <div
                key={`${item.title}-${index}`}
                className="border p-6"
                style={{
                  backgroundColor: "var(--lp-card)",
                  borderColor: "var(--lp-border)",
                  borderRadius: "var(--lp-radius)",
                }}
              >
                <div
                  className="mb-4 grid h-10 w-10 place-items-center text-sm font-semibold"
                  style={{
                    backgroundColor: "var(--lp-primary)",
                    color: "var(--lp-primary-fg)",
                    borderRadius: "calc(var(--lp-radius) - 4px)",
                  }}
                >
                  {index + 1}
                </div>
                <h3 className="text-lg font-semibold" style={{ fontFamily: "var(--lp-font-heading)" }}>
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6" style={{ color: "var(--lp-muted-fg)" }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
          {stack("extra")}
        </SectionShell>
      );
    case "about": {
      const media = node("media");
      return (
        <SectionShell node={section} id="about">
          <div className="grid items-center gap-10 md:grid-cols-2">
            {media ? renderEl(media, "media") : empty("media")}
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--lp-primary)" }}>
                {t("eyebrow")}
              </p>
              <h2 className="text-3xl font-semibold md:text-4xl" style={{ fontFamily: "var(--lp-font-heading)" }}>
                {t("headline")}
              </h2>
              <p className="text-lg leading-8" style={{ color: "var(--lp-muted-fg)" }}>
                {t("body")}
              </p>
              {stack("extra")}
            </div>
          </div>
        </SectionShell>
      );
    }
    case "stats":
      return (
        <SectionShell node={section} muted id="stats" className="py-14 md:py-16">
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
            {list(p.items).map((item) => (
              <div key={item.label} className="text-center">
                <div className="text-4xl font-semibold" style={{ fontFamily: "var(--lp-font-heading)", color: "var(--lp-primary)" }}>
                  {item.value}
                </div>
                <div className="mt-1 text-sm" style={{ color: "var(--lp-muted-fg)" }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>
          {stack("extra")}
        </SectionShell>
      );
    case "testimonials":
      return (
        <SectionShell node={section} id="testimonials">
          <h2 className="mb-10 text-center text-3xl font-semibold md:text-4xl" style={{ fontFamily: "var(--lp-font-heading)" }}>
            {t("headline")}
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            {list(p.items).map((item) => (
              <blockquote
                key={item.name}
                className="border p-6"
                style={{ backgroundColor: "var(--lp-card)", borderColor: "var(--lp-border)", borderRadius: "var(--lp-radius)" }}
              >
                <p className="leading-7">“{item.quote}”</p>
                <footer className="mt-5 text-sm">
                  <div className="font-semibold">{item.name}</div>
                  <div style={{ color: "var(--lp-muted-fg)" }}>{item.role}</div>
                </footer>
              </blockquote>
            ))}
          </div>
          {stack("extra")}
        </SectionShell>
      );
    case "pricing":
      return (
        <SectionShell node={section} id="pricing" muted>
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold md:text-4xl" style={{ fontFamily: "var(--lp-font-heading)" }}>
              {t("headline")}
            </h2>
            <p className="mt-3" style={{ color: "var(--lp-muted-fg)" }}>
              {t("subheadline")}
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {list(p.plans).map((plan) => (
              <div
                key={plan.name}
                className="flex flex-col border p-6"
                style={{
                  backgroundColor: "var(--lp-card)",
                  borderColor: plan.highlighted ? "var(--lp-primary)" : "var(--lp-border)",
                  borderRadius: "var(--lp-radius)",
                  boxShadow: plan.highlighted ? "0 16px 40px color-mix(in srgb, var(--lp-primary) 18%, transparent)" : undefined,
                }}
              >
                <div className="text-sm font-medium" style={{ color: "var(--lp-muted-fg)" }}>
                  {plan.name}
                </div>
                <div className="mt-2 text-4xl font-semibold" style={{ fontFamily: "var(--lp-font-heading)" }}>
                  {plan.price}
                  <span className="text-sm font-normal" style={{ color: "var(--lp-muted-fg)" }}>
                    {" "}
                    {plan.period}
                  </span>
                </div>
                <ul className="mt-6 flex-1 space-y-2 text-sm">
                  {str(plan.features)
                    .split("\n")
                    .filter(Boolean)
                    .map((feature) => (
                      <li key={feature}>• {feature}</li>
                    ))}
                </ul>
                <a
                  href="#contact"
                  className="mt-6 inline-flex h-10 items-center justify-center rounded-[var(--lp-radius)] px-4 text-sm font-medium"
                  style={{
                    backgroundColor: plan.highlighted ? "var(--lp-primary)" : "var(--lp-muted)",
                    color: plan.highlighted ? "var(--lp-primary-fg)" : "var(--lp-fg)",
                  }}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
          {stack("extra")}
        </SectionShell>
      );
    case "faq":
      return (
        <SectionShell node={section} id="faq">
          <h2 className="mb-8 text-center text-3xl font-semibold" style={{ fontFamily: "var(--lp-font-heading)" }}>
            {t("headline")}
          </h2>
          <div className="mx-auto max-w-3xl space-y-3">
            {list(p.items).map((item) => (
              <details
                key={item.question}
                className="border p-4"
                style={{ borderColor: "var(--lp-border)", borderRadius: "var(--lp-radius)", backgroundColor: "var(--lp-card)" }}
              >
                <summary className="cursor-pointer font-medium">{item.question}</summary>
                <p className="mt-3 text-sm leading-6" style={{ color: "var(--lp-muted-fg)" }}>
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
          {stack("extra")}
        </SectionShell>
      );
    case "gallery":
      return (
        <SectionShell node={section} id="gallery" muted>
          <h2 className="mb-8 text-center text-3xl font-semibold" style={{ fontFamily: "var(--lp-font-heading)" }}>
            {t("headline")}
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {lines(t("images", str(p.images))).map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src}
                src={src}
                alt=""
                className="h-56 w-full object-cover"
                style={{ borderRadius: "var(--lp-radius)" }}
              />
            ))}
          </div>
          {stack("extra")}
        </SectionShell>
      );
    case "team":
      return (
        <SectionShell node={section} id="team">
          <h2 className="mb-10 text-center text-3xl font-semibold" style={{ fontFamily: "var(--lp-font-heading)" }}>
            {t("headline")}
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {list(p.members).map((member) => (
              <div key={member.name} className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={member.image}
                  alt={member.name}
                  className="mx-auto h-40 w-40 object-cover"
                  style={{ borderRadius: "var(--lp-radius)" }}
                />
                <div className="mt-4 font-semibold">{member.name}</div>
                <div className="text-sm" style={{ color: "var(--lp-muted-fg)" }}>
                  {member.role}
                </div>
              </div>
            ))}
          </div>
          {stack("extra")}
        </SectionShell>
      );
    case "cta": {
      const action = node("action");
      return (
        <SectionShell node={section} id="cta">
          <div
            className="px-8 py-14 text-center"
            style={{
              backgroundColor: "var(--lp-secondary)",
              color: "var(--lp-secondary-fg)",
              borderRadius: "calc(var(--lp-radius) + 8px)",
            }}
          >
            <h2 className="text-3xl font-semibold md:text-4xl" style={{ fontFamily: "var(--lp-font-heading)" }}>
              {t("headline")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl opacity-90">{t("subheadline")}</p>
            <div className="mt-6 flex justify-center">{action ? renderEl(action, "action") : empty("action")}</div>
          </div>
        </SectionShell>
      );
    }
    case "contact":
      return (
        <SectionShell node={section} id="contact" muted>
          <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 className="text-3xl font-semibold md:text-4xl" style={{ fontFamily: "var(--lp-font-heading)" }}>
                {t("headline")}
              </h2>
              <p className="mt-3" style={{ color: "var(--lp-muted-fg)" }}>
                {t("subheadline")}
              </p>
              <dl className="mt-8 space-y-3 text-sm">
                <div>
                  <dt className="font-medium">Email</dt>
                  <dd style={{ color: "var(--lp-muted-fg)" }}>{str(p.email)}</dd>
                </div>
                <div>
                  <dt className="font-medium">Phone</dt>
                  <dd style={{ color: "var(--lp-muted-fg)" }}>{str(p.phone)}</dd>
                </div>
                <div>
                  <dt className="font-medium">Studio</dt>
                  <dd style={{ color: "var(--lp-muted-fg)" }}>{str(p.address)}</dd>
                </div>
              </dl>
            </div>
            <div
              className="space-y-4 border p-6"
              style={{ backgroundColor: "var(--lp-card)", borderColor: "var(--lp-border)", borderRadius: "var(--lp-radius)" }}
            >
              {stack("form")}
            </div>
          </div>
        </SectionShell>
      );
    case "footer":
      return (
        <AnimateHost node={section} className="block">
        <footer
          data-editor-node={section.id}
          id={section.htmlId || undefined}
          className={cn("border-t px-6 py-10", section.className)}
          style={{ borderColor: "var(--lp-border)", backgroundColor: "var(--lp-bg)", ...sectionCss }}
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <BrandMark theme={theme} />
              <p className="mt-2 max-w-sm text-sm" style={{ color: "var(--lp-muted-fg)" }}>
                {t("blurb")}
              </p>
            </div>
            <div className="flex gap-4 text-sm" style={{ color: "var(--lp-muted-fg)" }}>
              {lines(t("links", str(p.links))).map((link) => (
                <span key={link}>{link}</span>
              ))}
            </div>
          </div>
          <p className="mx-auto mt-8 max-w-6xl text-xs" style={{ color: "var(--lp-muted-fg)" }}>
            {t("copyright")}
          </p>
          <div className="mx-auto max-w-6xl">
            {stack("extra")}
          </div>
        </footer>
        </AnimateHost>
      );
    case "custom":
      return (
        <SectionShell node={section} muted={str(p.background, "muted") === "muted"}>
          <div className="space-y-4">
            {stack("body")}
          </div>
        </SectionShell>
      );
    default:
      return null;
  }
}
