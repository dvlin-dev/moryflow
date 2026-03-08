/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Homepage section assembly — single source for homepage section ordering and component mapping
 */

import { Fragment } from 'react';
import { HOME_SECTION_ORDER } from '../../lib/homepage-sections';
import { AgentFirstHero } from './AgentFirstHero';
import { CompareStripSection } from './CompareStripSection';
import { CorePillarsSection } from './CorePillarsSection';
import { DownloadCTA } from './DownloadCTA';
import { PublishingSection } from './PublishingSection';
import { SocialProofSection } from './SocialProofSection';
import { TelegramAgentSection } from './TelegramAgentSection';
import { UseCasesSection } from './UseCasesSection';
import { WorkflowLoopSection } from './WorkflowLoopSection';

export const HOME_SECTION_COMPONENTS = {
  hero: AgentFirstHero,
  pillars: CorePillarsSection,
  workflow: WorkflowLoopSection,
  'use-cases': UseCasesSection,
  telegram: TelegramAgentSection,
  compare: CompareStripSection,
  publishing: PublishingSection,
  'social-proof': SocialProofSection,
  'download-cta': DownloadCTA,
} as const;

export function HomePageSections() {
  return HOME_SECTION_ORDER.map((sectionId) => {
    const SectionComponent = HOME_SECTION_COMPONENTS[sectionId];

    return (
      <Fragment key={sectionId}>
        <SectionComponent />
      </Fragment>
    );
  });
}
