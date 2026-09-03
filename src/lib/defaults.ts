import { nanoid } from "nanoid";
import { migrateSection } from "@/lib/migrate";
import type {
  ElementType,
  LandingPage,
  PageElement,
  PageSection,
  SectionType,
  SlotValue,
  ThemeConfig,
} from "@/lib/types";

export const FONT_OPTIONS = [
  { label: "Inter", value: "Inter, ui-sans-serif, system-ui, sans-serif" },
  { label: "Poppins", value: "Poppins, ui-sans-serif, system-ui, sans-serif" },
  { label: "Plus Jakarta Sans", value: '"Plus Jakarta Sans", ui-sans-serif, sans-serif' },
  { label: "Space Grotesk", value: '"Space Grotesk", ui-sans-serif, sans-serif' },
  { label: "Playfair Display", value: '"Playfair Display", ui-serif, Georgia, serif' },
  { label: "Merriweather", value: "Merriweather, ui-serif, Georgia, serif" },
  { label: "Outfit", value: "Outfit, ui-sans-serif, system-ui, sans-serif" },
  { label: "DM Sans", value: '"DM Sans", ui-sans-serif, system-ui, sans-serif' },
] as const;

export const defaultTheme = (brandName = "Northstar"): ThemeConfig => ({
  brandName,
  logo: null,
  colors: {
    primary: "#0f766e",
    secondary: "#134e4a",
    accent: "#f59e0b",
    background: "#ffffff",
    foreground: "#0f172a",
    muted: "#f1f5f9",
    mutedForeground: "#64748b",
    card: "#ffffff",
    border: "#e2e8f0",
  },
  fonts: {
    heading: "Poppins, ui-sans-serif, system-ui, sans-serif",
    body: "Inter, ui-sans-serif, system-ui, sans-serif",
  },
  radius: 14,
});

export function createElement(
  type: ElementType,
  props: Record<string, unknown> = {},
): PageElement {
  return {
    id: nanoid(10),
    type,
    props: { ...defaultElementProps(type), ...props },
    className: "",
    htmlId: "",
    styles: {},
  };
}

export function defaultElementProps(type: ElementType): Record<string, unknown> {
  switch (type) {
    case "heading":
      return { text: "A compelling headline", level: "h2", align: "left" };
    case "paragraph":
      return {
        text: "Write supporting copy that explains the value of this section.",
        align: "left",
      };
    case "button":
      return { label: "Get started", href: "#contact", variant: "primary", size: "md" };
    case "input":
      return { label: "Email", placeholder: "you@company.com", inputType: "email", required: true };
    case "textarea":
      return { label: "Message", placeholder: "How can we help?", rows: 4 };
    case "select":
      return {
        label: "Service",
        placeholder: "Choose an option",
        options: "Consulting\nDesign\nDevelopment",
      };
    case "checkbox":
      return { label: "I agree to the privacy policy", checked: false };
    case "badge":
      return { text: "New", variant: "primary" };
    case "image":
      return {
        src: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=80",
        alt: "Team collaborating",
        rounded: true,
      };
    case "video":
      return {
        src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
        alt: "Product video",
      };
    case "separator":
      return { spacing: "md" };
    case "card":
      return {
        title: "Card title",
        body: "Use cards to highlight offers, services, or proof points.",
        footer: "Learn more",
      };
    default:
      return {};
  }
}

function cloneElementNode(element: PageElement): PageElement {
  return {
    ...element,
    id: nanoid(10),
    props: { ...element.props },
    styles: element.styles ? { ...element.styles } : {},
  };
}

export function cloneSection(section: PageSection): PageSection {
  const slots: Record<string, SlotValue> = {};
  for (const [key, value] of Object.entries(section.slots ?? {})) {
    if (Array.isArray(value)) {
      slots[key] = value.map(cloneElementNode);
    } else if (value && typeof value === "object" && "type" in value && "id" in value) {
      slots[key] = cloneElementNode(value as PageElement);
    } else {
      slots[key] = value;
    }
  }
  return {
    ...section,
    id: nanoid(10),
    name: `${section.name} copy`,
    props: { ...section.props },
    slots,
    styles: section.styles ? { ...section.styles } : {},
  };
}

