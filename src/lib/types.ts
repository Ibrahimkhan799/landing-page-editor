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
  | "video"
  | "separator"
  | "card"
  | "frame";

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

export type SlotKind = "text" | "element" | "elements";

export type SlotDefinition = {
  id: string;
  label: string;
  kind: SlotKind;
  accept?: ElementType[];
};

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

export type BoxEdges = {
  top: string;
  right: string;
  bottom: string;
  left: string;
};

export type Breakpoint = "desktop" | "tablet" | "mobile";

export type InteractionState = "default" | "hover" | "focus" | "disabled";

export type StyleProps = {
  display?: string;
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  alignSelf?: string;
  gap?: string;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  height?: string;
  minHeight?: string;
  maxHeight?: string;
  padding?: Partial<BoxEdges>;
  margin?: Partial<BoxEdges>;
  color?: string;
  background?: string;
  backgroundImage?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  fontStyle?: string;
  lineHeight?: string;
  letterSpacing?: string;
  textAlign?: string;
  textDecoration?: string;
  textTransform?: string;
  borderWidth?: string;
  borderStyle?: string;
  borderColor?: string;
  borderRadius?: string;
  boxShadow?: string;
  opacity?: string;
  overflow?: string;
  position?: string;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  zIndex?: string;
  rotate?: string;
  scale?: string;
  filterBlur?: string;
  backdropBlur?: string;
  cursor?: string;
};

export type StyleOverrides = {
  tablet?: StyleProps;
  mobile?: StyleProps;
};

export type InteractionStates = {
  hover?: StyleProps;
  focus?: StyleProps;
  disabled?: StyleProps;
};

export type NodeMeta = {
  className?: string;
  htmlId?: string;
  styles?: StyleProps;
  responsive?: StyleOverrides;
  states?: InteractionStates;
};

export type PageElement = NodeMeta & {
  id: string;
  type: ElementType;
  props: Record<string, unknown>;
};

export type SlotValue = string | PageElement | PageElement[] | null;

export type PageSection = NodeMeta & {
  id: string;
  type: SectionType;
  name: string;
  props: Record<string, unknown>;
  slots?: Record<string, SlotValue>;
  elements?: PageElement[];
  componentId?: string;
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

export type ElementRef = {
  sectionId: string;
  slotId: string;
  elementId: string;
};

export type Selection =
  | { kind: "page" }
  | { kind: "section"; sectionId: string }
  | { kind: "slot"; sectionId: string; slotId: string }
  | { kind: "element"; sectionId: string; slotId: string; elementId: string }
  | { kind: "elements"; items: ElementRef[] };

export type AlignKind =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom"
  | "distribute-horizontal"
  | "distribute-vertical";
