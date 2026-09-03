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
import { cloneElementNode, cloneSection, createElement, createSection } from "@/lib/defaults";
import { migratePage } from "@/lib/migrate";
import { alignStylePatch, applyStyleBucket, cloneStyleProps, editingBucket, mergeStyles } from "@/lib/node-styles";
import { defaultElementsSlot, findElement, slotDefs } from "@/lib/slots";
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

function mapElement(section: PageSection, elementId: string, updater: (element: PageElement) => PageElement) {
  const slots = { ...section.slots };
  for (const [key, value] of Object.entries(slots)) {
    if (Array.isArray(value)) {
      slots[key] = value.map((element) => (element.id === elementId ? updater(element) : element));
    } else if (value && typeof value === "object" && "id" in value && value.id === elementId) {
      slots[key] = updater(value as PageElement);
    }
  }
  return { ...section, slots };
}

function insertIntoSlot(section: PageSection, slotId: string, element: PageElement, index?: number): PageSection {
  const def = slotDefs(section.type).find((slot) => slot.id === slotId);
  const slots = { ...section.slots };
  if (def?.kind === "element") {
    slots[slotId] = element;
    return { ...section, slots };
  }
  const list = Array.isArray(slots[slotId]) ? [...(slots[slotId] as PageElement[])] : [];
  const at = index === undefined ? list.length : Math.max(0, Math.min(index, list.length));
  list.splice(at, 0, element);
  slots[slotId] = list;
  return { ...section, slots };
}

