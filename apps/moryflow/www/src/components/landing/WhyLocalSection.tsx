/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Grid explaining the local-first design philosophy
 */

import type { HugeIcon } from '@anyhunt/ui';
import { Icon } from '@anyhunt/ui';
import {
  Shield01Icon,
  FlashIcon,
  SquareUnlock01Icon,
  HardDriveIcon,
} from '@hugeicons/core-free-icons';

const reasons: { icon: HugeIcon; title: string; desc: string }[] = [
  {
    icon: Shield01Icon,
    title: 'Your memory, your secret',
    desc: "Mory's memory only exists on your computer. Your habits, preferences, and secrets always belong to you. Never uploaded, never shared.",
  },
  {
    icon: SquareUnlock01Icon,
    title: "Your data won't disappear",
    desc: 'Even offline, even if the company shuts down, your notes are still there. Standard formats that any software can open.',
  },
  {
    icon: FlashIcon,
    title: 'Fast, no waiting',
    desc: 'No uploading or downloading - open and use. Mory is always by your side. Want to sync with cloud storage? Your choice.',
  },
  {
    icon: HardDriveIcon,
    title: 'Use it your way',
    desc: 'Open with other software, sync with cloud storage - completely free. Your stuff, your rules.',
  },
];

export function WhyLocalSection() {
  return (
    <section className="py-16 sm:py-32 px-4 sm:px-6 bg-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-30" />

      <div className="container mx-auto relative z-10 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="font-serif text-4xl md:text-6xl font-bold text-mory-text-primary mb-6">
            Your stuff, your control
          </h2>
          <p className="text-lg md:text-xl text-mory-text-secondary max-w-3xl mx-auto leading-relaxed">
            Mory stores content on your computer by default.
            <br />
            <span className="font-medium text-mory-text-primary">
              Your notes, ideas, and records belong only to you.
            </span>
          </p>
        </div>

        {/* Reasons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {reasons.map((reason, index) => (
            <div key={index} className="group relative">
              <div className="flex flex-col sm:flex-row gap-6 p-8 bg-mory-bg rounded-3xl border-2 border-transparent hover:border-mory-orange/20 transition-all duration-300">
                {/* Icon */}
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-white/95 backdrop-blur-md border border-white/80 shadow-sm shadow-gray-200/30 flex items-center justify-center group-hover:bg-orange-50/80 transition-all">
                  <Icon
                    icon={reason.icon}
                    size={32}
                    className="text-mory-text-primary group-hover:text-mory-orange transition-colors"
                  />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-2xl font-serif font-bold text-mory-text-primary mb-3">
                    {reason.title}
                  </h3>
                  <p className="text-mory-text-secondary leading-relaxed">{reason.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
