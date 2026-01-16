/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Card grid showcasing Mory usage scenarios
 */

import { Icon } from '@anyhunt/ui';
import { CheckmarkCircle01Icon, SparklesIcon } from '@hugeicons/core-free-icons';

const scenarios = [
  {
    icon: '📚',
    title: 'Exam Prep',
    userRequest: "Help me prepare for next month's English exam",
    process: [
      { type: 'thinking', text: 'I remember your last study focus...' },
      { type: 'result', text: 'Reviewed your 20 vocabulary notebooks' },
      { type: 'result', text: 'Found your grammar is quite solid' },
      { type: 'thinking', text: "Checking this year's exam updates..." },
      { type: 'result', text: 'Found new question formats online' },
      { type: 'thinking', text: 'Creating a plan for your weak areas' },
      { type: 'result', text: 'Done! Focus on listening and writing' },
    ],
    highlight: "It remembers what you've learned and helps accordingly",
  },
  {
    icon: '🎉',
    title: 'Event Planning',
    userRequest: 'Help me plan the company annual party',
    process: [
      { type: 'thinking', text: "Looking at last year's event records..." },
      { type: 'result', text: 'Found budget and feedback notes' },
      { type: 'thinking', text: 'Searching for creative ideas...' },
      { type: 'result', text: 'Found 10 creative party concepts' },
      { type: 'thinking', text: 'Designing the flow within budget' },
      { type: 'result', text: 'Done! Created the event proposal' },
    ],
    highlight: 'Past experience + creative ideas + complete proposal',
  },
  {
    icon: '✈️',
    title: 'Travel Planning',
    userRequest: 'Help me plan my trip to Japan next month',
    process: [
      { type: 'thinking', text: 'Checking your travel preferences...' },
      { type: 'result', text: 'Found you love cultural attractions' },
      { type: 'thinking', text: 'Looking for popular routes...' },
      { type: 'result', text: 'Found Kyoto-Osaka 7-day itinerary' },
      { type: 'thinking', text: 'Adding seasonal activities' },
      { type: 'result', text: 'Done! Saved Japan Travel Plan' },
    ],
    highlight: 'Knows your preferences + real-time info + custom itinerary',
  },
  {
    icon: '📊',
    title: 'Work Summary',
    userRequest: "Help me write this month's work summary",
    process: [
      { type: 'thinking', text: 'Organizing your work records...' },
      { type: 'result', text: 'Found 15 meeting notes and tasks' },
      { type: 'thinking', text: 'Checking summary best practices...' },
      { type: 'result', text: 'Referenced professional templates' },
      { type: 'thinking', text: 'Highlighting your achievements' },
      { type: 'result', text: 'Done! Created Monthly Summary' },
    ],
    highlight: 'Mining your records + professional format + auto-generate',
  },
];

export function AgentShowcase() {
  return (
    <section className="py-16 sm:py-32 px-4 sm:px-6 bg-mory-bg relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-20 right-0 w-96 h-96 bg-mory-orange/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      <div className="container mx-auto max-w-7xl relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur-md rounded-full border border-white/80 shadow-sm shadow-gray-200/30 mb-6">
            <Icon icon={SparklesIcon} size={16} className="text-mory-orange" />
            <span className="text-sm font-medium text-mory-text-primary">A thinking companion</span>
          </div>

          <h2 className="font-serif text-4xl md:text-6xl font-bold text-mory-text-primary mb-6">
            What can Mory do for you?
          </h2>
          <p className="text-lg md:text-xl text-mory-text-secondary max-w-3xl mx-auto leading-relaxed">
            Whether it's study, work, or life,
            <br />
            <span className="font-medium text-mory-text-primary">just tell it what you need.</span>
          </p>
        </div>

        {/* Scenarios Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
          {scenarios.map((scenario, index) => (
            <div
              key={index}
              className="group bg-white rounded-3xl p-8 border border-gray-100 hover:border-mory-orange/30 transition-all hover:-translate-y-1"
            >
              {/* Icon & Title */}
              <div className="flex items-center gap-4 mb-6">
                <div className="text-4xl">{scenario.icon}</div>
                <div>
                  <h3 className="text-2xl font-serif font-bold text-mory-text-primary">
                    {scenario.title}
                  </h3>
                </div>
              </div>

              {/* User Request */}
              <div className="mb-6 p-4 bg-orange-50/85 backdrop-blur-md rounded-2xl border-l-4 border-mory-orange shadow-sm">
                <p className="text-sm text-mory-text-tertiary mb-1">You say:</p>
                <p className="text-base text-mory-text-primary font-medium italic">
                  "{scenario.userRequest}"
                </p>
              </div>

              {/* Mory's Thinking Process */}
              <div className="mb-6">
                <p className="text-sm text-mory-text-tertiary mb-3 flex items-center gap-2">
                  <Icon icon={SparklesIcon} size={14} className="text-mory-orange" />
                  Mory's thinking:
                </p>
                <ul className="space-y-2.5">
                  {scenario.process.map((step, stepIndex) => (
                    <li key={stepIndex} className="flex items-start gap-2.5 text-sm">
                      {step.type === 'thinking' ? (
                        <>
                          <span className="text-base flex-shrink-0 mt-0.5">💭</span>
                          <span className="text-mory-text-secondary italic pt-0.5">
                            {step.text}
                          </span>
                        </>
                      ) : (
                        <>
                          <Icon
                            icon={CheckmarkCircle01Icon}
                            size={16}
                            className="text-mory-orange mt-0.5 flex-shrink-0"
                          />
                          <span className="text-mory-text-primary pt-0.5">{step.text}</span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Highlight */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm text-mory-orange font-medium">💡 {scenario.highlight}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Explanation */}
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-8 bg-gradient-to-br from-white/96 to-white/92 backdrop-blur-lg rounded-3xl border border-white/85 shadow-[0_4px_24px_0_rgba(0,0,0,0.04)] shadow-gray-200/50">
            <p className="text-base text-mory-text-secondary leading-relaxed mb-4">
              Mory has more and more capabilities,
              <br />
              but what makes it truly smart is:
              <strong className="text-mory-orange">
                {' '}
                it knows when to use which, and how to combine them.
              </strong>
            </p>
            <p className="text-sm text-mory-text-tertiary">
              You don't need to tell it every step - just say what result you want.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
