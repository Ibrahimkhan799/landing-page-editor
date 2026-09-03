export type PageStatus = "draft" | "published";

export type ElementType =
  | "heading"
  | "paragraph"
  | "button"
  | "input"
  | "textarea"
  | "select"
  | "checkbox"
  | "badge"
  | "image"
  | "separator"
  | "card";

export type SectionType =
  | "navbar"
  | "hero"
  | "hero-split"
  | "logos"
  | "features"
  | "about"
  | "stats"
  | "services"
  | "testimonials"
  | "pricing"
  | "faq"
  | "gallery"
  | "team"
  | "cta"
  | "contact"
  | "footer"
  | "custom";

export type ThemeConfig = {
  brandName: string;
  logo: string | null;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    mutedForeground: string;
    card: string;
    border: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  radius: number;
};

export type PageElement = {
  id: string;
  type: ElementType;
  props: Record<string, unknown>;
};

export type PageSection = {
  id: string;
  type: SectionType;
  name: string;
  props: Record<string, unknown>;
  elements: PageElement[];
};

export type LandingPage = {
  id: string;
  name: string;
  slug: string;
  clientName: string;
  status: PageStatus;
  theme: ThemeConfig;
  sections: PageSection[];
  createdAt: string;
  updatedAt: string;
};

export type SavedComponent = {
  id: string;
  name: string;
  createdAt: string;
  section: Omit<PageSection, "id">;
};

export type Selection =
  | { kind: "page" }
  | { kind: "section"; sectionId: string }
  | { kind: "element"; sectionId: string; elementId: string };
