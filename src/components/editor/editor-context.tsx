"use client";

import { arrayMove } from "@dnd-kit/sortable";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cloneElementNode, cloneSection, createBlankBlockSection, createElement, createSection } from "@/lib/defaults";
import { migratePage } from "@/lib/migrate";
import { alignStylePatch, applyStyleBucket, cloneStyleProps, editingBucket, mergeStyles } from "@/lib/node-styles";
import {
  defaultElementsSlot,
  findElement,
  frameSlotId,
  getElementPlacementIssue,
  getElementStructureIssue,
  isContainerElement,
  isElementEditableInInstance,
  isSlotEditableInInstance,
  parseFrameSlotId,
  replaceSlotElements,
  slotElements,
  slotDefs,
} from "@/lib/slots";
import { encloseElements, getEnclosureIssue, type EnclosureType } from "@/lib/tree-operations";
import type {
  AlignKind,
  Breakpoint,
  ElementRef,
  ElementType,
  InteractionState,
  LandingPage,
  NodeMeta,
  PageElement,
  PageSection,
  SavedComponent,
  SectionType,
  Selection,
  SlotValue,
  StyleProps,
  ThemeConfig,
} from "@/lib/types";

const CLIP_MARK = "__LP_EDITOR_V1__";

type ClipboardPayload =
  | { kind: "section"; section: PageSection }
  | {
      kind: "element";
      element: PageElement;
      origin: { sectionId: string; slotId: string; index: number };
    }
  | {
      kind: "elements";
      elements: PageElement[];
      origin: { sectionId: string; slotId: string; index: number };
    };

function mapSection(page: LandingPage, sectionId: string, updater: (section: PageSection) => PageSection) {
  return {
    ...page,
    sections: page.sections.map((section) => (section.id === sectionId ? updater(section) : section)),
  };
}

function mapTree(elements: PageElement[], elementId: string, updater: (element: PageElement) => PageElement): PageElement[] {
  return elements.map((element) => {
    if (element.id === elementId) return updater(element);
    if (element.children?.length) {
      return { ...element, children: mapTree(element.children, elementId, updater) };
    }
    return element;
  });
}

function mapElement(section: PageSection, elementId: string, updater: (element: PageElement) => PageElement) {
  const slots = { ...section.slots };
  for (const [key, value] of Object.entries(slots)) {
    if (Array.isArray(value)) {
      slots[key] = mapTree(value, elementId, updater);
    } else if (value && typeof value === "object" && "id" in value) {
      const element = value as PageElement;
      if (element.id === elementId) slots[key] = updater(element);
      else if (element.children?.length) {
        slots[key] = { ...element, children: mapTree(element.children, elementId, updater) };
      }
    }
  }
  return { ...section, slots };
}

function stripElement(elements: PageElement[], elementId: string): PageElement[] {
  return elements
    .filter((element) => element.id !== elementId)
    .map((element) =>
      element.children?.length ? { ...element, children: stripElement(element.children, elementId) } : element,
    );
}

function appendChild(
  elements: PageElement[],
  parentId: string,
  child: PageElement,
  atIndex?: number,
): PageElement[] {
  return elements.map((element) => {
    if (element.id === parentId) {
      const kids = [...(element.children ?? [])];
      if (typeof atIndex === "number" && atIndex >= 0 && atIndex <= kids.length) {
        kids.splice(atIndex, 0, child);
      } else {
        kids.push(child);
      }
      return { ...element, children: kids };
    }
    if (element.children?.length) {
      return { ...element, children: appendChild(element.children, parentId, child, atIndex) };
    }
    return element;
  });
}

function findInTree(elements: PageElement[], elementId: string): PageElement | null {
  for (const element of elements) {
    if (element.id === elementId) return element;
    if (element.children?.length) {
      const nested = findInTree(element.children, elementId);
      if (nested) return nested;
    }
  }
  return null;
}

function insertIntoSlot(section: PageSection, slotId: string, element: PageElement, index?: number): PageSection {
  const list = [...slotElements(section, slotId)];
  const at = index === undefined ? list.length : Math.max(0, Math.min(index, list.length));
  list.splice(at, 0, element);
  return replaceSlotElements(section, slotId, list);
}

function elementIndex(section: PageSection, slotId: string, elementId: string) {
  return slotElements(section, slotId).findIndex((element) => element.id === elementId);
}

