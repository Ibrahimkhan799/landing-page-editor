import type { LandingPage, PageElement, PageSection, ThemeConfig } from "@/lib/types";

export const PAGE_EXPORT_FORMAT = "landing-page-editor/page" as const;
export const PAGE_EXPORT_VERSION = 1 as const;
export const MAX_PAGE_IMPORT_BYTES = 10 * 1024 * 1024;

const MAX_JSON_DEPTH = 40;
const MAX_JSON_VALUES = 50_000;
const MAX_NODE_COUNT = 10_000;
const MAX_ID_LENGTH = 128;
const SAFE_ID = /^[A-Za-z0-9_-]+$/;

const PAGE_STATUSES = new Set(["draft", "published"]);
const SECTION_TYPES = new Set([
  "navbar",
  "hero",
  "hero-split",
  "logos",
  "features",
  "about",
  "stats",
  "services",
  "testimonials",
  "pricing",
  "faq",
  "gallery",
  "team",
  "cta",
  "contact",
  "footer",
  "custom",
]);
const ELEMENT_TYPES = new Set([
  "heading",
  "paragraph",
  "button",
  "input",
  "textarea",
  "select",
  "checkbox",
  "badge",
  "image",
  "video",
  "separator",
  "card",
  "frame",
  "slot",
  "list",
  "shape",
  "svg",
  "conditional",
]);

export type PageExportEnvelope = {
  format: typeof PAGE_EXPORT_FORMAT;
  version: typeof PAGE_EXPORT_VERSION;
  exportedAt: string;
  page: LandingPage;
};

export type PageSourceFormat = "jsx" | "tsx";
export type StandaloneSourceFormat = "standalone-jsx" | "standalone-tsx";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertString(value: unknown, path: string, options?: { nonEmpty?: boolean; max?: number }): asserts value is string {
  if (typeof value !== "string") throw new Error(`${path} must be a string`);
  if (options?.nonEmpty && !value.trim()) throw new Error(`${path} cannot be empty`);
  if (value.length > (options?.max ?? MAX_PAGE_IMPORT_BYTES)) throw new Error(`${path} is too long`);
}

function assertId(value: unknown, path: string, ids: Set<string>): asserts value is string {
  assertString(value, path, { nonEmpty: true, max: MAX_ID_LENGTH });
  if (!SAFE_ID.test(value)) throw new Error(`${path} contains unsupported characters`);
  if (ids.has(value)) throw new Error(`${path} duplicates the id “${value}”`);
  ids.add(value);
}

function assertJsonValue(value: unknown, path: string, budget: { values: number }, depth = 0): void {
  budget.values += 1;
  if (budget.values > MAX_JSON_VALUES) throw new Error("Page contains too many values");
  if (depth > MAX_JSON_DEPTH) throw new Error(`${path} is nested too deeply`);
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "string") {
    if (value.length > MAX_PAGE_IMPORT_BYTES) throw new Error(`${path} is too long`);
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`${path} must be a finite number`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertJsonValue(item, `${path}[${index}]`, budget, depth + 1));
    return;
  }
  if (isRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      assertJsonValue(item, `${path}.${key}`, budget, depth + 1);
    }
    return;
  }
  throw new Error(`${path} contains a value that JSON cannot represent`);
}

function assertOptionalNodeMeta(value: Record<string, unknown>, path: string): void {
  if (value.className !== undefined) assertString(value.className, `${path}.className`);
  if (value.htmlId !== undefined) assertString(value.htmlId, `${path}.htmlId`);
  for (const key of ["styles", "responsive", "states", "animation"] as const) {
    if (value[key] !== undefined && value[key] !== null && !isRecord(value[key])) {
      throw new Error(`${path}.${key} must be an object${key === "animation" ? " or null" : ""}`);
    }
  }
  if (value.variables !== undefined && !Array.isArray(value.variables)) {
    throw new Error(`${path}.variables must be an array`);
  }
  if (value.interactions !== undefined && !Array.isArray(value.interactions)) {
    throw new Error(`${path}.interactions must be an array`);
  }
}

