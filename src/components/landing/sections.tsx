import type { ReactNode } from "react";
import { ElementStack } from "@/components/landing/elements";
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
}: {
  children: ReactNode;
  className?: string;
  muted?: boolean;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn("px-6 py-16 md:px-10 md:py-24", className)}
      style={{ background: muted ? "var(--lp-muted)" : "var(--lp-bg)" }}
    >
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

export function LandingSection({
  section,
  theme,
  interactive = true,
}: {
  section: PageSection;
  theme: ThemeConfig;
  interactive?: boolean;
}) {
  const p = section.props;

  switch (section.type) {
    case "navbar": {
      const links = lines(p.links);
      return (
        <header
          className={cn("border-b px-6", bool(p.sticky, true) && "sticky top-0 z-20 backdrop-blur")}
          style={{
            background: "color-mix(in srgb, var(--lp-bg) 88%, transparent)",
            borderColor: "var(--lp-border)",
          }}
        >
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6">
            <BrandMark theme={theme} />
            <nav className="hidden items-center gap-6 text-sm md:flex" style={{ color: "var(--lp-muted-fg)" }}>
              {links.map((link) => (
                <a key={link} href={`#${link.toLowerCase()}`} className="hover:opacity-80">
                  {link}
                </a>
              ))}
            </nav>
            <a
              href={str(p.ctaHref, "#contact")}
              className="inline-flex h-9 items-center rounded-[var(--lp-radius)] px-4 text-sm font-medium"
              style={{ background: "var(--lp-primary)", color: "var(--lp-primary-fg)" }}
            >
              {str(p.ctaLabel, "Get started")}
            </a>
          </div>
        </header>
      );
    }
    case "hero": {
      const align = str(p.align, "center");
      return (
        <SectionShell id="hero">
          <div className={cn("mx-auto max-w-3xl space-y-6", align === "center" && "text-center")}>
            <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--lp-primary)" }}>
              {str(p.eyebrow)}
            </p>
            <h1 className="text-4xl font-semibold leading-[1.1] md:text-6xl" style={{ fontFamily: "var(--lp-font-heading)" }}>
              {str(p.headline)}
            </h1>
            <p className="text-lg leading-8" style={{ color: "var(--lp-muted-fg)" }}>
              {str(p.subheadline)}
            </p>
            <div className={cn("flex flex-wrap gap-3", align === "center" && "justify-center")}>
              <a
                href={str(p.primaryHref, "#contact")}
                className="inline-flex h-11 items-center rounded-[var(--lp-radius)] px-5 font-medium"
                style={{ background: "var(--lp-primary)", color: "var(--lp-primary-fg)" }}
              >
                {str(p.primaryCta)}
              </a>
              {str(p.secondaryCta) ? (
                <a
                  href={str(p.secondaryHref, "#")}
                  className="inline-flex h-11 items-center rounded-[var(--lp-radius)] border px-5 font-medium"
                  style={{ borderColor: "var(--lp-border)" }}
                >
                  {str(p.secondaryCta)}
                </a>
              ) : null}
            </div>
            <ElementStack elements={section.elements} interactive={interactive} />
          </div>
        </SectionShell>
      );
    }
    case "hero-split":
      return (
        <SectionShell id="hero">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div className="space-y-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--lp-primary)" }}>
                {str(p.eyebrow)}
              </p>
              <h1 className="text-4xl font-semibold leading-[1.1] md:text-5xl" style={{ fontFamily: "var(--lp-font-heading)" }}>
                {str(p.headline)}
              </h1>
              <p className="text-lg leading-8" style={{ color: "var(--lp-muted-fg)" }}>
                {str(p.subheadline)}
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={str(p.primaryHref, "#contact")}
                  className="inline-flex h-11 items-center rounded-[var(--lp-radius)] px-5 font-medium"
                  style={{ background: "var(--lp-primary)", color: "var(--lp-primary-fg)" }}
                >
                  {str(p.primaryCta)}
                </a>
                {str(p.secondaryCta) ? (
                  <a
                    href={str(p.secondaryHref, "#")}
                    className="inline-flex h-11 items-center rounded-[var(--lp-radius)] border px-5 font-medium"
                    style={{ borderColor: "var(--lp-border)" }}
                  >
                    {str(p.secondaryCta)}
                  </a>
                ) : null}
              </div>
              <ElementStack elements={section.elements} interactive={interactive} />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={str(p.image)}
              alt=""
              className="h-full min-h-[320px] w-full object-cover"
              style={{ borderRadius: "var(--lp-radius)" }}
            />
          </div>
        </SectionShell>
      );
    case "logos":
      return (
        <SectionShell muted id="logos" className="py-12 md:py-14">
          <p className="mb-6 text-center text-sm font-medium" style={{ color: "var(--lp-muted-fg)" }}>
            {str(p.headline)}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-lg font-semibold opacity-70">
            {lines(p.logos).map((logo) => (
              <span key={logo}>{logo}</span>
            ))}
          </div>
        </SectionShell>
      );
    case "features":
    case "services":
      return (
        <SectionShell id={section.type} muted={section.type === "services"}>
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold md:text-4xl" style={{ fontFamily: "var(--lp-font-heading)" }}>
              {str(p.headline)}
            </h2>
            <p className="mt-3" style={{ color: "var(--lp-muted-fg)" }}>
              {str(p.subheadline)}
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {list(p.items).map((item, index) => (
              <div
                key={`${item.title}-${index}`}
                className="border p-6"
                style={{
                  background: "var(--lp-card)",
                  borderColor: "var(--lp-border)",
                  borderRadius: "var(--lp-radius)",
                }}
              >
                <div
                  className="mb-4 grid h-10 w-10 place-items-center text-sm font-semibold"
                  style={{
                    background: "var(--lp-primary)",
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
          <ElementStack elements={section.elements} interactive={interactive} />
        </SectionShell>
      );
    case "about":
      return (
        <SectionShell id="about">
          <div className="grid items-center gap-10 md:grid-cols-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={str(p.image)}
              alt=""
              className="min-h-[280px] w-full object-cover"
              style={{ borderRadius: "var(--lp-radius)" }}
            />
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--lp-primary)" }}>
                {str(p.eyebrow)}
              </p>
              <h2 className="text-3xl font-semibold md:text-4xl" style={{ fontFamily: "var(--lp-font-heading)" }}>
                {str(p.headline)}
              </h2>
              <p className="text-lg leading-8" style={{ color: "var(--lp-muted-fg)" }}>
                {str(p.body)}
              </p>
              <ElementStack elements={section.elements} interactive={interactive} />
            </div>
          </div>
        </SectionShell>
      );
    case "stats":
      return (
        <SectionShell muted id="stats" className="py-14 md:py-16">
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
        </SectionShell>
      );
    case "testimonials":
      return (
        <SectionShell id="testimonials">
          <h2 className="mb-10 text-center text-3xl font-semibold md:text-4xl" style={{ fontFamily: "var(--lp-font-heading)" }}>
            {str(p.headline)}
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            {list(p.items).map((item) => (
              <blockquote
                key={item.name}
                className="border p-6"
                style={{ background: "var(--lp-card)", borderColor: "var(--lp-border)", borderRadius: "var(--lp-radius)" }}
              >
                <p className="leading-7">“{item.quote}”</p>
                <footer className="mt-5 text-sm">
                  <div className="font-semibold">{item.name}</div>
                  <div style={{ color: "var(--lp-muted-fg)" }}>{item.role}</div>
                </footer>
              </blockquote>
            ))}
          </div>
        </SectionShell>
      );
    case "pricing":
      return (
        <SectionShell id="pricing" muted>
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold md:text-4xl" style={{ fontFamily: "var(--lp-font-heading)" }}>
              {str(p.headline)}
            </h2>
            <p className="mt-3" style={{ color: "var(--lp-muted-fg)" }}>
              {str(p.subheadline)}
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {list(p.plans).map((plan) => (
              <div
                key={plan.name}
                className="flex flex-col border p-6"
                style={{
                  background: "var(--lp-card)",
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
                    background: plan.highlighted ? "var(--lp-primary)" : "var(--lp-muted)",
                    color: plan.highlighted ? "var(--lp-primary-fg)" : "var(--lp-fg)",
                  }}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </SectionShell>
      );
    case "faq":
      return (
        <SectionShell id="faq">
          <h2 className="mb-8 text-center text-3xl font-semibold" style={{ fontFamily: "var(--lp-font-heading)" }}>
            {str(p.headline)}
          </h2>
          <div className="mx-auto max-w-3xl space-y-3">
            {list(p.items).map((item) => (
              <details
                key={item.question}
                className="border p-4"
                style={{ borderColor: "var(--lp-border)", borderRadius: "var(--lp-radius)", background: "var(--lp-card)" }}
              >
                <summary className="cursor-pointer font-medium">{item.question}</summary>
                <p className="mt-3 text-sm leading-6" style={{ color: "var(--lp-muted-fg)" }}>
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </SectionShell>
      );
    case "gallery":
      return (
        <SectionShell id="gallery" muted>
          <h2 className="mb-8 text-center text-3xl font-semibold" style={{ fontFamily: "var(--lp-font-heading)" }}>
            {str(p.headline)}
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {lines(p.images).map((src) => (
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
        </SectionShell>
      );
    case "team":
      return (
        <SectionShell id="team">
          <h2 className="mb-10 text-center text-3xl font-semibold" style={{ fontFamily: "var(--lp-font-heading)" }}>
            {str(p.headline)}
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
        </SectionShell>
      );
    case "cta":
      return (
        <SectionShell id="cta">
          <div
            className="px-8 py-14 text-center"
            style={{
              background: "var(--lp-secondary)",
              color: "var(--lp-secondary-fg)",
              borderRadius: "calc(var(--lp-radius) + 8px)",
            }}
          >
            <h2 className="text-3xl font-semibold md:text-4xl" style={{ fontFamily: "var(--lp-font-heading)" }}>
              {str(p.headline)}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl opacity-90">{str(p.subheadline)}</p>
            <a
              href={str(p.ctaHref, "/admin")}
              className="mt-6 inline-flex h-11 items-center rounded-[var(--lp-radius)] px-5 font-medium"
              style={{ background: "var(--lp-accent)", color: "var(--lp-accent-fg)" }}
            >
              {str(p.ctaLabel)}
            </a>
          </div>
        </SectionShell>
      );
    case "contact":
      return (
        <SectionShell id="contact" muted>
          <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 className="text-3xl font-semibold md:text-4xl" style={{ fontFamily: "var(--lp-font-heading)" }}>
                {str(p.headline)}
              </h2>
              <p className="mt-3" style={{ color: "var(--lp-muted-fg)" }}>
                {str(p.subheadline)}
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
            <form
              className="space-y-4 border p-6"
              style={{ background: "var(--lp-card)", borderColor: "var(--lp-border)", borderRadius: "var(--lp-radius)" }}
              action="#"
            >
              <ElementStack elements={section.elements} interactive={interactive} />
            </form>
          </div>
        </SectionShell>
      );
    case "footer":
      return (
        <footer className="border-t px-6 py-10" style={{ borderColor: "var(--lp-border)", background: "var(--lp-bg)" }}>
          <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <BrandMark theme={theme} />
              <p className="mt-2 max-w-sm text-sm" style={{ color: "var(--lp-muted-fg)" }}>
                {str(p.blurb)}
              </p>
            </div>
            <div className="flex gap-4 text-sm" style={{ color: "var(--lp-muted-fg)" }}>
              {lines(p.links).map((link) => (
                <a key={link} href="#">
                  {link}
                </a>
              ))}
            </div>
          </div>
          <p className="mx-auto mt-8 max-w-6xl text-xs" style={{ color: "var(--lp-muted-fg)" }}>
            {str(p.copyright)}
          </p>
        </footer>
      );
    case "custom":
      return (
        <SectionShell muted={str(p.background, "muted") === "muted"}>
          <div className="space-y-4">
            {str(p.headline) ? (
              <h2 className="text-3xl font-semibold" style={{ fontFamily: "var(--lp-font-heading)" }}>
                {str(p.headline)}
              </h2>
            ) : null}
            <ElementStack elements={section.elements} interactive={interactive} />
          </div>
        </SectionShell>
      );
    default:
      return null;
  }
}