function selectionRefs(selection: Selection): ElementRef[] {
  if (selection.kind === "element") {
    return [{ sectionId: selection.sectionId, slotId: selection.slotId, elementId: selection.elementId }];
  }
  if (selection.kind === "elements") return selection.items;
  return [];
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

export type LayerRevealRequest = {
  id: number;
  target: Selection;
};

type EditorContextValue = {
  page: LandingPage;
  selection: Selection;
  layerRevealRequest: LayerRevealRequest | null;
  dirty: boolean;
  saving: boolean;
  breakpoint: Breakpoint;
  previewState: InteractionState;
  setBreakpoint: (breakpoint: Breakpoint) => void;
  setPreviewState: (state: InteractionState) => void;
  setSelection: (selection: Selection) => void;
  requestLayerReveal: (target: Selection) => void;
  toggleSelectElement: (ref: ElementRef, additive?: boolean) => void;
  updatePage: (patch: Partial<LandingPage>) => void;
  replacePage: (page: LandingPage) => void;
  updateTheme: (patch: Partial<ThemeConfig> | { colors: Partial<ThemeConfig["colors"]> } | { fonts: Partial<ThemeConfig["fonts"]> }) => void;
  addSection: (type: SectionType, atIndex?: number) => void;
  insertElementBetweenSections: (type: ElementType, atIndex: number, props?: Record<string, unknown>) => void;
  insertSavedSection: (component: SavedComponent, atIndex?: number) => void;
  duplicateSection: (sectionId: string) => void;
  removeSection: (sectionId: string) => void;
  moveSection: (from: number, to: number) => void;
  updateSection: (sectionId: string, patch: Partial<PageSection>) => void;
  updateSectionProp: (sectionId: string, key: string, value: unknown) => void;
  updateSlot: (sectionId: string, slotId: string, value: SlotValue) => void;
  addElement: (
    sectionId: string,
    type: ElementType,
    slotId?: string,
    atIndex?: number,
    props?: Record<string, unknown>,
  ) => void;
  removeElement: (sectionId: string, elementId: string) => void;
  duplicateElement: (sectionId: string, elementId: string) => void;
  /** Explicit targets take precedence over the current selection. False means no edit was made. */
  encloseSelection: (type: EnclosureType, target?: Selection) => boolean;
  encloseElement: (sectionId: string, elementId: string, type: EnclosureType) => boolean;
  moveElement: (sectionId: string, slotId: string, from: number, to: number) => void;
  relocateElement: (
    fromSectionId: string,
    fromSlotId: string,
    elementId: string,
    toSectionId: string,
    toSlotId: string,
    atIndex?: number,
  ) => void;
  updateElement: (sectionId: string, elementId: string, patch: Partial<PageElement>) => void;
  updateElementProp: (sectionId: string, elementId: string, key: string, value: unknown) => void;
  updateElementMeta: (sectionId: string, elementId: string, patch: NodeMeta) => void;
  updateSelectedStyles: (styles: StyleProps) => void;
  copySelection: () => void;
  pasteClipboard: (inPlace?: boolean) => Promise<boolean>;
  alignSelection: (kind: AlignKind) => void;
  selectSlotSiblings: (sectionId: string, slotId: string) => void;
  replaceSection: (sectionId: string, next: PageSection) => void;
  syncComponentInstances: (componentId: string, sourceSectionId: string) => void;
  selectedSection: PageSection | null;
  selectedElement: PageElement | null;
  selectedElements: PageElement[];
  selectedRefs: ElementRef[];
  selectedSlotId: string | null;
  canAlign: boolean;
  save: () => Promise<void>;
  editorMode: "page" | "component";
};

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({
  initialPage,
  children,
  persistPage,
  mode = "page",
}: {
  initialPage: LandingPage;
  children: ReactNode;
  /** Override default page PUT — used by the isolated component editor. */
  persistPage?: (page: LandingPage) => Promise<LandingPage>;
  mode?: "page" | "component";
}) {
  const [page, setPage] = useState(() => migratePage(initialPage));
  const pageRef = useRef(page);
  const persistRef = useRef(persistPage);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);
  useEffect(() => {
    persistRef.current = persistPage;
  }, [persistPage]);
  const [selection, setSelection] = useState<Selection>({ kind: "page" });
  const [layerRevealRequest, setLayerRevealRequest] = useState<LayerRevealRequest | null>(null);
  const layerRevealIdRef = useRef(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("desktop");
  const [previewState, setPreviewState] = useState<InteractionState>("default");
  const breakpointRef = useRef(breakpoint);
  const previewStateRef = useRef(previewState);
  const selectionRef = useRef(selection);
  const clipboardRef = useRef<ClipboardPayload | null>(null);
  useEffect(() => {
    breakpointRef.current = breakpoint;
  }, [breakpoint]);
  useEffect(() => {
    previewStateRef.current = previewState;
  }, [previewState]);
  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  const requestLayerReveal = useCallback((target: Selection) => {
    layerRevealIdRef.current += 1;
    setLayerRevealRequest({ id: layerRevealIdRef.current, target });
  }, []);

  const mutate = useCallback((updater: (current: LandingPage) => LandingPage) => {
    setPage((current) => updater(current));
    setDirty(true);
  }, []);

  const updatePage = useCallback(
    (patch: Partial<LandingPage>) => mutate((current) => ({ ...current, ...patch })),
    [mutate],
  );

  const replacePage = useCallback((importedPage: LandingPage) => {
    const current = pageRef.current;
    const next = migratePage({
      ...importedPage,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: current.updatedAt,
    });
    pageRef.current = next;
    selectionRef.current = { kind: "page" };
    setPage(next);
    setSelection({ kind: "page" });
    setLayerRevealRequest(null);
    setPreviewState("default");
    setDirty(true);
  }, []);

  const updateTheme = useCallback(
    (patch: EditorContextValue["updateTheme"] extends (p: infer P) => void ? P : never) => {
      mutate((current) => ({
        ...current,
        theme: {
          ...current.theme,
          ...patch,
          colors: { ...current.theme.colors, ...("colors" in patch ? patch.colors : {}) },
          fonts: { ...current.theme.fonts, ...("fonts" in patch ? patch.fonts : {}) },
        },
      }));
    },
    [mutate],
  );

  const addSection = useCallback(
    (type: SectionType, atIndex?: number) => {
      const section = createSection(type);
      mutate((current) => {
        const sections = [...current.sections];
        sections.splice(atIndex ?? sections.length, 0, section);
        return { ...current, sections };
      });
      setSelection({ kind: "section", sectionId: section.id });
    },
    [mutate],
  );

  const insertElementBetweenSections = useCallback(
    (type: ElementType, atIndex: number, props?: Record<string, unknown>) => {
      const element = createElement(type, props);
      const section = createBlankBlockSection({ name: "Block", element });
      mutate((current) => {
        const sections = [...current.sections];
        sections.splice(atIndex, 0, section);
        return { ...current, sections };
      });
      setSelection({ kind: "element", sectionId: section.id, slotId: "body", elementId: element.id });
    },
    [mutate],
  );

  const insertSavedSection = useCallback(
    (component: SavedComponent, atIndex?: number) => {
      const section = cloneSection({ ...component.section, id: "tmp" }, { name: component.name });
      section.componentId = component.id;
      mutate((current) => {
        const sections = [...current.sections];
        sections.splice(atIndex ?? sections.length, 0, section);
        return { ...current, sections };
      });
      setSelection({ kind: "section", sectionId: section.id });
    },
    [mutate],
  );

  const duplicateSection = useCallback(
    (sectionId: string) => {
      mutate((current) => {
        const index = current.sections.findIndex((section) => section.id === sectionId);
        if (index < 0) return current;
        const copy = cloneSection(current.sections[index]);
        const sections = [...current.sections];
        sections.splice(index + 1, 0, copy);
        return { ...current, sections };
      });
    },
    [mutate],
  );

  const removeSection = useCallback(
    (sectionId: string) => {
      mutate((current) => ({ ...current, sections: current.sections.filter((section) => section.id !== sectionId) }));
      setSelection({ kind: "page" });
    },
    [mutate],
  );

  const moveSection = useCallback(
    (from: number, to: number) => {
      mutate((current) => ({ ...current, sections: arrayMove(current.sections, from, to) }));
    },
    [mutate],
  );

  const updateSection = useCallback(
    (sectionId: string, patch: Partial<PageSection>) => {
      mutate((current) => mapSection(current, sectionId, (section) => ({ ...section, ...patch })));
    },
    [mutate],
  );

  const replaceSection = useCallback(
    (sectionId: string, next: PageSection) => {
      mutate((current) => ({
        ...current,
        sections: current.sections.map((section) => (section.id === sectionId ? next : section)),
      }));
    },
    [mutate],
  );

  const syncComponentInstances = useCallback(
    (componentId: string, sourceSectionId: string) => {
      mutate((current) => {
        const source = current.sections.find((section) => section.id === sourceSectionId);
        if (!source) return current;
        return {
          ...current,
          sections: current.sections.map((section) => {
            if (section.id === sourceSectionId || section.componentId !== componentId) return section;
            const copy = cloneSection(source, { id: section.id, name: section.name });
            copy.componentId = componentId;
            copy.slotOverrides = section.slotOverrides;
            return copy;
          }),
        };
      });
    },
    [mutate],
  );

  const updateSectionProp = useCallback(
    (sectionId: string, key: string, value: unknown) => {
      mutate((current) =>
        mapSection(current, sectionId, (section) => ({ ...section, props: { ...section.props, [key]: value } })),
      );
    },
    [mutate],
  );

  const updateSlot = useCallback(
    (sectionId: string, slotId: string, value: SlotValue) => {
      mutate((current) =>
        mapSection(current, sectionId, (section) =>
          mode !== "component" && !isSlotEditableInInstance(section, slotId)
            ? section
            : { ...section, slots: { ...section.slots, [slotId]: value } },
        ),
      );
    },
    [mode, mutate],
  );

  const addElement = useCallback(
    (
      sectionId: string,
      type: ElementType,
      slotId?: string,
      atIndex?: number,
      props?: Record<string, unknown>,
    ) => {
      const element = createElement(type, props);
      const requestedSlot = slotId;
      const sectionSnapshot = page.sections.find((section) => section.id === sectionId);
      const currentSelection = selectionRef.current;
      const selectedSlot =
        currentSelection.kind === "element" && currentSelection.sectionId === sectionId && sectionSnapshot
          ? isContainerElement(findElement(sectionSnapshot, currentSelection.elementId)?.element.type)
            ? frameSlotId(currentSelection.elementId)
            : currentSelection.slotId
          : currentSelection.kind === "slot" && currentSelection.sectionId === sectionId
            ? currentSelection.slotId
            : undefined;
      const initialTarget = requestedSlot ?? selectedSlot;
      if (sectionSnapshot && requestedSlot && getElementPlacementIssue(sectionSnapshot, requestedSlot, element, {
        allowComponentRoot: mode === "component",
      })) {
        return;
      }
      if (
        sectionSnapshot?.componentId &&
        mode !== "component" &&
        (!initialTarget || !isSlotEditableInInstance(sectionSnapshot, initialTarget))
      ) {
        return;
      }
      if (sectionSnapshot && !requestedSlot) {
        const canInsert =
          (initialTarget &&
            !getElementPlacementIssue(sectionSnapshot, initialTarget, element, {
              allowComponentRoot: mode === "component",
            })) ||
          slotDefs(sectionSnapshot.type).some(
            (slot) =>
              (slot.kind === "element" || slot.kind === "elements") &&
              !getElementPlacementIssue(sectionSnapshot, slot.id, element, {
                allowComponentRoot: mode === "component",
              }),
          );
        if (!canInsert) return;
      }
      let targetSlot = slotId;
      mutate((current) =>
        mapSection(current, sectionId, (section) => {
          const currentSelection = selectionRef.current;
          const selectedFrameId =
            currentSelection.kind === "element" && currentSelection.sectionId === sectionId
              ? isContainerElement(findElement(section, currentSelection.elementId)?.element.type)
                ? currentSelection.elementId
                : parseFrameSlotId(currentSelection.slotId)
              : currentSelection.kind === "slot" && currentSelection.sectionId === sectionId
                ? parseFrameSlotId(currentSelection.slotId)
                : null;

          const explicitFrame = targetSlot ? parseFrameSlotId(targetSlot) : null;
          const frameParent = explicitFrame ?? (!targetSlot ? selectedFrameId : null);

          if (frameParent) {
            targetSlot = frameSlotId(frameParent);
            if (getElementPlacementIssue(section, targetSlot, element, { allowComponentRoot: mode === "component" })) {
              return section;
            }
            const slots = { ...section.slots };
            for (const [key, value] of Object.entries(slots)) {
              if (key.startsWith("frame:")) continue;
              if (Array.isArray(value)) slots[key] = appendChild(value, frameParent, element, atIndex);
              else if (value && typeof value === "object" && "id" in value) {
                const node = value as PageElement;
                if (node.id === frameParent) {
                  const kids = [...(node.children ?? [])];
                  const insertAt = atIndex === undefined ? kids.length : Math.max(0, Math.min(atIndex, kids.length));
                  kids.splice(insertAt, 0, element);
                  slots[key] = { ...node, children: kids };
                } else if (node.children?.length) {
                  slots[key] = { ...node, children: appendChild(node.children, frameParent, element, atIndex) };
                }
              }
            }
            return { ...section, slots };
          }

          const defs = slotDefs(section.type);
          const preferred =
            targetSlot ??
            (currentSelection.kind === "slot" && currentSelection.sectionId === sectionId
              ? currentSelection.slotId
              : undefined) ??
            (currentSelection.kind === "element" && currentSelection.sectionId === sectionId
              ? currentSelection.slotId
              : undefined) ??
            defs.find((slot) => slot.kind === "element" && !(section.slots ?? {})[slot.id])?.id ??
            defaultElementsSlot(section);
          targetSlot = preferred;
          const def = defs.find((slot) => slot.id === preferred);
          let accepted =
            !def?.accept?.length || def.accept.includes(type)
              ? preferred
              : defs.find(
                  (slot) =>
                    (slot.kind === "element" || slot.kind === "elements") &&
                    (!slot.accept?.length || slot.accept.includes(type)),
                )?.id ?? preferred;
          if (getElementPlacementIssue(section, accepted, element, { allowComponentRoot: mode === "component" })) {
            if (requestedSlot) return section;
            const fallback = defs.find(
              (slot) =>
                (slot.kind === "element" || slot.kind === "elements") &&
                !getElementPlacementIssue(section, slot.id, element, { allowComponentRoot: mode === "component" }),
            );
            if (!fallback) return section;
            accepted = fallback.id;
          }
          targetSlot = accepted;
          if (parseFrameSlotId(accepted)) {
            const parent = parseFrameSlotId(accepted)!;
            targetSlot = frameSlotId(parent);
            const slots = { ...section.slots };
            for (const [key, value] of Object.entries(slots)) {
              if (Array.isArray(value)) slots[key] = appendChild(value, parent, element, atIndex);
              else if (value && typeof value === "object" && "id" in value) {
                const node = value as PageElement;
                if (node.id === parent) {
                  const kids = [...(node.children ?? [])];
                  const at = atIndex === undefined ? kids.length : Math.max(0, Math.min(atIndex, kids.length));
                  kids.splice(at, 0, element);
                  slots[key] = { ...node, children: kids };
                } else if (node.children?.length) {
                  slots[key] = { ...node, children: appendChild(node.children, parent, element, atIndex) };
                }
              }
            }
            return { ...section, slots };
          }
          const targetDef = defs.find((slot) => slot.id === accepted);
          const slots = { ...section.slots };
          if (targetDef?.kind === "element") {
            slots[accepted] = element;
          } else {
            const currentValue = Array.isArray(slots[accepted]) ? [...(slots[accepted] as PageElement[])] : [];
            let insertAt = atIndex;
            if (insertAt === undefined && currentSelection.kind === "element" && currentSelection.slotId === accepted) {
              const selectedIndex = currentValue.findIndex((item) => item.id === currentSelection.elementId);
              if (selectedIndex >= 0) insertAt = selectedIndex + 1;
            }
            const at = insertAt === undefined ? currentValue.length : Math.max(0, Math.min(insertAt, currentValue.length));
            currentValue.splice(at, 0, element);
            slots[accepted] = currentValue;
          }
          return { ...section, slots };
        }),
      );
      setSelection({ kind: "element", sectionId, slotId: targetSlot ?? "extra", elementId: element.id });
    },
    [mode, mutate, page.sections],
  );

  const encloseSelection = useCallback((type: EnclosureType, target?: Selection) => {
    const refs = selectionRefs(target ?? selectionRef.current);
    const options = { allowComponentRoot: mode === "component" };
    if (getEnclosureIssue(pageRef.current, refs, type, options)) return false;
    const wrapper = createElement(type);
    const result = encloseElements(pageRef.current, refs, wrapper, options);
    if (!result.ok) return false;
    mutate((current) => {
      const next = encloseElements(current, refs, wrapper, options);
      return next.ok ? next.page : current;
    });
    setSelection(result.selection);
    requestLayerReveal(result.reveal);
    return true;
  }, [mode, mutate, requestLayerReveal]);

  const encloseElement = useCallback((sectionId: string, elementId: string, type: EnclosureType) => {
    const section = pageRef.current.sections.find((item) => item.id === sectionId);
    const found = section && findElement(section, elementId);
    return found ? encloseSelection(type, { kind: "element", sectionId, slotId: found.slotId, elementId }) : false;
  }, [encloseSelection]);

  const removeElement = useCallback(
    (sectionId: string, elementId: string) => {
      const section = pageRef.current.sections.find((item) => item.id === sectionId);
      const options = { allowComponentRoot: mode === "component" };
      if (!section || getElementStructureIssue(section, elementId, options)) return;
      mutate((current) =>
        mapSection(current, sectionId, (section) => {
          if (getElementStructureIssue(section, elementId, options)) return section;
          const slots = { ...section.slots };
          for (const [key, value] of Object.entries(slots)) {
            if (Array.isArray(value)) slots[key] = stripElement(value, elementId);
            else if (value && typeof value === "object" && "id" in value) {
              const node = value as PageElement;
              if (node.id === elementId) slots[key] = null;
              else if (node.children?.length) slots[key] = { ...node, children: stripElement(node.children, elementId) };
            }
          }
          return { ...section, slots };
        }),
      );
      setSelection({ kind: "section", sectionId });
    },
    [mode, mutate],
  );

  const duplicateElement = useCallback(
    (sectionId: string, elementId: string) => {
      const section = pageRef.current.sections.find((item) => item.id === sectionId);
      const found = section && findElement(section, elementId);
      const options = { allowComponentRoot: mode === "component" };
      if (!section || !found || getElementStructureIssue(section, elementId, options)) return;
      const copy = cloneElementNode(found.element);
      if (getElementPlacementIssue(section, found.slotId, copy, options)) return;
      mutate((current) => mapSection(current, sectionId, (currentSection) => {
        if (getElementStructureIssue(currentSection, elementId, options) ||
          getElementPlacementIssue(currentSection, found.slotId, copy, options)) return currentSection;
        return insertIntoSlot(currentSection, found.slotId, copy, elementIndex(currentSection, found.slotId, elementId) + 1);
      }));
      const next: Selection = { kind: "element", sectionId, slotId: found.slotId, elementId: copy.id };
      setSelection(next);
      requestLayerReveal(next);
    },
    [mode, mutate, requestLayerReveal],
  );

  const relocateElement = useCallback(
    (
      fromSectionId: string,
      fromSlotId: string,
      elementId: string,
      toSectionId: string,
      toSlotId: string,
      atIndex?: number,
    ) => {
      const source = pageRef.current.sections.find((section) => section.id === fromSectionId);
      const destination = pageRef.current.sections.find((section) => section.id === toSectionId);
      const found = source && findElement(source, elementId);
      const options = { allowComponentRoot: mode === "component" };
      if (!source || !destination || !found || found.slotId !== fromSlotId ||
        getElementStructureIssue(source, elementId, options) ||
        getElementPlacementIssue(destination, toSlotId, found.element, options)) return;
      mutate((current) => {
        const sourceSection = current.sections.find((section) => section.id === fromSectionId);
        const destinationSection = current.sections.find((section) => section.id === toSectionId);
        const movingElement = sourceSection ? findElement(sourceSection, elementId)?.element : null;
        if (!sourceSection || !destinationSection || !movingElement) return current;
        if (getElementStructureIssue(sourceSection, elementId, options) ||
          findElement(sourceSection, elementId)?.slotId !== fromSlotId) return current;
        if (
          getElementPlacementIssue(destinationSection, toSlotId, movingElement, {
            allowComponentRoot: mode === "component",
          })
        ) {
          return current;
        }

        const sameContainer = fromSectionId === toSectionId && fromSlotId === toSlotId;

        // Same-container reorder: use arrayMove so up/down land on the same index math
        if (sameContainer && typeof atIndex === "number") {
          const frameParent = parseFrameSlotId(fromSlotId);
          return {
            ...current,
            sections: current.sections.map((section) => {
              if (section.id !== fromSectionId) return section;
              if (frameParent) {
                return mapElement(section, frameParent, (parent) => {
                  const kids = parent.children ?? [];
                  const fromIndex = kids.findIndex((child) => child.id === elementId);
                  if (fromIndex < 0) return parent;
                  const to = Math.max(0, Math.min(atIndex, kids.length - 1));
                  if (fromIndex === to) return parent;
                  return { ...parent, children: arrayMove(kids, fromIndex, to) };
                });
              }
              const value = section.slots?.[fromSlotId];
              if (!Array.isArray(value)) return section;
              const fromIndex = value.findIndex((child) => child.id === elementId);
              if (fromIndex < 0) return section;
              const to = Math.max(0, Math.min(atIndex, value.length - 1));
              if (fromIndex === to) return section;
              return {
                ...section,
                slots: { ...section.slots, [fromSlotId]: arrayMove(value, fromIndex, to) },
              };
            }),
          };
        }

        let moving: PageElement | null = null;
        const stripped = current.sections.map((section) => {
          if (section.id !== fromSectionId) return section;
          const slots = { ...section.slots };
          const frameParent = parseFrameSlotId(fromSlotId);
          if (frameParent) {
            for (const [key, value] of Object.entries(slots)) {
              if (Array.isArray(value)) {
                const found = findInTree(value, elementId);
                if (found) {
                  moving = found;
                  slots[key] = stripElement(value, elementId);
                }
              } else if (value && typeof value === "object" && "id" in value) {
                const node = value as PageElement;
                if (node.id === elementId) {
                  moving = node;
                  slots[key] = null;
                } else if (node.children?.length) {
                  const found = findInTree(node.children, elementId);
                  if (found) {
                    moving = found;
                    slots[key] = { ...node, children: stripElement(node.children, elementId) };
                  }
                }
              }
            }
            return { ...section, slots };
          }
          const value = slots[fromSlotId];
          if (Array.isArray(value)) {
            moving = value.find((element) => element.id === elementId) ?? null;
            slots[fromSlotId] = value.filter((element) => element.id !== elementId);
          } else if (value && typeof value === "object" && "id" in value && value.id === elementId) {
            moving = value as PageElement;
            slots[fromSlotId] = null;
          }
          return { ...section, slots };
        });
        if (!moving) return current;

        const insertAt = atIndex;

        return {
          ...current,
          sections: stripped.map((section) => {
            if (section.id !== toSectionId) return section;
            const toFrame = parseFrameSlotId(toSlotId);
            const slots = { ...section.slots };
            if (toFrame) {
              for (const [key, value] of Object.entries(slots)) {
                if (Array.isArray(value)) {
                  slots[key] = appendChild(value, toFrame, moving as PageElement, insertAt);
                } else if (value && typeof value === "object" && "id" in value) {
                  const node = value as PageElement;
                  if (node.id === toFrame) {
                    const kids = [...(node.children ?? [])];
                    if (typeof insertAt === "number" && insertAt >= 0 && insertAt <= kids.length) {
                      kids.splice(insertAt, 0, moving as PageElement);
                    } else {
                      kids.push(moving as PageElement);
                    }
                    slots[key] = { ...node, children: kids };
                  } else if (node.children?.length) {
                    slots[key] = {
                      ...node,
                      children: appendChild(node.children, toFrame, moving as PageElement, insertAt),
                    };
                  }
                }
              }
              return { ...section, slots };
            }
            const def = slotDefs(section.type).find((slot) => slot.id === toSlotId);
            if (def?.kind === "element") slots[toSlotId] = moving;
            else {
              const list = Array.isArray(slots[toSlotId]) ? [...(slots[toSlotId] as PageElement[])] : [];
              if (typeof insertAt === "number" && insertAt >= 0 && insertAt <= list.length) {
                list.splice(insertAt, 0, moving as PageElement);
              } else {
                list.push(moving as PageElement);
              }
              slots[toSlotId] = list;
            }
            return { ...section, slots };
          }),
        };
      });
      setSelection({ kind: "element", sectionId: toSectionId, slotId: toSlotId, elementId });
    },
    [mode, mutate],
  );

  const moveElement = useCallback(
    (sectionId: string, slotId: string, from: number, to: number) => {
      mutate((current) =>
        mapSection(current, sectionId, (section) => {
          const value = slotElements(section, slotId);
          const moving = value[from];
          if (!moving || getElementStructureIssue(section, moving.id, { allowComponentRoot: mode === "component" })) return section;
          return replaceSlotElements(section, slotId, arrayMove(value, from, to));
        }),
      );
    },
    [mode, mutate],
  );

  const updateElement = useCallback(
    (sectionId: string, elementId: string, patch: Partial<PageElement>) => {
      mutate((current) =>
        mapSection(current, sectionId, (section) =>
          mode !== "component" && !isElementEditableInInstance(section, elementId)
            ? section
            : mapElement(section, elementId, (element) => ({ ...element, ...patch })),
        ),
      );
    },
    [mode, mutate],
  );

  const updateElementProp = useCallback(
    (sectionId: string, elementId: string, key: string, value: unknown) => {
      mutate((current) =>
        mapSection(current, sectionId, (section) => {
          if (mode !== "component" && !isElementEditableInInstance(section, elementId)) return section;
          const mapped = mapElement(section, elementId, (element) => {
            const next = { ...element, props: { ...element.props, [key]: value } };
            return next;
          });
          const found = findElement(mapped, elementId)?.element;
          if (found?.textSlot && found.textSlot.prop === key && typeof value === "string") {
            return {
              ...mapped,
              slotOverrides: { ...(mapped.slotOverrides ?? {}), [found.textSlot.id]: value },
            };
          }
          return mapped;
        }),
      );
    },
    [mode, mutate],
  );

  const updateElementMeta = useCallback(
    (sectionId: string, elementId: string, patch: NodeMeta) => {
      mutate((current) =>
        mapSection(current, sectionId, (section) =>
          mode !== "component" && !isElementEditableInInstance(section, elementId)
            ? section
            : mapElement(section, elementId, (element) => ({
                ...element,
                ...patch,
                styles: patch.styles ?? element.styles,
                responsive: patch.responsive ?? element.responsive,
                states: patch.states ?? element.states,
                animation: patch.animation !== undefined ? patch.animation : element.animation,
              })),
        ),
      );
    },
    [mode, mutate],
  );

  const updateSelectedStyles = useCallback(
    (styles: StyleProps) => {
      const currentSelection = selectionRef.current;
      const bp = breakpointRef.current;
      const state = previewStateRef.current;
      mutate((current) => {
        if (currentSelection.kind === "section") {
          return mapSection(current, currentSelection.sectionId, (section) =>
            applyStyleBucket(section, styles, bp, state) as PageSection,
          );
        }
        const refs =
          currentSelection.kind === "element"
            ? [currentSelection]
            : currentSelection.kind === "elements"
              ? currentSelection.items
              : [];
        if (!refs.length) return current;
        let next = current;
        for (const ref of refs) {
          next = mapSection(next, ref.sectionId, (section) =>
            mode !== "component" && !isElementEditableInInstance(section, ref.elementId)
              ? section
              : mapElement(
                  section,
                  ref.elementId,
                  (element) => applyStyleBucket(element, styles, bp, state) as PageElement,
                ),
          );
        }
        return next;
      });
    },
    [mode, mutate],
  );

  const toggleSelectElement = useCallback((ref: ElementRef, additive = false) => {
    setSelection((current) => {
      if (!additive) return { kind: "element", ...ref };
      const existing = selectionRefs(current).filter(
        (item) => item.sectionId === ref.sectionId && item.slotId === ref.slotId,
      );
      const already = existing.some((item) => item.elementId === ref.elementId);
      const next = already
        ? existing.filter((item) => item.elementId !== ref.elementId)
        : [...existing, ref];
      if (next.length === 0) return { kind: "page" };
      if (next.length === 1) return { kind: "element", ...next[0] };
      return { kind: "elements", items: next };
    });
  }, []);

  const selectSlotSiblings = useCallback((sectionId: string, slotId: string) => {
    const section = pageRef.current.sections.find((item) => item.id === sectionId);
    if (!section) return;
    const items = slotElements(section, slotId).map((element) => ({ sectionId, slotId, elementId: element.id }));
    if (items.length === 1) setSelection({ kind: "element", ...items[0] });
    else if (items.length > 1) setSelection({ kind: "elements", items });
  }, []);

  const writeClipboard = useCallback((payload: ClipboardPayload) => {
    clipboardRef.current = payload;
    try {
      void navigator.clipboard.writeText(`${CLIP_MARK}${JSON.stringify(payload)}`);
    } catch {
      /* clipboard may be unavailable */
    }
  }, []);

  const copySelection = useCallback(() => {
    const currentSelection = selectionRef.current;
    const current = pageRef.current;
    if (currentSelection.kind === "section") {
      const section = current.sections.find((item) => item.id === currentSelection.sectionId);
      if (!section) return;
      writeClipboard({ kind: "section", section: structuredClone(section) });
      return;
    }
    const refs = selectionRefs(currentSelection);
    if (!refs.length) return;
    const section = current.sections.find((item) => item.id === refs[0].sectionId);
    if (!section) return;
    const elements = refs
      .map((ref) => findElement(section, ref.elementId)?.element)
      .filter((element): element is PageElement => Boolean(element))
      .map((element) => structuredClone(element));
    if (!elements.length) return;
    const origin = {
      sectionId: refs[0].sectionId,
      slotId: refs[0].slotId,
      index: elementIndex(section, refs[0].slotId, refs[0].elementId),
    };
    writeClipboard(
      elements.length === 1
        ? { kind: "element", element: elements[0], origin }
        : { kind: "elements", elements, origin },
    );
  }, [writeClipboard]);

  const readClipboard = useCallback(async (): Promise<ClipboardPayload | null> => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.startsWith(CLIP_MARK)) {
        return JSON.parse(text.slice(CLIP_MARK.length)) as ClipboardPayload;
      }
    } catch {
      /* use in-memory clipboard */
    }
    return clipboardRef.current;
  }, []);

  const pasteClipboard = useCallback(
    async (inPlace = false) => {
      const payload = await readClipboard();
      if (!payload) return false;
      const currentSelection = selectionRef.current;
      if (payload.kind === "section") {
        const copy = cloneSection(payload.section, { name: payload.section.name });
        copy.componentId = payload.section.componentId;
        mutate((current) => {
          const sections = [...current.sections];
          const selectedId =
            currentSelection.kind === "page"
              ? null
              : currentSelection.kind === "elements"
                ? currentSelection.items[0]?.sectionId
                : currentSelection.sectionId;
          const index = selectedId ? sections.findIndex((section) => section.id === selectedId) : -1;
          sections.splice(index >= 0 ? index + 1 : sections.length, 0, copy);
          return { ...current, sections };
        });
        setSelection({ kind: "section", sectionId: copy.id });
        return true;
      }
      const elements = payload.kind === "element" ? [payload.element] : payload.elements;
      if (!elements.length) return false;
      const origin = payload.origin;
      let targetSectionId = origin.sectionId;
      let targetSlotId = origin.slotId;
      let index: number | undefined = origin.index;
      const current = pageRef.current;
      if (!inPlace) {
        if (currentSelection.kind === "element") {
          targetSectionId = currentSelection.sectionId;
          const section = current.sections.find((item) => item.id === targetSectionId);
          const found = section && findElement(section, currentSelection.elementId);
          if (!section || !found) return false;
          targetSlotId = found.slotId;
          index = elementIndex(section, targetSlotId, currentSelection.elementId) + 1;
        } else if (currentSelection.kind === "slot") {
          targetSectionId = currentSelection.sectionId;
          targetSlotId = currentSelection.slotId;
          index = undefined;
        } else if (currentSelection.kind === "section") {
          const section = current.sections.find((item) => item.id === currentSelection.sectionId);
          if (!section) return false;
          targetSectionId = section.id;
          targetSlotId = defaultElementsSlot(section);
          index = undefined;
        }
      }
      const section = current.sections.find((item) => item.id === targetSectionId);
      if (!section) return false;
      const copies = elements.map(cloneElementNode);
      const insertCopies = (destination: PageSection): PageSection | null => {
        let updated = destination;
        let cursor = index;
        for (const copy of copies) {
          if (getElementPlacementIssue(updated, targetSlotId, copy, { allowComponentRoot: mode === "component" })) return null;
          updated = insertIntoSlot(updated, targetSlotId, copy, cursor);
          if (cursor !== undefined) cursor += 1;
        }
        return updated;
      };
      if (!insertCopies(section)) return false;
      mutate((page) => mapSection(page, targetSectionId, (section) => insertCopies(section) ?? section));
      const next: Selection = {
        kind: "element",
        sectionId: targetSectionId,
        slotId: targetSlotId,
        elementId: copies[copies.length - 1].id,
      };
      setSelection(next);
      requestLayerReveal(next);
      return true;
    },
    [mode, mutate, readClipboard, requestLayerReveal],
  );

  const alignSelection = useCallback(
    (kind: AlignKind) => {
      const refs = selectionRefs(selectionRef.current);
      if (refs.length < 2) return;
      const bp = breakpointRef.current;
      const state = previewStateRef.current;
      if (kind === "distribute-horizontal" || kind === "distribute-vertical") {
        const nodes = refs
          .map((ref) => document.querySelector(`[data-editor-node="${CSS.escape(ref.elementId)}"]`))
          .filter((node): node is HTMLElement => node instanceof HTMLElement);
        if (nodes.length < 2) return;
        const horizontal = kind === "distribute-horizontal";
        const sizes = nodes.map((node) => (horizontal ? node.offsetWidth : node.offsetHeight));
        const parent = nodes[0].parentElement;
        const parentSize = parent ? (horizontal ? parent.clientWidth : parent.clientHeight) : 0;
        const leftover = Math.max(0, parentSize - sizes.reduce((sum, size) => sum + size, 0));
        const gap = leftover / (nodes.length - 1);
        mutate((current) => {
          let next = current;
          refs.forEach((ref, index) => {
            const spacing = index === refs.length - 1 ? 0 : gap;
            next = mapSection(next, ref.sectionId, (section) =>
              mapElement(section, ref.elementId, (element) => {
                const currentBucket = editingBucket(element, bp, state);
                return applyStyleBucket(
                  element,
                  mergeStyles(cloneStyleProps(currentBucket), {
                    margin: horizontal
                      ? { right: `${Math.round(spacing)}px`, left: "0px" }
                      : { bottom: `${Math.round(spacing)}px`, top: "0px" },
                  }),
                  bp,
                  state,
                ) as PageElement;
              }),
            );
          });
          return next;
        });
        return;
      }
      const patch = alignStylePatch(kind);
      mutate((current) => {
        let next = current;
        for (const ref of refs) {
          next = mapSection(next, ref.sectionId, (section) =>
            mapElement(section, ref.elementId, (element) => {
              const bucketStyles =
                state !== "default"
                  ? element.states?.[state]
                  : bp === "tablet"
                    ? element.responsive?.tablet
                    : bp === "mobile"
                      ? element.responsive?.mobile
                      : element.styles;
              return applyStyleBucket(element, mergeStyles(bucketStyles, patch), bp, state) as PageElement;
            }),
          );
        }
        return next;
      });
    },
    [mutate],
  );

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const snapshot = pageRef.current;
      if (persistRef.current) {
        const next = await persistRef.current(snapshot);
        setPage(migratePage(next));
        setDirty(false);
        return;
      }
      const response = await fetch(`/api/pages/${snapshot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      });
      if (!response.ok) throw new Error("Save failed");
      setPage(migratePage(await response.json()));
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }, []);

  const selectedSection = useMemo(() => {
    if (selection.kind === "page") return null;
    const sectionId = selection.kind === "elements" ? selection.items[0]?.sectionId : selection.sectionId;
    if (!sectionId) return null;
    return page.sections.find((section) => section.id === sectionId) ?? null;
  }, [page.sections, selection]);

  const selectedRefs = useMemo(() => selectionRefs(selection), [selection]);

  const selectedSlotId =
    selection.kind === "slot" || selection.kind === "element"
      ? selection.slotId
      : selection.kind === "elements"
        ? selection.items[0]?.slotId ?? null
        : null;

  const selectedElements = useMemo(() => {
    if (!selectedSection) return [];
    return selectedRefs
      .map((ref) => findElement(selectedSection, ref.elementId)?.element)
      .filter((element): element is PageElement => Boolean(element));
  }, [selectedSection, selectedRefs]);

  const selectedElement = selectedElements.length === 1 ? selectedElements[0] : null;
  const canAlign =
    selectedRefs.length >= 2 &&
    selectedRefs.every((ref) => ref.sectionId === selectedRefs[0].sectionId && ref.slotId === selectedRefs[0].slotId);

  const value = useMemo(
    () => ({
      page,
      selection,
      layerRevealRequest,
      dirty,
      saving,
      breakpoint,
      previewState,
      setBreakpoint,
      setPreviewState,
      setSelection,
      requestLayerReveal,
      toggleSelectElement,
      updatePage,
      replacePage,
      updateTheme,
      addSection,
      insertSavedSection,
      insertElementBetweenSections,
      duplicateSection,
      removeSection,
      moveSection,
      updateSection,
      updateSectionProp,
      updateSlot,
      addElement,
      removeElement,
      duplicateElement,
      moveElement,
      relocateElement,
      updateElement,
      updateElementProp,
      updateElementMeta,
      updateSelectedStyles,
      copySelection,
      pasteClipboard,
      alignSelection,
      selectSlotSiblings,
      replaceSection,
      syncComponentInstances,
      selectedSection,
      selectedElement,
      selectedElements,
      selectedRefs,
      selectedSlotId,
      canAlign,
      save,
      encloseSelection,
      encloseElement,
      editorMode: mode,
    }),
    [
      page,
      selection,
      layerRevealRequest,
      dirty,
      saving,
      breakpoint,
      previewState,
      requestLayerReveal,
      toggleSelectElement,
      updatePage,
      replacePage,
      updateTheme,
      addSection,
      insertSavedSection,
      insertElementBetweenSections,
      duplicateSection,
      removeSection,
      moveSection,
      updateSection,
      updateSectionProp,
      updateSlot,
      addElement,
      removeElement,
      duplicateElement,
      moveElement,
      relocateElement,
      updateElement,
      updateElementProp,
      updateElementMeta,
      updateSelectedStyles,
      copySelection,
      pasteClipboard,
      alignSelection,
      selectSlotSiblings,
      replaceSection,
      syncComponentInstances,
      selectedSection,
      selectedElement,
      selectedElements,
      selectedRefs,
      selectedSlotId,
      canAlign,
      save,
      encloseSelection,
      encloseElement,
      mode,
    ],
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) throw new Error("useEditor must be used inside EditorProvider");
  return context;
}

export { isTypingTarget };
