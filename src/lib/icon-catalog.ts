export type SvgIconDefinition = {
  id: string;
  label: string;
  keywords: string[];
  markup: string;
};

const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

export const SVG_ICON_CATALOG: SvgIconDefinition[] = [
  { id: "arrow-right", label: "Arrow right", keywords: ["next", "forward"], markup: svg('<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>') },
  { id: "arrow-left", label: "Arrow left", keywords: ["back", "previous"], markup: svg('<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>') },
  { id: "chevron-down", label: "Chevron down", keywords: ["dropdown", "expand"], markup: svg('<path d="m6 9 6 6 6-6"/>') },
  { id: "check", label: "Check", keywords: ["done", "success"], markup: svg('<path d="m5 12 4 4L19 6"/>') },
  { id: "x", label: "Close", keywords: ["remove", "cancel"], markup: svg('<path d="M18 6 6 18M6 6l12 12"/>') },
  { id: "plus", label: "Plus", keywords: ["add", "new"], markup: svg('<path d="M12 5v14M5 12h14"/>') },
  { id: "menu", label: "Menu", keywords: ["navigation", "hamburger"], markup: svg('<path d="M4 6h16M4 12h16M4 18h16"/>') },
  { id: "search", label: "Search", keywords: ["find", "magnifier"], markup: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>') },
  { id: "user", label: "User", keywords: ["person", "account"], markup: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>') },
  { id: "mail", label: "Mail", keywords: ["email", "message"], markup: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>') },
  { id: "phone", label: "Phone", keywords: ["call", "contact"], markup: svg('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>') },
  { id: "heart", label: "Heart", keywords: ["like", "favorite"], markup: svg('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>') },
  { id: "star", label: "Star", keywords: ["rating", "favorite"], markup: svg('<path d="m12 2 3.1 6.3L22 9.3l-5 4.9 1.2 6.8-6.2-3.3L5.8 21 7 14.2 2 9.3l6.9-1Z"/>') },
  { id: "play", label: "Play", keywords: ["video", "start"], markup: svg('<circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4Z"/>') },
  { id: "pause", label: "Pause", keywords: ["video", "stop"], markup: svg('<circle cx="12" cy="12" r="10"/><path d="M10 9v6M14 9v6"/>') },
  { id: "sparkles", label: "Sparkles", keywords: ["magic", "ai", "shine"], markup: svg('<path d="m12 3 1.2 4.3L17.5 8.5l-4.3 1.2L12 14l-1.2-4.3-4.3-1.2 4.3-1.2Z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7Z"/>') },
];
