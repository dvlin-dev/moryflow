import { Mail, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative py-12 sm:py-20 px-4 sm:px-6 overflow-hidden">
      {/* Background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-mory-bg via-orange-50/30 to-orange-100/40" />

      {/* Decorative blurs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-300/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-300/15 rounded-full blur-3xl" />

      <div className="container mx-auto max-w-6xl relative z-10">
        {/* Main Content Card */}
        <div className="glass-panel bg-white/60 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-white/40 shadow-xl mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {/* Brand Section */}
            <div className="md:col-span-2 space-y-6">
              <div className="flex items-center gap-3">
                <img src="/logo.svg" alt="Moryflow Logo" className="w-10 h-10 object-contain" />
                <span className="font-serif font-bold text-2xl text-mory-text-primary">
                  Moryflow
                </span>
              </div>

              <div className="space-y-3">
                <p className="text-lg text-mory-text-primary font-medium leading-relaxed">
                  Mory，你的智能伙伴
                </p>
                <p className="text-base text-mory-text-secondary leading-relaxed max-w-lg">
                  它会思考、会规划、会不断进化。
                  <br />
                  帮你准备考试、策划活动、规划旅行...
                  <br />
                  <span className="text-mory-orange font-medium">它会和你一起成长。</span>
                </p>
              </div>

              {/* Status Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50/80 backdrop-blur-sm rounded-full border border-mory-orange/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mory-orange opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-mory-orange"></span>
                </span>
                <span className="text-sm font-medium text-mory-text-primary">持续进化中</span>
              </div>
            </div>

            {/* Contact Section */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-wider text-mory-text-muted">
                联系我们
              </h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="mailto:hello@moryflow.com"
                    className="group flex items-center gap-2 text-mory-text-secondary hover:text-mory-orange transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-mory-bg group-hover:bg-orange-50 transition-colors">
                      <Mail size={16} />
                    </div>
                    <span className="text-sm">hello@moryflow.com</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-mory-text-muted">
          <div className="flex items-center gap-2">
            <span>© 2025 Moryflow</span>
            <span className="text-gray-300">·</span>
            <span className="flex items-center gap-1">
              Made with <Heart size={14} className="text-mory-orange fill-mory-orange" /> for
              everyone
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-white/50 backdrop-blur-sm rounded-full text-xs font-medium text-mory-text-secondary border border-white/40">
              Beta
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
