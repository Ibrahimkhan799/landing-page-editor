import {
  conditionalBranch,
  findElement,
  getElementPlacementIssue,
  getElementStructureIssue,
  replaceSlotElements,
  slotElements,
  type ElementPlacementIssue,
} from "@/lib/slots";
import type { ElementRef, LandingPage, PageElement, Selection } from "@/lib/types";

export type EnclosureType = "frame" | "conditional";
export type EnclosureIssue = ElementPlacementIssue | "empty-selection" | "different-parents" | "invalid-scaffold";
type Options = { allowComponentRoot?: boolean };

export function getEnclosureIssue(
  page: LandingPage,
  refs: ElementRef[],
  type: EnclosureType,
  options?: Options,
): EnclosureIssue | null {
  if (!refs.length) return "empty-selection";
  const first = refs[0];
  if (refs.some((ref) => ref.sectionId !== first.sectionId || ref.slotId !== first.slotId)) {
    return "different-parents";
  }
  const section = page.sections.find((item) => item.id === first.sectionId);
  if (!section) return "missing-target";
  for (const ref of refs) {
    const found = findElement(section, ref.elementId);
    if (!found || found.slotId !== ref.slotId) return "missing-target";
    const issue = getElementStructureIssue(section, ref.elementId, options);
    if (issue) return issue;
  }
  // Reusing the replaced node's ID permits a single-element slot replacement
  // while retaining its type, lock and cycle checks. The actual wrapper gets a new ID.
  return getElementPlacementIssue(section, first.slotId, { id: first.elementId, type, props: {} }, options);
}

export type EnclosureResult =
  | { ok: false; issue: EnclosureIssue }
  | { ok: true; page: LandingPage; selection: Selection; reveal: Selection };

/** Atomic sibling replacement. Child IDs, metadata and document order are retained. */
export function encloseElements(
  page: LandingPage,
  refs: ElementRef[],
  wrapper: PageElement,
  options?: Options,
): EnclosureResult {
  if (wrapper.type !== "frame" && wrapper.type !== "conditional") return { ok: false, issue: "invalid-type" };
  const issue = getEnclosureIssue(page, refs, wrapper.type, options);
  if (issue) return { ok: false, issue };
  const { sectionId, slotId } = refs[0];
  const section = page.sections.find((item) => item.id === sectionId)!;
  // A caller-supplied wrapper must be fresh, not an ancestor or another existing node.
  if (page.sections.some((item) => findElement(item, wrapper.id))) return { ok: false, issue: "cycle" };
  const ids = new Set(refs.map((ref) => ref.elementId));
  const siblings = slotElements(section, slotId);
  const children = siblings.filter((element) => ids.has(element.id));
  let enclosed: PageElement;
  if (wrapper.type === "conditional") {
    const branches = wrapper.children ?? [];
    const then = branches.find((branch) => conditionalBranch(branch, wrapper) === "then");
    const otherwise = branches.find((branch) => conditionalBranch(branch, wrapper) === "else");
    if (branches.length !== 2 || !then || !otherwise || then.id === otherwise.id ||
      [then, otherwise].some((branch) => branch.id === wrapper.id || page.sections.some((item) => findElement(item, branch.id)))) {
      return { ok: false, issue: "invalid-scaffold" };
    }
    enclosed = {
      ...wrapper,
      children: [{ ...then, children }, { ...otherwise, children: [] }],
    };
  } else {
    enclosed = { ...wrapper, children };
  }
  const at = siblings.findIndex((element) => ids.has(element.id));
  const next = siblings.filter((element) => !ids.has(element.id));
  next.splice(at, 0, enclosed);
  const selection: Selection = { kind: "element", sectionId, slotId, elementId: enclosed.id };
  return {
    ok: true,
    page: {
      ...page,
      sections: page.sections.map((item) => item.id === sectionId ? replaceSlotElements(item, slotId, next) : item),
    },
    selection,
    // Reveal a child so even previously collapsed ancestors and the new wrapper open.
    reveal: {
      kind: "element",
      sectionId,
      slotId: `frame:${wrapper.type === "conditional" ? enclosed.children![0].id : enclosed.id}`,
      elementId: children[0].id,
    },
  };
}
