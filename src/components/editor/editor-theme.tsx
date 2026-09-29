"use client";

import { createContext, useContext, type ReactNode } from "react";

const EditorThemeContext = createContext(false);

export function EditorThemeProvider({ dark, children }: { dark: boolean; children: ReactNode }) {
  return <EditorThemeContext value={dark}>{children}</EditorThemeContext>;
}

export function useEditorTheme() {
  return useContext(EditorThemeContext);
}
