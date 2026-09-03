import { LandingSection } from "@/components/landing/sections";
import { collectStyledNodes, nodeStylesheet } from "@/lib/node-styles";
import { themeStyle } from "@/lib/theme";
import type { LandingPage } from "@/lib/types";

export function PageRenderer({
  page,
  interactive = true,
}: {
  page: LandingPage;
  interactive?: boolean;
}) {
  const css = nodeStylesheet(collectStyledNodes(page));
  return (
    <div className="min-h-full overflow-hidden" style={themeStyle(page.theme)}>
      {css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}
      {page.sections.map((section) => (
        <LandingSection key={section.id} section={section} theme={page.theme} interactive={interactive} />
      ))}
    </div>
  );
}
