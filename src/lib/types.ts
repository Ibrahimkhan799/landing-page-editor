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
  | "frame"
  | "slot"
  | "list"
  | "shape"
  | "svg"
  | "conditional";

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
  textGradient?: string;
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
  flexWrap?: string;
  flexGrow?: string;
  flexShrink?: string;
  flexBasis?: string;
  aspectRatio?: string;
  objectFit?: string;
  objectPosition?: string;
  translateX?: string;
  translateY?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridColumn?: string;
  gridRow?: string;
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

export type VariableType = "text" | "number" | "boolean" | "array" | "object";

export type ValueBinding =
  | { mode: "variable"; variableId: string; path?: string }
  | { mode: "expression"; expression: string };

export type ValueSchema = {
  type: VariableType;
  items?: ValueSchema;
  fields?: Record<string, ValueSchema>;
};

export type VariableDefinition = {
  id: string;
  name: string;
  type: VariableType;
  value: unknown;
  schema?: ValueSchema;
};

export type InteractionTrigger =
  | "click"
  | "input"
  | "change"
  | "keydown"
  | "drag-start"
  | "drag-end";

export type InteractionAction =
  | { type: "set-variable"; variableName: string; value: unknown; binding?: ValueBinding }
  | { type: "toggle-variable"; variableName: string }
  | { type: "remove-element"; targetId: string }
  | {
      type: "change-style";
      targetId: string;
      property: keyof StyleProps | `padding.${keyof BoxEdges}` | `margin.${keyof BoxEdges}`;
      value: unknown;
    };

export type InteractionBinding = {
  id: string;
  trigger: InteractionTrigger;
  key?: string;
  action: InteractionAction;
};

export type AnimationTrigger = "in-view" | "in-view-replay" | "load" | "loop";

export type AnimationPreset =
  | "fade-in"
  | "fade-out"
  | "blur-in"
  | "scale-in"
  | "pop"
  | "bounce"
  | "rotate-in"
  | "flip-in"
  | "slide-up"
  | "slide-down"
  | "slide-left"
  | "slide-right"
  | "rise"
  | "float-in"
  | "soft-bounce"
  | "text-fade"
  | "text-slide"
  | "text-blur"
  | "text-scale"
  | "text-wave"
  | "text-reveal"
  | "text-type"
  | "text-flip"
  | "text-blur-up";

export type AnimationConfig = {
  preset: AnimationPreset;
  trigger: AnimationTrigger;
  duration: number;
  delay: number;
  easing: "ease" | "ease-in" | "ease-out" | "ease-in-out" | "linear";
  distance: number;
  stagger: number;
};

export type NodeMeta = {
  /** Original template node whose responsive/state CSS applies to this runtime instance. */
  styleSourceId?: string;
  className?: string;
  htmlId?: string;
  styles?: StyleProps;
  responsive?: StyleOverrides;
  states?: InteractionStates;
  animation?: AnimationConfig | null;
  variables?: VariableDefinition[];
  interactions?: InteractionBinding[];
};

/** Marks a prop on an element as an overridable text slot when used as a component instance. */
export type ElementTextSlot = {
  id: string;
  label: string;
  prop: string;
};

export type PageElement = NodeMeta & {
  id: string;
  type: ElementType;
  props: Record<string, unknown>;
  bindings?: Record<string, ValueBinding>;
  children?: PageElement[];
  /** When set, this element's prop becomes a fillable text slot on component instances. */
  textSlot?: ElementTextSlot | null;
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
  /** Instance overrides for component text/element slots (keyed by slot id). */
  slotOverrides?: Record<string, SlotValue>;
};

export type LandingPage = {
  id: string;
  name: string;
  slug: string;
  clientName: string;
  status: PageStatus;
  theme: ThemeConfig;
  variables?: VariableDefinition[];
  sections: PageSection[];
  createdAt: string;
  updatedAt: string;
};

export type SavedComponent = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
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
