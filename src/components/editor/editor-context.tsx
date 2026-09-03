"use client";

import { arrayMove } from "@dnd-kit/sortable";
import { nanoid } from "nanoid";
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
import { createElement, createSection } from "@/lib/defaults";
import type {
  ElementType,
  LandingPage,
  PageElement,
  PageSection,
  SavedComponent,
  SectionType,
  Selection,
  ThemeConfig,
} from "@/lib/types";

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
  addElement: (sectionId: string, type: ElementType) => void;
  removeElement: (sectionId: string, elementId: string) => void;
  moveElement: (sectionId: string, from: number, to: number) => void;
  updateElement: (sectionId: string, elementId: string, patch: Partial<PageElement>) => void;
  updateElementProp: (sectionId: string, elementId: string, key: string, value: unknown) => void;
  selectedSection: PageSection | null;
  selectedElement: PageElement | null;
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
  const [page, setPage] = useState(initialPage);
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
    (patch: Partial<LandingPage>) => {
      mutate((current) => ({ ...current, ...patch }));
    },
    [mutate],
  );

  const updateTheme = useCallback(
    (patch: EditorContextValue["updateTheme"] extends (p: infer P) => void ? P : never) => {
      mutate((current) => ({
        ...current,
        theme: {
          ...current.theme,
          ...patch,
          colors: {
            ...current.theme.colors,
            ...("colors" in patch ? patch.colors : {}),
          },
          fonts: {
            ...current.theme.fonts,
            ...("fonts" in patch ? patch.fonts : {}),
          },
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
        const index = atIndex ?? sections.length;
        sections.splice(index, 0, section);
        return { ...current, sections };
      });
      setSelection({ kind: "section", sectionId: section.id });
    },
    [mutate],
  );

  const insertSavedSection = useCallback(
    (component: SavedComponent) => {
      const section: PageSection = {
        ...component.section,
        id: nanoid(10),
        elements: component.section.elements.map((element) => ({ ...element, id: nanoid(10) })),
      };
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
        const source = current.sections[index];
        const copy: PageSection = {
          ...source,
          id: nanoid(10),
          name: `${source.name} copy`,
          elements: source.elements.map((element) => ({ ...element, id: nanoid(10) })),
        };
        const sections = [...current.sections];
        sections.splice(index + 1, 0, copy);
        return { ...current, sections };
      });
    },
    [mutate],
  );

  const removeSection = useCallback(
    (sectionId: string) => {
      mutate((current) => ({
        ...current,
        sections: current.sections.filter((section) => section.id !== sectionId),
      }));
      setSelection({ kind: "page" });
    },
    [mutate],
  );

  const moveSection = useCallback(
    (from: number, to: number) => {
      mutate((current) => ({
        ...current,
        sections: arrayMove(current.sections, from, to),
      }));
    },
    [mutate],
  );

  const updateSection = useCallback(
    (sectionId: string, patch: Partial<PageSection>) => {
      mutate((current) => ({
        ...current,
        sections: current.sections.map((section) =>
          section.id === sectionId ? { ...section, ...patch } : section,
        ),
      }));
    },
    [mutate],
  );

  const updateSectionProp = useCallback(
    (sectionId: string, key: string, value: unknown) => {
      mutate((current) => ({
        ...current,
        sections: current.sections.map((section) =>
          section.id === sectionId
            ? { ...section, props: { ...section.props, [key]: value } }
            : section,
        ),
      }));
    },
    [mutate],
  );

  const addElement = useCallback(
    (sectionId: string, type: ElementType) => {
      const element = createElement(type);
      mutate((current) => ({
        ...current,
        sections: current.sections.map((section) =>
          section.id === sectionId
            ? { ...section, elements: [...section.elements, element] }
            : section,
        ),
      }));
      setSelection({ kind: "element", sectionId, elementId: element.id });
    },
    [mutate],
  );

  const removeElement = useCallback(
    (sectionId: string, elementId: string) => {
      mutate((current) => ({
        ...current,
        sections: current.sections.map((section) =>
          section.id === sectionId
            ? { ...section, elements: section.elements.filter((element) => element.id !== elementId) }
            : section,
        ),
      }));
      setSelection({ kind: "section", sectionId });
    },
    [mutate],
  );

  const moveElement = useCallback(
    (sectionId: string, from: number, to: number) => {
      mutate((current) => ({
        ...current,
        sections: current.sections.map((section) =>
          section.id === sectionId
            ? { ...section, elements: arrayMove(section.elements, from, to) }
            : section,
        ),
      }));
    },
    [mutate],
  );

  const updateElement = useCallback(
    (sectionId: string, elementId: string, patch: Partial<PageElement>) => {
      mutate((current) => ({
        ...current,
        sections: current.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                elements: section.elements.map((element) =>
                  element.id === elementId ? { ...element, ...patch } : element,
                ),
              }
            : section,
        ),
      }));
    },
    [mutate],
  );

  const updateElementProp = useCallback(
    (sectionId: string, elementId: string, key: string, value: unknown) => {
      mutate((current) => ({
        ...current,
        sections: current.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                elements: section.elements.map((element) =>
                  element.id === elementId
                    ? { ...element, props: { ...element.props, [key]: value } }
                    : element,
                ),
              }
            : section,
        ),
      }));
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
      const saved = (await response.json()) as LandingPage;
      setPage(saved);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }, []);

  const selectedSection = useMemo(() => {
    if (selection.kind === "page") return null;
    return page.sections.find((section) => section.id === selection.sectionId) ?? null;
  }, [page.sections, selection]);

  const selectedElement = useMemo(() => {
    if (selection.kind !== "element" || !selectedSection) return null;
    return selectedSection.elements.find((element) => element.id === selection.elementId) ?? null;
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
      addElement,
      removeElement,
      moveElement,
      updateElement,
      updateElementProp,
      selectedSection,
      selectedElement,
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
      addElement,
      removeElement,
      moveElement,
      updateElement,
      updateElementProp,
      selectedSection,
      selectedElement,
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