function assertElement(
  value: unknown,
  path: string,
  ids: Set<string>,
  counts: { nodes: number },
): asserts value is PageElement {
  if (!isRecord(value)) throw new Error(`${path} must be an element object`);
  counts.nodes += 1;
  if (counts.nodes > MAX_NODE_COUNT) throw new Error("Page contains too many sections and elements");
  assertId(value.id, `${path}.id`, ids);
  assertString(value.type, `${path}.type`, { nonEmpty: true, max: 32 });
  if (!ELEMENT_TYPES.has(value.type)) throw new Error(`${path}.type is not supported`);
  if (!isRecord(value.props)) throw new Error(`${path}.props must be an object`);
  assertOptionalNodeMeta(value, path);
  if (value.textSlot !== undefined && value.textSlot !== null) {
    if (!isRecord(value.textSlot)) throw new Error(`${path}.textSlot must be an object or null`);
    assertString(value.textSlot.id, `${path}.textSlot.id`, { nonEmpty: true, max: MAX_ID_LENGTH });
    assertString(value.textSlot.label, `${path}.textSlot.label`);
    assertString(value.textSlot.prop, `${path}.textSlot.prop`, { nonEmpty: true, max: 128 });
  }
  if (value.children !== undefined) {
    if (!Array.isArray(value.children)) throw new Error(`${path}.children must be an array`);
    value.children.forEach((child, index) => assertElement(child, `${path}.children[${index}]`, ids, counts));
  }
}

function assertSlotValue(
  value: unknown,
  path: string,
  ids: Set<string>,
  counts: { nodes: number },
): void {
  if (value === null || typeof value === "string") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertElement(item, `${path}[${index}]`, ids, counts));
    return;
  }
  assertElement(value, path, ids, counts);
}

function assertSection(
  value: unknown,
  path: string,
  ids: Set<string>,
  counts: { nodes: number },
): asserts value is PageSection {
  if (!isRecord(value)) throw new Error(`${path} must be a section object`);
  counts.nodes += 1;
  if (counts.nodes > MAX_NODE_COUNT) throw new Error("Page contains too many sections and elements");
  assertId(value.id, `${path}.id`, ids);
  assertString(value.type, `${path}.type`, { nonEmpty: true, max: 32 });
  if (!SECTION_TYPES.has(value.type)) throw new Error(`${path}.type is not supported`);
  assertString(value.name, `${path}.name`);
  if (!isRecord(value.props)) throw new Error(`${path}.props must be an object`);
  assertOptionalNodeMeta(value, path);
  if (value.componentId !== undefined) assertString(value.componentId, `${path}.componentId`, { nonEmpty: true, max: MAX_ID_LENGTH });
  for (const key of ["slots", "slotOverrides"] as const) {
    if (value[key] === undefined) continue;
    if (!isRecord(value[key])) throw new Error(`${path}.${key} must be an object`);
    for (const [slotId, slotValue] of Object.entries(value[key])) {
      assertSlotValue(slotValue, `${path}.${key}.${slotId}`, ids, counts);
    }
  }
  if (value.elements !== undefined) {
    if (!Array.isArray(value.elements)) throw new Error(`${path}.elements must be an array`);
    value.elements.forEach((element, index) => assertElement(element, `${path}.elements[${index}]`, ids, counts));
  }
}

function assertTheme(value: unknown): asserts value is ThemeConfig {
  if (!isRecord(value)) throw new Error("page.theme must be an object");
  assertString(value.brandName, "page.theme.brandName");
  if (value.logo !== null) assertString(value.logo, "page.theme.logo");
  if (!isRecord(value.colors)) throw new Error("page.theme.colors must be an object");
  for (const key of [
    "primary",
    "secondary",
    "accent",
    "background",
    "foreground",
    "muted",
    "mutedForeground",
    "card",
    "border",
  ]) {
    assertString(value.colors[key], `page.theme.colors.${key}`, { nonEmpty: true, max: 512 });
  }
  if (!isRecord(value.fonts)) throw new Error("page.theme.fonts must be an object");
  assertString(value.fonts.heading, "page.theme.fonts.heading", { nonEmpty: true, max: 512 });
  assertString(value.fonts.body, "page.theme.fonts.body", { nonEmpty: true, max: 512 });
  if (typeof value.radius !== "number" || !Number.isFinite(value.radius)) {
    throw new Error("page.theme.radius must be a finite number");
  }
}

function assertLandingPage(value: unknown): asserts value is LandingPage {
  if (!isRecord(value)) throw new Error("Imported JSON must contain a page object");
  const budget = { values: 0 };
  assertJsonValue(value, "page", budget);
  const ids = new Set<string>();
  const counts = { nodes: 0 };
  assertString(value.id, "page.id", { nonEmpty: true, max: MAX_ID_LENGTH });
  assertString(value.name, "page.name");
  assertString(value.slug, "page.slug", { nonEmpty: true, max: 256 });
  assertString(value.clientName, "page.clientName");
  assertString(value.status, "page.status", { nonEmpty: true, max: 32 });
  if (!PAGE_STATUSES.has(value.status)) throw new Error("page.status must be draft or published");
  assertTheme(value.theme);
  if (value.variables !== undefined && !Array.isArray(value.variables)) {
    throw new Error("page.variables must be an array");
  }
  if (!Array.isArray(value.sections)) throw new Error("page.sections must be an array");
  if (value.sections.length > 500) throw new Error("Page contains too many sections");
  value.sections.forEach((section, index) => assertSection(section, `page.sections[${index}]`, ids, counts));
  assertString(value.createdAt, "page.createdAt", { nonEmpty: true, max: 128 });
  assertString(value.updatedAt, "page.updatedAt", { nonEmpty: true, max: 128 });
}

