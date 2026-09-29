import { nanoid } from "nanoid";
import { defaultElementsSlot, isContainerElement, slotDefs } from "@/lib/slots";
import type {
  ElementType,
  InteractionBinding,
  LandingPage,
  PageElement,
  PageSection,
  SlotValue,
  VariableDefinition,
} from "@/lib/types";

function makeElement(type: ElementType, props: Record<string, unknown> = {}): PageElement {
  return {
    id: nanoid(10),
    type,
    props,
    className: "",
    htmlId: "",
    styles: {},
    children: isContainerElement(type) ? [] : undefined,
  };
}

function cloneVariables(variables?: VariableDefinition[]) {
  return variables?.map((variable) => structuredClone(variable));
}

function cloneInteractions(interactions?: InteractionBinding[]) {
  return interactions?.map((binding) => ({
    ...binding,
    action: structuredClone(binding.action),
  }));
}

/** Normalize IF/ELSE without new slot types or random IDs; safe to run repeatedly. */
export function normalizeConditionalElement(element: PageElement): PageElement {
  if (element.type !== "conditional") return element;
  const children = element.children ?? [];
  const thenFrame = children.find((child) => child.type === "frame" && child.props.branch === "then");
  const elseFrame = children.find((child) => child.type === "frame" && child.props.branch === "else");
  const legacy = children.filter((child) => child !== thenFrame && child !== elseFrame);
  const props = { ...element.props };
  const fallback = typeof props.fallback === "string" ? props.fallback : "";
  delete props.fallback;
  const branch = (kind: "then" | "else", existing: PageElement | undefined, extra: PageElement[]): PageElement => ({
    ...(existing ?? { id: `${element.id}:branch:${kind}`, type: "frame" as const, styles: { display: "flex", flexDirection: "column", width: "100%" } }),
    props: { ...existing?.props, branch: kind, label: kind === "then" ? "Then" : "Else" },
    children: [...(existing?.children ?? []), ...extra],
  });
  return {
    ...element, props,
    children: [
      branch("then", thenFrame, legacy),
      branch("else", elseFrame, fallback ? [{ id: `${element.id}:branch:else:text`, type: "paragraph", props: { text: fallback } }] : []),
    ],
  };
}

export function migrateElement(element: PageElement): PageElement {
  element = normalizeConditionalElement(element);
  const children = element.children?.map(migrateElement);
  return {
    ...element,
    props: { ...element.props },
    bindings: element.bindings ? structuredClone(element.bindings) : undefined,
    className: element.className ?? "",
    htmlId: element.htmlId ?? "",
    styles: element.styles ?? {},
    variables: cloneVariables(element.variables),
    interactions: cloneInteractions(element.interactions),
    children: children ?? (isContainerElement(element.type) ? [] : undefined),
  };
}

function asElement(value: unknown): PageElement | null {
  if (value && typeof value === "object" && !Array.isArray(value) && "type" in value && "id" in value) {
    return value as PageElement;
  }
  return null;
}

