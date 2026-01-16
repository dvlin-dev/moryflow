import { Container } from '@/components/layout';
import {
  BrainIcon,
  CodeIcon,
  GitBranchIcon,
  LayersIcon,
  Link02Icon,
  Search01Icon,
  Shield01Icon,
  ZapIcon,
} from '@hugeicons/core-free-icons';
import { Icon } from '@anyhunt/ui';

const features = [
  {
    icon: Search01Icon,
    title: 'Semantic Search',
    description: 'Vector-powered search finds relevant memories based on meaning, not keywords.',
  },
  {
    icon: Link02Icon,
    title: 'Knowledge Graph',
    description: 'Automatic entity extraction and relationship mapping for connected memories.',
  },
  {
    icon: Shield01Icon,
    title: 'Multi-tenant Isolation',
    description: 'API Key-based data isolation ensures complete separation between users.',
  },
  {
    icon: LayersIcon,
    title: 'Rich Metadata',
    description: 'Store custom metadata, tags, and timestamps with each memory.',
  },
  {
    icon: BrainIcon,
    title: 'LLM Integration',
    description: 'Built-in entity and relation extraction using state-of-the-art language models.',
  },
  {
    icon: ZapIcon,
    title: 'Fast & Scalable',
    description: 'Sub-100ms search latency with pgvector-powered vector similarity.',
  },
  {
    icon: CodeIcon,
    title: 'Developer First',
    description: 'RESTful API with webhooks, comprehensive docs, and easy integration.',
  },
  {
    icon: GitBranchIcon,
    title: 'Graph Traversal',
    description: 'Navigate relationships, find paths, and explore connected knowledge.',
  },
];

export function FeaturesSection() {
  return (
    <section className="border-b border-border py-20 md:py-28">
      <Container>
        {/* Section Header */}
        <div className="mb-16 text-center">
          <h2 className="font-mono text-3xl font-bold tracking-tight md:text-4xl">FEATURES</h2>
          <p className="mt-4 text-muted-foreground">
            Everything you need for production-grade memory infrastructure
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="border border-border bg-card p-5 transition-colors hover:border-foreground/20"
            >
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center border border-border bg-background">
                <Icon icon={feature.icon} className="h-4 w-4" />
              </div>
              <h3 className="font-mono text-sm font-semibold">{feature.title}</h3>
              <p className="mt-1.5 text-xs text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
