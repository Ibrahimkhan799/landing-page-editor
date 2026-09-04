import { promises as fs } from "fs";
import path from "path";
import { createDemoPage, cloneSection } from "@/lib/defaults";
import { applySlotOverrides, collectSlotOverrides } from "@/lib/component-slots";
import { migratePage } from "@/lib/migrate";
import type { LandingPage, PageSection, SavedComponent } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const PAGES_DIR = path.join(DATA_DIR, "pages");
const COMPONENTS_FILE = path.join(DATA_DIR, "components.json");

async function ensureDirs() {
  await fs.mkdir(PAGES_DIR, { recursive: true });
  try {
    await fs.access(COMPONENTS_FILE);
  } catch {
    await fs.writeFile(COMPONENTS_FILE, "[]\n", "utf8");
  }
}

function pagePath(id: string) {
  return path.join(PAGES_DIR, `${id}.json`);
}

export async function listPages(): Promise<LandingPage[]> {
  await ensureDirs();
  const files = await fs.readdir(PAGES_DIR);
  const jsonFiles = files.filter((file) => file.endsWith(".json"));
  if (jsonFiles.length === 0) {
    const demo = createDemoPage();
    await savePage(demo);
    return [demo];
  }
  const pages = await Promise.all(
    jsonFiles.map(async (file) => {
      const raw = await fs.readFile(path.join(PAGES_DIR, file), "utf8");
      return migratePage(JSON.parse(raw) as LandingPage);
    }),
  );
  if (!pages.some((page) => page.id === "demo-northstar")) {
    const demo = createDemoPage();
    await savePage(demo);
    pages.push(demo);
  }
  return pages.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getPage(id: string): Promise<LandingPage | null> {
  await ensureDirs();
  try {
    const raw = await fs.readFile(pagePath(id), "utf8");
    return migratePage(JSON.parse(raw) as LandingPage);
  } catch {
    if (id === "demo-northstar") {
      const demo = createDemoPage();
      await savePage(demo);
      return demo;
    }
    return null;
  }
}

export async function getPageBySlug(slug: string): Promise<LandingPage | null> {
  const pages = await listPages();
  return pages.find((page) => page.slug === slug) ?? null;
}

export async function savePage(page: LandingPage): Promise<LandingPage> {
  await ensureDirs();
  const next = { ...migratePage(page), updatedAt: new Date().toISOString() };
  await fs.writeFile(pagePath(page.id), JSON.stringify(next, null, 2) + "\n", "utf8");
  return next;
}

export async function deletePage(id: string) {
  await ensureDirs();
  try {
    await fs.unlink(pagePath(id));
  } catch {
    // already gone
  }
}

export async function listComponents(): Promise<SavedComponent[]> {
  await ensureDirs();
  const raw = await fs.readFile(COMPONENTS_FILE, "utf8");
  return JSON.parse(raw) as SavedComponent[];
}

export async function getComponent(id: string): Promise<SavedComponent | null> {
  const all = await listComponents();
  return all.find((item) => item.id === id) ?? null;
}

export async function saveComponent(component: SavedComponent) {
  const all = await listComponents();
  const withStamp: SavedComponent = {
    ...component,
    updatedAt: new Date().toISOString(),
  };
  const next = [withStamp, ...all.filter((item) => item.id !== component.id)];
  await fs.writeFile(COMPONENTS_FILE, JSON.stringify(next, null, 2) + "\n", "utf8");
  return withStamp;
}

export async function deleteComponent(id: string) {
  const all = await listComponents();
  const next = all.filter((item) => item.id !== id);
  await fs.writeFile(COMPONENTS_FILE, JSON.stringify(next, null, 2) + "\n", "utf8");
}

/**
 * Push a saved component master into every page section that references it.
 * Preserves each instance's id, name, and slotOverrides.
 */
export async function syncPagesWithComponent(componentId: string, master: Omit<PageSection, "id">) {
  const pages = await listPages();
  let updated = 0;
  for (const page of pages) {
    let changed = false;
    const sections = page.sections.map((section) => {
      if (section.componentId !== componentId) return section;
      changed = true;
      const overrides = collectSlotOverrides(section);
      const copy = cloneSection({ ...master, id: "tmp" }, { id: section.id, name: section.name });
      copy.componentId = componentId;
      copy.slotOverrides = overrides;
      return applySlotOverrides(copy);
    });
    if (changed) {
      await savePage({ ...page, sections });
      updated += 1;
    }
  }
  return updated;
}