export function migrateSection(section: PageSection): PageSection {
  const slots: Record<string, SlotValue> = { ...(section.slots ?? {}) };
  const props = { ...section.props };
  const legacyElements = section.elements ?? [];

  for (const def of slotDefs(section.type)) {
    if (slots[def.id] !== undefined) continue;
    if (def.kind === "text") {
      const fromProp = props[def.id];
      slots[def.id] = typeof fromProp === "string" ? fromProp : "";
      if (typeof fromProp === "string") delete props[def.id];
      continue;
    }
    if (def.kind === "element") {
      slots[def.id] = null;
      continue;
    }
    slots[def.id] = [];
  }

  if (legacyElements.length) {
    const target = defaultElementsSlot(section);
    const current = Array.isArray(slots[target]) ? (slots[target] as PageElement[]) : [];
    slots[target] = [...current, ...legacyElements];
  }

  if (section.type === "navbar" && !asElement(slots.cta)) {
    slots.cta = makeElement("button", {
      label: typeof props.ctaLabel === "string" ? props.ctaLabel : "Book a call",
      href: typeof props.ctaHref === "string" ? props.ctaHref : "#contact",
    });
    delete props.ctaLabel;
    delete props.ctaHref;
  }

  // Convert legacy comma-separated link/logo text slots into real elements
  for (const key of ["links", "logos"] as const) {
    const value = slots[key];
    if (typeof value === "string") {
      const parts = value
        .split(/[,\n]/)
        .map((part) => part.trim())
        .filter(Boolean);
      slots[key] = parts.map((label) =>
        makeElement("button", {
          label,
          href: `#${label.toLowerCase().replace(/\s+/g, "-")}`,
          variant: "ghost",
          size: "sm",
        }),
      );
    } else if (value === undefined && typeof props[key] === "string") {
      const parts = String(props[key])
        .split(/[,\n]/)
        .map((part) => part.trim())
        .filter(Boolean);
      slots[key] = parts.map((label) =>
        makeElement("button", {
          label,
          href: `#${label.toLowerCase().replace(/\s+/g, "-")}`,
          variant: key === "logos" ? "secondary" : "ghost",
          size: "sm",
        }),
      );
      delete props[key];
    } else if (!Array.isArray(slots[key]) && slotDefs(section.type).some((d) => d.id === key && d.kind === "elements")) {
      slots[key] = [];
    }
  }

  if ((section.type === "hero" || section.type === "hero-split") && !(slots.actions as PageElement[])?.length) {
    const actions: PageElement[] = [];
    if (typeof props.primaryCta === "string") {
      actions.push(
        makeElement("button", {
          label: props.primaryCta,
          href: typeof props.primaryHref === "string" ? props.primaryHref : "#contact",
        }),
      );
    }
    if (typeof props.secondaryCta === "string") {
      actions.push(
        makeElement("button", {
          label: props.secondaryCta,
          href: typeof props.secondaryHref === "string" ? props.secondaryHref : "#",
          variant: "outline",
        }),
      );
    }
    slots.actions = actions;
    delete props.primaryCta;
    delete props.primaryHref;
    delete props.secondaryCta;
    delete props.secondaryHref;
  }

  if (section.type === "hero-split" && !asElement(slots.media) && typeof props.image === "string") {
    slots.media = makeElement("image", { src: props.image, alt: "Hero image" });
    delete props.image;
  }

  if (section.type === "about" && !asElement(slots.media) && typeof props.image === "string") {
    slots.media = makeElement("image", { src: props.image, alt: "About image" });
    delete props.image;
  }

  if (section.type === "about") {
    if (typeof slots.body === "string") {
      const text = slots.body.trim();
      slots.body = text ? [makeElement("paragraph", { text })] : [];
    } else if (!Array.isArray(slots.body)) {
      const text = typeof props.body === "string" ? props.body.trim() : "";
      slots.body = text ? [makeElement("paragraph", { text })] : [];
      delete props.body;
    }
  }

  if (section.type === "cta" && !asElement(slots.action)) {
    slots.action = makeElement("button", {
      label: typeof props.ctaLabel === "string" ? props.ctaLabel : "Get started",
      href: typeof props.ctaHref === "string" ? props.ctaHref : "/admin",
      variant: "primary",
    });
    delete props.ctaLabel;
    delete props.ctaHref;
  }

  if (section.type === "contact" && !(slots.form as PageElement[])?.length && legacyElements.length) {
    slots.form = legacyElements;
  }

  if (section.type === "custom" && !(slots.body as PageElement[])?.length) {
    slots.body = legacyElements;
  }

  for (const key of Object.keys(slots)) {
    if (key.startsWith("frame:")) {
      delete slots[key];
      continue;
    }
    const value = slots[key];
    if (Array.isArray(value)) {
      slots[key] = value.map(migrateElement);
      continue;
    }
    const element = asElement(value);
    if (element) slots[key] = migrateElement(element);
  }

  return {
    ...section,
    props,
    slots,
    slotOverrides: section.slotOverrides ? Object.fromEntries(Object.entries(section.slotOverrides).map(([key, value]) => [
      key, Array.isArray(value) ? value.map(migrateElement) : asElement(value) ? migrateElement(value as PageElement) : value,
    ])) : undefined,
    elements: undefined,
    className: section.className ?? "",
    htmlId: section.htmlId ?? "",
    styles: section.styles ?? {},
    variables: cloneVariables(section.variables),
    interactions: cloneInteractions(section.interactions),
  };
}

export function migratePage(page: LandingPage): LandingPage {
  return {
    ...page,
    variables: cloneVariables(page.variables),
    sections: page.sections.map(migrateSection),
  };
}