function elementIndex(section: PageSection, slotId: string, elementId: string) {
  const value = section.slots?.[slotId];
  if (Array.isArray(value)) return value.findIndex((element) => element.id === elementId);
  return 0;
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

type EditorContextValue = {
  page: LandingPage;
  selection: Selection;
  dirty: boolean;
  saving: boolean;
  breakpoint: Breakpoint;
  previewState: InteractionState;
  setBreakpoint: (breakpoint: Breakpoint) => void;
  setPreviewState: (state: InteractionState) => void;
  setSelection: (selection: Selection) => void;
  toggleSelectElement: (ref: ElementRef, additive?: boolean) => void;
  updatePage: (patch: Partial<LandingPage>) => void;
  updateTheme: (patch: Partial<ThemeConfig> | { colors: Partial<ThemeConfig["colors"]> } | { fonts: Partial<ThemeConfig["fonts"]> }) => void;
  addSection: (type: SectionType, atIndex?: number) => void;
  insertSavedSection: (component: SavedComponent) => void;
  duplicateSection: (sectionId: string) => void;
  removeSection: (sectionId: string) => void;
  moveSection: (from: number, to: number) => void;
  updateSection: (sectionId: string, patch: Partial<PageSection>) => void;
  updateSectionProp: (sectionId: string, key: string, value: unknown) => void;
  updateSlot: (sectionId: string, slotId: string, value: SlotValue) => void;
  addElement: (sectionId: string, type: ElementType, slotId?: string) => void;
  removeElement: (sectionId: string, elementId: string) => void;
  duplicateElement: (sectionId: string, elementId: string) => void;
  moveElement: (sectionId: string, slotId: string, from: number, to: number) => void;
  relocateElement: (
    fromSectionId: string,
    fromSlotId: string,
    elementId: string,
    toSectionId: string,
    toSlotId: string,
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
};

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({
  initialPage,
  children,
}: {
  initialPage: LandingPage;
  children: ReactNode;
}) {
  const [page, setPage] = useState(() => migratePage(initialPage));
  const pageRef = useRef(page);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);
  const [selection, setSelection] = useState<Selection>({ kind: "page" });
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

  const mutate = useCallback((updater: (current: LandingPage) => LandingPage) => {
    setPage((current) => updater(current));
    setDirty(true);
  }, []);

  const updatePage = useCallback(
    (patch: Partial<LandingPage>) => mutate((current) => ({ ...current, ...patch })),
    [mutate],
  );

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

  const insertSavedSection = useCallback(
    (component: SavedComponent) => {
      const section = cloneSection({ ...component.section, id: "tmp" }, { name: component.name });
      section.componentId = component.id;
      mutate((current) => ({ ...current, sections: [...current.sections, section] }));
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
        mapSection(current, sectionId, (section) => ({ ...section, slots: { ...section.slots, [slotId]: value } })),
      );
    },
    [mutate],
  );

  const addElement = useCallback(
    (sectionId: string, type: ElementType, slotId?: string) => {
      const element = createElement(type);
      let targetSlot = slotId;
      mutate((current) =>
        mapSection(current, sectionId, (section) => {
          const defs = slotDefs(section.type);
          const currentSelection = selectionRef.current;
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
          const accepted =
            !def?.accept?.length || def.accept.includes(type)
              ? preferred
              : defs.find(
                  (slot) =>
                    (slot.kind === "element" || slot.kind === "elements") &&
                    (!slot.accept?.length || slot.accept.includes(type)),
                )?.id ?? preferred;
          targetSlot = accepted;
          const targetDef = defs.find((slot) => slot.id === accepted);
          const slots = { ...section.slots };
          if (targetDef?.kind === "element") {
            slots[accepted] = element;
          } else {
            const currentValue = Array.isArray(slots[accepted]) ? (slots[accepted] as PageElement[]) : [];
            slots[accepted] = [...currentValue, element];
          }
          return { ...section, slots };
        }),
      );
      setSelection({ kind: "element", sectionId, slotId: targetSlot ?? "extra", elementId: element.id });
    },
    [mutate],
  );

  const removeElement = useCallback(
    (sectionId: string, elementId: string) => {
      mutate((current) =>
        mapSection(current, sectionId, (section) => {
          const slots = { ...section.slots };
          for (const [key, value] of Object.entries(slots)) {
            if (Array.isArray(value)) slots[key] = value.filter((element) => element.id !== elementId);
            else if (value && typeof value === "object" && "id" in value && value.id === elementId) slots[key] = null;
          }
          return { ...section, slots };
        }),
      );
      setSelection({ kind: "section", sectionId });
    },
    [mutate],
  );

  const duplicateElement = useCallback(
    (sectionId: string, elementId: string) => {
      let copyId = "";
      let slotId = "extra";
      mutate((current) =>
        mapSection(current, sectionId, (section) => {
          const found = findElement(section, elementId);
          if (!found) return section;
          const copy = cloneElementNode(found.element);
          copyId = copy.id;
          slotId = found.slotId;
          const def = slotDefs(section.type).find((slot) => slot.id === found.slotId);
          const slots = { ...section.slots };
          if (def?.kind === "element") {
            slots[found.slotId] = copy;
          } else {
            const list = Array.isArray(slots[found.slotId]) ? [...(slots[found.slotId] as PageElement[])] : [];
            const index = list.findIndex((element) => element.id === elementId);
            list.splice(index + 1, 0, copy);
            slots[found.slotId] = list;
          }
          return { ...section, slots };
        }),
      );
      if (copyId) setSelection({ kind: "element", sectionId, slotId, elementId: copyId });
    },
    [mutate],
  );

  const relocateElement = useCallback(
    (fromSectionId: string, fromSlotId: string, elementId: string, toSectionId: string, toSlotId: string) => {
      mutate((current) => {
        let moving: PageElement | null = null;
        const stripped = current.sections.map((section) => {
          if (section.id !== fromSectionId) return section;
          const slots = { ...section.slots };
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
        return {
          ...current,
          sections: stripped.map((section) => {
            if (section.id !== toSectionId) return section;
            const def = slotDefs(section.type).find((slot) => slot.id === toSlotId);
            const slots = { ...section.slots };
            if (def?.kind === "element") slots[toSlotId] = moving;
            else {
              const list = Array.isArray(slots[toSlotId]) ? [...(slots[toSlotId] as PageElement[])] : [];
              list.push(moving as PageElement);
              slots[toSlotId] = list;
            }
            return { ...section, slots };
          }),
        };
      });
      setSelection({ kind: "element", sectionId: toSectionId, slotId: toSlotId, elementId });
    },
    [mutate],
  );

  const moveElement = useCallback(
    (sectionId: string, slotId: string, from: number, to: number) => {
      mutate((current) =>
        mapSection(current, sectionId, (section) => {
          const value = section.slots?.[slotId];
          if (!Array.isArray(value)) return section;
          return { ...section, slots: { ...section.slots, [slotId]: arrayMove(value, from, to) } };
        }),
      );
    },
    [mutate],
  );

  const updateElement = useCallback(
    (sectionId: string, elementId: string, patch: Partial<PageElement>) => {
      mutate((current) =>
        mapSection(current, sectionId, (section) =>
          mapElement(section, elementId, (element) => ({ ...element, ...patch })),
        ),
      );
    },
    [mutate],
  );

  const updateElementProp = useCallback(
    (sectionId: string, elementId: string, key: string, value: unknown) => {
      mutate((current) =>
        mapSection(current, sectionId, (section) =>
          mapElement(section, elementId, (element) => ({ ...element, props: { ...element.props, [key]: value } })),
        ),
      );
    },
    [mutate],
  );

  const updateElementMeta = useCallback(
    (sectionId: string, elementId: string, patch: NodeMeta) => {
      mutate((current) =>
        mapSection(current, sectionId, (section) =>
          mapElement(section, elementId, (element) => ({
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
    [mutate],
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
            mapElement(section, ref.elementId, (element) => applyStyleBucket(element, styles, bp, state) as PageElement),
          );
        }
        return next;
      });
    },
    [mutate],
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
    const value = section.slots?.[slotId];
    const items = Array.isArray(value)
      ? value.map((element) => ({ sectionId, slotId, elementId: element.id }))
      : value && typeof value === "object" && "id" in value
        ? [{ sectionId, slotId, elementId: (value as PageElement).id }]
        : [];
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
      const origin = payload.origin;
      let nextSelection: Selection | null = null;
      mutate((current) => {
        let targetSectionId = origin.sectionId;
        let targetSlotId = origin.slotId;
        let index: number | undefined = origin.index;
        if (!inPlace) {
          if (currentSelection.kind === "element") {
            targetSectionId = currentSelection.sectionId;
            targetSlotId = currentSelection.slotId;
            const section = current.sections.find((item) => item.id === targetSectionId);
            index = section ? elementIndex(section, targetSlotId, currentSelection.elementId) + 1 : 0;
          } else if (currentSelection.kind === "slot") {
            targetSectionId = currentSelection.sectionId;
            targetSlotId = currentSelection.slotId;
            index = undefined;
          } else if (currentSelection.kind === "section") {
            const section = current.sections.find((item) => item.id === currentSelection.sectionId);
            targetSectionId = currentSelection.sectionId;
            targetSlotId = section ? defaultElementsSlot(section) : origin.slotId;
            index = undefined;
          }
        }
        let lastId = "";
        const next = {
          ...current,
          sections: current.sections.map((section) => {
            if (section.id !== targetSectionId) return section;
            let updated = section;
            let cursor = index;
            for (const element of elements) {
              const copy = cloneElementNode(element);
              lastId = copy.id;
              updated = insertIntoSlot(updated, targetSlotId, copy, cursor);
              if (typeof cursor === "number") cursor += 1;
            }
            return updated;
          }),
        };
        if (lastId) {
          nextSelection = {
            kind: "element",
            sectionId: targetSectionId,
            slotId: targetSlotId,
            elementId: lastId,
          };
        }
        return next;
      });
      if (nextSelection) setSelection(nextSelection);
      return true;
    },
    [mutate, readClipboard],
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
      dirty,
      saving,
      breakpoint,
      previewState,
      setBreakpoint,
      setPreviewState,
      setSelection,
      toggleSelectElement,
      updatePage,
      updateTheme,
      addSection,
      insertSavedSection,
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
    }),
    [
      page,
      selection,
      dirty,
      saving,
      breakpoint,
      previewState,
      toggleSelectElement,
      updatePage,
      updateTheme,
      addSection,
      insertSavedSection,
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
