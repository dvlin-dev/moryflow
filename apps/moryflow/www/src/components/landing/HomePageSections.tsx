/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Homepage section assembly — single source for homepage section ordering and component mapping
 */

import { Fragment } from 'react';
import { HOME_SECTION_ORDER } from '../../lib/homepage-sections';
import { AgentFirstHero } from './AgentFirstHero';
import { TrustStrip } from './TrustStrip';
import { FeatureAgents } from './FeatureAgents';
import { FeatureLocal } from './FeatureLocal';
import { FeaturePublish } from './FeaturePublish';
import { CompareStripSection } from './CompareStripSection';
import { DownloadCTA } from './DownloadCTA';

export const HOME_SECTION_COMPONENTS = {
  hero: AgentFirstHero,
  'trust-strip': TrustStrip,
  'feature-agents': FeatureAgents,
  'feature-local': FeatureLocal,
  'feature-publish': FeaturePublish,
  compare: CompareStripSection,
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
