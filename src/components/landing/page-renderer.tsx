import { LandingSection } from "@/components/landing/sections";
import { themeStyle } from "@/lib/theme";
import type { LandingPage } from "@/lib/types";

export function PageRenderer({
  page,
  interactive = true,
}: {
  page: LandingPage;
  interactive?: boolean;
}) {
  return (
    <div className="min-h-full overflow-hidden" style={themeStyle(page.theme)}>
      {page.sections.map((section) => (
        <LandingSection key={section.id} section={section} theme={page.theme} interactive={interactive} />
      ))}
    </div>
  );
}
