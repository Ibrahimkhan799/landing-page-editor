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
import { cloneSection, createElement, createSection } from "@/lib/defaults";
import { migratePage } from "@/lib/migrate";
import { defaultElementsSlot, findElement, slotDefs } from "@/lib/slots";
import type {
  ElementType,
  LandingPage,
  NodeMeta,
  PageElement,
  PageSection,
  SavedComponent,
  SectionType,
  Selection,
  SlotValue,
  ThemeConfig,
} from "@/lib/types";

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

type EditorContextValue = {
  page: LandingPage;
  selection: Selection;
  dirty: boolean;
  saving: boolean;
  setSelection: (selection: Selection) => void;
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
  moveElement: (sectionId: string, slotId: string, from: number, to: number) => void;
  updateElement: (sectionId: string, elementId: string, patch: Partial<PageElement>) => void;
  updateElementProp: (sectionId: string, elementId: string, key: string, value: unknown) => void;
  updateElementMeta: (sectionId: string, elementId: string, patch: NodeMeta) => void;
  selectedSection: PageSection | null;
  selectedElement: PageElement | null;
  selectedSlotId: string | null;
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
      const section = cloneSection({ ...component.section, id: "tmp" });
      section.name = component.name;
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
          const preferred =
            targetSlot ??
            (selection.kind === "slot" && selection.sectionId === sectionId ? selection.slotId : undefined) ??
            (selection.kind === "element" && selection.sectionId === sectionId ? selection.slotId : undefined) ??
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
    [mutate, selection],
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
          })),
        ),
      );
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
    return page.sections.find((section) => section.id === selection.sectionId) ?? null;
  }, [page.sections, selection]);

  const selectedSlotId = selection.kind === "slot" || selection.kind === "element" ? selection.slotId : null;

  const selectedElement = useMemo(() => {
    if (selection.kind !== "element" || !selectedSection) return null;
    return findElement(selectedSection, selection.elementId)?.element ?? null;
  }, [selectedSection, selection]);

  const value = useMemo(
    () => ({
      page,
      selection,
      dirty,
      saving,
      setSelection,
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
      moveElement,
      updateElement,
      updateElementProp,
      updateElementMeta,
      selectedSection,
      selectedElement,
      selectedSlotId,
      save,
    }),
    [
      page,
      selection,
      dirty,
      saving,
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
      moveElement,
      updateElement,
      updateElementProp,
      updateElementMeta,
      selectedSection,
      selectedElement,
      selectedSlotId,
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