export function createSection(type: SectionType): PageSection {
  const presets: Record<SectionType, () => Omit<PageSection, "id">> = {
    navbar: () => ({
      type: "navbar",
      name: "Navbar",
      props: {
        links: "Features,Pricing,About,Contact",
        ctaLabel: "Book a call",
        ctaHref: "#contact",
        sticky: true,
      },
      elements: [],
    }),
    hero: () => ({
      type: "hero",
      name: "Hero",
      props: {
        eyebrow: "Landing pages for growing brands",
        headline: "Launch a client-ready website in an afternoon",
        subheadline:
          "A visual CMS for agencies. Build, theme, and publish conversion-focused landing pages your clients can keep editing.",
        primaryCta: "Start a project",
        primaryHref: "#contact",
        secondaryCta: "See pricing",
        secondaryHref: "#pricing",
        align: "center",
        showImage: false,
      },
      elements: [],
    }),
    "hero-split": () => ({
      type: "hero-split",
      name: "Split hero",
      props: {
        eyebrow: "For agencies & freelancers",
        headline: "Sell branded landing pages without starting from scratch",
        subheadline:
          "Give every client their own page, colors, logo, and content — then let them update it from a simple editor.",
        primaryCta: "Create a page",
        primaryHref: "#contact",
        secondaryCta: "Browse sections",
        secondaryHref: "#features",
        image:
          "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1400&q=80",
      },
      elements: [],
    }),
    logos: () => ({
      type: "logos",
      name: "Logo cloud",
      props: {
        headline: "Trusted by teams who ship fast",
        logos: "Northwind,Horizon,Lumen,Cascade,Vertex",
      },
      elements: [],
    }),
    features: () => ({
      type: "features",
      name: "Features",
      props: {
        headline: "Everything you need to ship client sites",
        subheadline: "Sections, elements, brand theming, and drag-and-drop — in one studio.",
        items: [
          {
            title: "Visual section builder",
            body: "Drop in hero, pricing, FAQ, contact, and more. Reorder the page in seconds.",
          },
          {
            title: "Shadcn elements",
            body: "Buttons, inputs, dropdowns, and cards that already look production-ready.",
          },
          {
            title: "Brand theming",
            body: "Lock in colors, fonts, radius, and a logo so every page feels on-brand.",
          },
          {
            title: "Client-ready CMS",
            body: "Duplicate a template, swap the copy, publish a unique slug per client.",
          },
          {
            title: "Sortable layout",
            body: "Drag sections and nested elements until the story flows the way you want.",
          },
          {
            title: "Live preview",
            body: "Edit on the left, see the real landing page update instantly.",
          },
        ],
      },
      elements: [],
    }),
    about: () => ({
      type: "about",
      name: "About",
      props: {
        eyebrow: "About the studio",
        headline: "We build pages that help you close",
        body: "Northstar is a landing-page CMS for agencies. Spin up a branded site for each client, keep the same editor, and hand over a page they can update without touching code.",
        image:
          "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1400&q=80",
      },
      elements: [],
    }),
    stats: () => ({
      type: "stats",
      name: "Stats",
      props: {
        items: [
          { value: "48h", label: "Average time to launch" },
          { value: "30+", label: "Built-in sections & elements" },
          { value: "100%", label: "Brand-matched themes" },
          { value: "1-click", label: "Publish to a live URL" },
        ],
      },
      elements: [],
    }),
    services: () => ({
      type: "services",
      name: "Services",
      props: {
        headline: "What we deliver",
        subheadline: "Productized landing pages you can resell.",
        items: [
          {
            title: "Launch kit",
            body: "A complete page with hero, proof, pricing, and contact — ready to rebrand.",
          },
          {
            title: "Retainers",
            body: "Monthly content and theme updates without reopening a design file.",
          },
          {
            title: "Campaign pages",
            body: "Spin up seasonal or offer-specific pages from the same component library.",
          },
        ],
      },
      elements: [],
    }),
    testimonials: () => ({
      type: "testimonials",
      name: "Testimonials",
      props: {
        headline: "Clients who launched with us",
        items: [
          {
            quote:
              "We sold three branded landing pages in a week. The editor is simple enough that clients update copy themselves.",
            name: "Maya Chen",
            role: "Founder, Lumen Agency",
          },
          {
            quote:
              "Theme controls saved us. One logo and a color palette and the whole page felt like our brand.",
            name: "Jonas Reed",
            role: "Marketing lead, Cascade",
          },
          {
            quote:
              "The section library covers 90% of what we pitch. We only customize the story.",
            name: "Priya Shah",
            role: "Freelance designer",
          },
        ],
      },
      elements: [],
    }),
    pricing: () => ({
      type: "pricing",
      name: "Pricing",
      props: {
        headline: "Simple packages for client work",
        subheadline: "Price the page, not the hours.",
        plans: [
          {
            name: "Starter",
            price: "$790",
            period: "one-time",
            features: "5 sections\nBrand theme\nContact form\n1 revision",
            cta: "Choose Starter",
            highlighted: false,
          },
          {
            name: "Growth",
            price: "$1,490",
            period: "one-time",
            features: "Full section set\nCustom components\nCMS access\n3 revisions",
            cta: "Choose Growth",
            highlighted: true,
          },
          {
            name: "Retainer",
            price: "$390",
            period: "/mo",
            features: "Unlimited copy edits\nA/B section swaps\nPriority support\nMonthly report",
            cta: "Start retainer",
            highlighted: false,
          },
        ],
      },
      elements: [],
    }),
    faq: () => ({
      type: "faq",
      name: "FAQ",
      props: {
        headline: "Questions we hear first",
        items: [
          {
            question: "Can clients edit the page themselves?",
            answer:
              "Yes. The studio is a visual CMS — they can change copy, reorder sections, and update brand colors without code.",
          },
          {
            question: "Do you support custom components?",
            answer:
              "Save any section as a reusable component, then drop it onto other client pages.",
          },
          {
            question: "How does publishing work?",
            answer:
              "Each page gets a unique slug. Toggle it to published and it goes live at /p/your-slug.",
          },
        ],
      },
      elements: [],
    }),
    gallery: () => ({
      type: "gallery",
      name: "Gallery",
      props: {
        headline: "Work that converts",
        images: [
          "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80",
          "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=900&q=80",
          "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80",
        ].join("\n"),
      },
      elements: [],
    }),
    team: () => ({
      type: "team",
      name: "Team",
      props: {
        headline: "People behind the pages",
        members: [
          {
            name: "Alex Rivera",
            role: "Creative director",
            image:
              "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
          },
          {
            name: "Sofia Patel",
            role: "Product designer",
            image:
              "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
          },
          {
            name: "Chris Nolan",
            role: "Frontend lead",
            image:
              "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
          },
        ],
      },
      elements: [],
    }),
    cta: () => ({
      type: "cta",
      name: "Call to action",
      props: {
        headline: "Ready to sell your next landing page?",
        subheadline: "Open the studio, duplicate a template, and brand it for your client today.",
        ctaLabel: "Open the CMS",
        ctaHref: "/admin",
      },
      elements: [],
    }),
    contact: () => ({
      type: "contact",
      name: "Contact",
      props: {
        headline: "Tell us about the project",
        subheadline: "Share a few details and we will send a scoped proposal.",
        email: "hello@northstar.studio",
        phone: "+1 (555) 210-8840",
        address: "120 Market Street, Suite 4",
      },
      elements: [
        createElement("input", { label: "Name", placeholder: "Your name", inputType: "text" }),
        createElement("input", {
          label: "Email",
          placeholder: "you@company.com",
          inputType: "email",
        }),
        createElement("select", {
          label: "Budget",
          options: "$1k – $2k\n$2k – $5k\n$5k+",
        }),
        createElement("textarea", { label: "Project details", placeholder: "Goals, timeline, links" }),
        createElement("button", { label: "Send message", href: "#", variant: "primary" }),
      ],
    }),
    footer: () => ({
      type: "footer",
      name: "Footer",
      props: {
        blurb: "A landing-page CMS for agencies who sell websites, not hours.",
        links: "Privacy,Terms,Studio",
        copyright: "© 2026 Northstar Studio. All rights reserved.",
      },
      elements: [],
    }),
    custom: () => ({
      type: "custom",
      name: "Custom section",
      props: {
        headline: "Custom section",
        background: "muted",
      },
      elements: [
        createElement("badge", { text: "Custom" }),
        createElement("heading", { text: "Compose this block yourself" }),
        createElement("paragraph", {
          text: "Add buttons, inputs, cards, and other Shadcn elements, then drag them into order.",
        }),
        createElement("button", { label: "Add another element", href: "#", variant: "secondary" }),
      ],
    }),
  };

  return migrateSection({ id: nanoid(10), ...presets[type]() });
}

