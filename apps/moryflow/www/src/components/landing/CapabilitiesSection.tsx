/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Grid showcasing Mory's core capabilities
 */

const capabilities = [
  {
    emoji: '🧠',
    title: 'Remembers everything',
    desc: 'It remembers your notes, habits, and preferences. The more you use it, the better it understands you.',
    examples: [
      'Tracks your learning progress',
      'Knows your work habits',
      'Remembers your travel style',
    ],
    color: 'from-orange-500 to-amber-500',
    isFuture: false,
  },
  {
    emoji: '🌐',
    title: 'Finds latest info',
    desc: 'When needed, it searches the web. Finding exam tips, creative ideas, travel guides...',
    examples: [
      'Searches latest exam formats',
      'Finds creative event ideas',
      'Looks up travel routes',
    ],
    color: 'from-blue-500 to-cyan-500',
    isFuture: false,
  },
  {
    emoji: '✍️',
    title: 'Creates for you',
    desc: 'Not just answering questions - it generates content. Plans, proposals, summaries...',
    examples: ['Makes study plans', 'Generates proposals', 'Writes work summaries'],
    color: 'from-purple-500 to-pink-500',
    isFuture: false,
  },
  {
    emoji: '✨',
    title: 'More to come...',
    desc: 'Mory is continuously evolving, with more capabilities coming soon.',
    examples: ['Stay tuned', '...', '...'],
    color: 'from-gray-400 to-gray-500',
    isFuture: true,
  },
];

export function CapabilitiesSection() {
  return (
    <section
      id="capabilities"
      className="py-16 sm:py-32 px-4 sm:px-6 bg-gradient-to-b from-mory-bg/30 via-mory-bg/50 to-mory-bg relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl" />

      <div className="container mx-auto max-w-7xl relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="font-serif text-4xl md:text-6xl font-bold text-mory-text-primary mb-6">
            Why is Mory so smart?
          </h2>
          <p className="text-lg md:text-xl text-mory-text-secondary max-w-3xl mx-auto leading-relaxed">
            It has many abilities and remembers everything about you.
            <br />
            <span className="font-medium text-mory-text-primary">
              The more you use it, the better it knows you.
            </span>
          </p>
        </div>

        {/* Capabilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {capabilities.map((capability, index) => (
            <div key={index} className="group relative">
              {/* Card with colored glow */}
              <div className="relative group h-full">
                {/* Colored glow effect - only for non-future cards */}
                {!capability.isFuture && (
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${capability.color} opacity-0 group-hover:opacity-10 rounded-3xl blur-2xl transition-opacity duration-500`}
                  />
                )}

                <div
                  className={`relative rounded-3xl p-8 border transition-all h-full flex flex-col ${
                    capability.isFuture
                      ? 'bg-white/70 backdrop-blur-sm border-dashed border-white/70 hover:border-white/80 shadow-md'
                      : 'bg-white/99 backdrop-blur-lg border border-white/95 hover:bg-gradient-to-br hover:from-white hover:to-orange-50/20 hover:border-orange-200/40 hover:-translate-y-2 shadow-[0_8px_32px_0_rgba(0,0,0,0.08),0_2px_8px_0_rgba(0,0,0,0.04)] hover:shadow-[0_16px_48px_0_rgba(0,0,0,0.12),0_4px_12px_0_rgba(0,0,0,0.06)]'
                  }`}
                >
                  {/* Icon */}
                  <div className="mb-6">
                    <div className="relative inline-flex">
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${capability.color} opacity-10 rounded-2xl blur-xl group-hover:opacity-20 transition-opacity`}
                      />
                      <div
                        className={`relative w-16 h-16 rounded-2xl flex items-center justify-center border shadow-sm ${
                          capability.isFuture
                            ? 'bg-white/80 backdrop-blur-sm border-white/80'
                            : 'bg-white/98 backdrop-blur-md border-white/90 group-hover:bg-orange-50/90 shadow-gray-200/40'
                        }`}
                      >
                        <span className="text-3xl">{capability.emoji}</span>
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <h3
                    className={`text-2xl font-serif font-bold mb-4 ${
                      capability.isFuture ? 'text-mory-text-secondary' : 'text-mory-text-primary'
                    }`}
                  >
                    {capability.title}
                  </h3>

                  {/* Description */}
                  <p
                    className={`text-base mb-6 leading-relaxed ${
                      capability.isFuture
                        ? 'text-mory-text-tertiary italic'
                        : 'text-mory-text-secondary'
                    }`}
                  >
                    {capability.desc}
                  </p>

                  {/* Examples */}
                  <div className="mt-auto">
                    <p
                      className={`text-xs uppercase tracking-wider mb-3 font-medium ${
                        capability.isFuture
                          ? 'text-mory-text-tertiary/50'
                          : 'text-mory-text-tertiary'
                      }`}
                    >
                      {capability.isFuture ? '' : 'Examples'}
                    </p>
                    <ul className="space-y-2">
                      {capability.examples.map((example, i) => (
                        <li
                          key={i}
                          className={`flex items-start gap-2 text-sm ${
                            capability.isFuture
                              ? 'text-mory-text-tertiary'
                              : 'text-mory-text-secondary'
                          }`}
                        >
                          <span
                            className={`mt-0.5 ${
                              capability.isFuture ? 'text-gray-400' : 'text-mory-orange'
                            }`}
                          >
                            &middot;
                          </span>
                          <span>{example}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Summary */}
        <div className="text-center">
          <div className="inline-flex flex-col items-center gap-4 px-8 py-6 bg-white rounded-2xl border border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🧠</span>
              <span className="text-2xl">🌐</span>
              <span className="text-2xl">✍️</span>
              <span className="text-2xl text-gray-400">✨</span>
              <span className="text-xl font-bold text-gray-400">...</span>
            </div>
            <p className="text-base text-mory-text-secondary">
              These abilities can be freely combined,
              <span className="font-medium text-mory-text-primary"> and more are being added.</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