function utf8Size(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

export function parsePageImport(text: string): LandingPage {
  if (utf8Size(text) > MAX_PAGE_IMPORT_BYTES) {
    throw new Error(`Page JSON exceeds the ${MAX_PAGE_IMPORT_BYTES / 1024 / 1024} MB import limit`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("The selected file is not valid JSON");
  }

  let page: unknown = parsed;
  if (isRecord(parsed) && "format" in parsed) {
    if (parsed.format !== PAGE_EXPORT_FORMAT) throw new Error("This JSON file is not a supported page export");
    if (parsed.version !== PAGE_EXPORT_VERSION) throw new Error(`Page export version ${String(parsed.version)} is not supported`);
    page = parsed.page;
  }
  assertLandingPage(page);
  return page;
}

export function createPageExportEnvelope(page: LandingPage): PageExportEnvelope {
  return {
    format: PAGE_EXPORT_FORMAT,
    version: PAGE_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    page,
  };
}

export function serializePageJson(page: LandingPage): string {
  return `${JSON.stringify(createPageExportEnvelope(page), null, 2)}\n`;
}

function sourceJson(page: LandingPage): string {
  return JSON.stringify(page, null, 2)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

function componentName(name: string): string {
  const words = name.match(/[A-Za-z0-9]+/g) ?? ["Landing", "Page"];
  const identifier = words.map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`).join("");
  return /^[A-Za-z_$]/.test(identifier) ? `${identifier}Page` : `Landing${identifier}Page`;
}

export function serializePageSource(page: LandingPage, format: PageSourceFormat): string {
  const typeImport = format === "tsx" ? 'import type { LandingPage } from "@/lib/types";\n' : "";
  const annotation = format === "tsx" ? ": LandingPage" : "";
  return `import { PageRenderer } from "@/components/landing/page-renderer";\n${typeImport}\nconst page${annotation} = ${sourceJson(page)};\n\nexport default function ${componentName(page.name)}() {\n  return <PageRenderer page={page} />;\n}\n`;
}

export function pageFileStem(page: LandingPage): string {
  const stem = (page.slug || page.name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return stem || "landing-page";
}

function knownEditorGap(element: Element): boolean {
  const classes = element.classList;
  return (
    (classes.contains("h-2") && classes.contains("max-w-6xl")) ||
    (classes.contains("h-1.5") && classes.contains("w-full")) ||
    (classes.contains("items-stretch") && classes.contains("gap-4"))
  );
}

function cleanExportRoot(root: HTMLElement): void {
  root.querySelectorAll("[data-editor-chrome], [data-editor-size], [data-page-export-remove]").forEach((node) => node.remove());

  root.querySelectorAll("button").forEach((button) => {
    const text = button.textContent?.trim() ?? "";
    if (button.classList.contains("border-dashed") && /^Drop\b/i.test(text)) button.remove();
  });

  root.querySelectorAll('[aria-hidden="true"]').forEach((node) => {
    if (node.classList.contains("z-[4]") && node.classList.contains("absolute")) node.remove();
  });

  const elements = Array.from(root.querySelectorAll("*")).reverse();
  for (const element of elements) {
    if (knownEditorGap(element) && !element.children.length && !element.textContent?.trim()) element.remove();
  }

  root.querySelectorAll("[data-editor-overlay]").forEach((node) => {
    node.removeAttribute("data-editor-overlay");
    node.removeAttribute("data-section-id");
    node.removeAttribute("data-slot-id");
    node.removeAttribute("data-element-id");
    if (node instanceof HTMLElement) {
      node.style.removeProperty("transform");
      node.style.removeProperty("transition");
    }
  });
  root.removeAttribute("data-page-export-root");
}

function absoluteUrl(value: string, baseUrl: string): string {
  if (!value || value.startsWith("#") || /^(data:|blob:|mailto:|tel:|javascript:)/i.test(value)) return value;
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return value;
  }
}

function makeAssetUrlsAbsolute(root: HTMLElement, baseUrl: string): void {
  root.querySelectorAll<HTMLElement>("[src], [href], [poster]").forEach((element) => {
    for (const attribute of ["src", "href", "poster"] as const) {
      const value = element.getAttribute(attribute);
      if (value) element.setAttribute(attribute, absoluteUrl(value, baseUrl));
    }
  });
  root.querySelectorAll<HTMLElement>("[srcset]").forEach((element) => {
    const value = element.getAttribute("srcset");
    if (!value) return;
    element.setAttribute(
      "srcset",
      value
        .split(",")
        .map((candidate) => {
          const [url, ...descriptor] = candidate.trim().split(/\s+/);
          return [absoluteUrl(url, baseUrl), ...descriptor].join(" ");
        })
        .join(", "),
    );
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return entities[character];
  });
}

function rewriteCssUrls(css: string, stylesheetUrl: string): string {
  return css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (match, quote: string, value: string) => {
    const trimmed = value.trim();
    if (!trimmed || trimmed.startsWith("#") || /^(data:|blob:)/i.test(trimmed)) return match;
    return `url("${absoluteUrl(trimmed, stylesheetUrl)}")`;
  });
}

function escapeStyleText(css: string): string {
  return css.replace(/<\/style/gi, "<\\/style");
}

type ExportSnapshot = {
  markup: string;
  css: string;
  htmlClasses: string;
};

async function createExportSnapshot(
  exportRoot: HTMLElement,
  sourceDocument: Document = document,
): Promise<ExportSnapshot> {
  const root = exportRoot.cloneNode(true) as HTMLElement;
  cleanExportRoot(root);
  makeAssetUrlsAbsolute(root, sourceDocument.baseURI);

  const cssParts: string[] = [];
  const assets = Array.from(
    sourceDocument.querySelectorAll<HTMLStyleElement | HTMLLinkElement>('style, link[rel~="stylesheet"]'),
  ).filter((node) => !exportRoot.contains(node));

  for (const asset of assets) {
    if (asset instanceof HTMLStyleElement) {
      if (asset.textContent) cssParts.push(rewriteCssUrls(asset.textContent, sourceDocument.baseURI));
      continue;
    }
    const href = absoluteUrl(asset.getAttribute("href") ?? "", sourceDocument.baseURI);
    if (!href) continue;
    let response: Response;
    try {
      response = await fetch(href);
    } catch {
      throw new Error(`Could not read the page stylesheet at ${href}`);
    }
    if (!response.ok) throw new Error(`Could not read the page stylesheet (${response.status})`);
    cssParts.push(rewriteCssUrls(await response.text(), href));
  }

  if (!cssParts.length) throw new Error("No application stylesheets were available for export");

  return {
    markup: root.outerHTML,
    css: cssParts.join("\n"),
    htmlClasses: Array.from(sourceDocument.documentElement.classList)
      .filter((name) => name !== "dark")
      .join(" "),
  };
}

export async function serializePageHtml(
  page: LandingPage,
  exportRoot: HTMLElement,
  sourceDocument: Document = document,
): Promise<string> {
  const snapshot = await createExportSnapshot(exportRoot, sourceDocument);
  return `<!doctype html>\n<html lang="en"${snapshot.htmlClasses ? ` class="${escapeHtml(snapshot.htmlClasses)}"` : ""}>\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${escapeHtml(page.name)}</title>\n<style>${escapeStyleText(snapshot.css)}\nhtml, body { margin: 0; min-height: 100%; }\n*, *::before, *::after { box-sizing: border-box; }\n</style>\n</head>\n<body>\n${snapshot.markup}\n</body>\n</html>\n`;
}

export async function serializeStandalonePageSource(
  page: LandingPage,
  exportRoot: HTMLElement,
  format: StandaloneSourceFormat,
  sourceDocument: Document = document,
): Promise<string> {
  const snapshot = await createExportSnapshot(exportRoot, sourceDocument);
  const name = componentName(page.name);
  const css = JSON.stringify(snapshot.css);
  const markup = JSON.stringify(snapshot.markup);
  const typeNote = format === "standalone-tsx" ? ": string" : "";
  return `import React from "react";\n\nconst styles${typeNote} = ${css};\nconst markup${typeNote} = ${markup};\n\n/** Static, self-contained snapshot exported from Landing Page Editor. */\nexport default function ${name}() {\n  return (\n    <>\n      <style>{styles}</style>\n      <div dangerouslySetInnerHTML={{ __html: markup }} />\n    </>\n  );\n}\n`;
}