export function createBlankPage(
  overrides: Partial<Pick<LandingPage, "name" | "slug" | "clientName">> = {},
): LandingPage {
  const now = new Date().toISOString();
  const name = overrides.name ?? "New landing page";
  return {
    id: nanoid(12),
    name,
    slug: overrides.slug ?? "new-page",
    clientName: overrides.clientName ?? "Internal",
    status: "draft",
    theme: defaultTheme(overrides.clientName ?? name),
    sections: [createSection("navbar"), createSection("hero"), createSection("footer")],
    createdAt: now,
    updatedAt: now,
  };
}

export function createDemoPage(): LandingPage {
  const now = new Date().toISOString();
  return {
    id: "demo-northstar",
    name: "Northstar Studio",
    slug: "northstar",
    clientName: "Northstar",
    status: "published",
    theme: defaultTheme("Northstar"),
    sections: [
      createSection("navbar"),
      createSection("hero"),
      createSection("logos"),
      createSection("features"),
      createSection("about"),
      createSection("stats"),
      createSection("testimonials"),
      createSection("pricing"),
      createSection("faq"),
      createSection("cta"),
      createSection("contact"),
      createSection("footer"),
    ],
    createdAt: now,
    updatedAt: now,
  };
}

export const SECTION_CATALOG: {
  type: SectionType;
  label: string;
  description: string;
  group: "Structure" | "Story" | "Proof" | "Convert";
}[] = [
  { type: "navbar", label: "Navbar", description: "Logo, links, and a call to action", group: "Structure" },
  { type: "hero", label: "Hero", description: "Centered headline and buttons", group: "Story" },
  { type: "hero-split", label: "Split hero", description: "Copy plus a large image", group: "Story" },
  { type: "about", label: "About", description: "Story with a supporting photo", group: "Story" },
  { type: "features", label: "Features", description: "Grid of value props", group: "Story" },
  { type: "services", label: "Services", description: "Three offer cards", group: "Story" },
  { type: "logos", label: "Logo cloud", description: "Social proof wordmarks", group: "Proof" },
  { type: "stats", label: "Stats", description: "Big numbers row", group: "Proof" },
  { type: "testimonials", label: "Testimonials", description: "Quotes from clients", group: "Proof" },
  { type: "gallery", label: "Gallery", description: "Image mosaic", group: "Proof" },
  { type: "team", label: "Team", description: "People and roles", group: "Proof" },
  { type: "pricing", label: "Pricing", description: "Package cards", group: "Convert" },
  { type: "faq", label: "FAQ", description: "Expandable answers", group: "Convert" },
  { type: "cta", label: "Call to action", description: "Closing banner", group: "Convert" },
  { type: "contact", label: "Contact", description: "Details plus a form", group: "Convert" },
  { type: "footer", label: "Footer", description: "Links and copyright", group: "Structure" },
  { type: "custom", label: "Custom", description: "Blank canvas of elements", group: "Structure" },
];

export const ELEMENT_CATALOG: {
  type: ElementType;
  label: string;
  description: string;
}[] = [
  { type: "heading", label: "Heading", description: "H1–H4 title" },
  { type: "paragraph", label: "Paragraph", description: "Body copy" },
  { type: "button", label: "Button", description: "Shadcn button" },
  { type: "input", label: "Input", description: "Text or email field" },
  { type: "textarea", label: "Textarea", description: "Multi-line field" },
  { type: "select", label: "Dropdown", description: "Select menu" },
  { type: "checkbox", label: "Checkbox", description: "Consent or option" },
  { type: "badge", label: "Badge", description: "Small label" },
  { type: "image", label: "Image", description: "Photo or illustration" },
  { type: "video", label: "Video", description: "Embedded clip" },
  { type: "card", label: "Card", description: "Title, body, footer" },
  { type: "separator", label: "Separator", description: "Horizontal rule" },
];
