import { AnimationStyles } from "@/components/landing/animate";
import { LandingRuntimeProvider, LandingRuntimeScope } from "@/components/landing/runtime";
import { applySlotOverrides } from "@/lib/component-slots";
import { migratePage } from "@/lib/migrate";
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
  const migrated = migratePage(page);
  const prepared = { ...migrated, sections: migrated.sections.map(applySlotOverrides) };
  const css = nodeStylesheet(collectStyledNodes(prepared));
  return (
    <LandingRuntimeProvider page={prepared}>
      <div className="min-h-full overflow-hidden" style={themeStyle(page.theme)}>
        <AnimationStyles />
        {css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}
        {prepared.sections.map((section) => (
          <LandingRuntimeScope key={section.id} nodeId={section.id}>
            <LandingSection section={section} theme={page.theme} interactive={interactive} />
          </LandingRuntimeScope>
        ))}
      </div>
    </LandingRuntimeProvider>
  );
}
