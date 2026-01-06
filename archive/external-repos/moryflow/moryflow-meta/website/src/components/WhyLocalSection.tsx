import { Shield, Zap, Unlock, HardDrive } from 'lucide-react';

const reasons = [
  {
    icon: Shield,
    title: '它记得你，只记得你',
    desc: 'Mory 的记忆只存在你的电脑里。它记住的你的习惯、偏好、秘密，永远只属于你。不会被上传，不会被分享。',
  },
  {
    icon: Unlock,
    title: '你的数据不会丢',
    desc: '就算断网、公司倒闭，你的笔记还在，永远都能用。而且是标准格式，任何软件都能打开。',
  },
  {
    icon: Zap,
    title: '反应快，不用等',
    desc: '不用上传下载，打开就能用，Mory 随时在你身边。想配合网盘同步也行，完全由你决定。',
  },
  {
    icon: HardDrive,
    title: '想怎么用就怎么用',
    desc: '用其他软件打开也行，配合网盘同步也行，完全自由。你的东西，你说了算。',
  },
];

export default function WhyLocalSection() {
  return (
    <section className="py-16 sm:py-32 px-4 sm:px-6 bg-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-30" />

      <div className="container mx-auto relative z-10 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="font-serif text-4xl md:text-6xl font-bold text-mory-text-primary mb-6">
            你的东西，你做主
          </h2>
          <p className="text-lg md:text-xl text-mory-text-secondary max-w-3xl mx-auto leading-relaxed">
            Mory 默认把内容存在你自己的电脑里。
            <br />
            <span className="font-medium text-mory-text-primary">你的笔记、想法、记录，都只属于你。</span>
          </p>
        </div>

        {/* Reasons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {reasons.map((reason, index) => (
            <div key={index} className="group relative">
              <div className="flex flex-col sm:flex-row gap-6 p-8 bg-mory-bg rounded-3xl border-2 border-transparent hover:border-mory-orange/20 transition-all duration-300">
                {/* Icon */}
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl glass-panel bg-white/95 backdrop-blur-md border border-white/80 shadow-sm shadow-gray-200/30 flex items-center justify-center group-hover:bg-orange-50/80 transition-all">
                  <reason.icon
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
