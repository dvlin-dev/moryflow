import { CheckCircle2, Sparkles } from 'lucide-react';

const scenarios = [
  {
    icon: '📚',
    title: '准备考试',
    userRequest: '帮我准备下个月的英语考试',
    process: [
      { type: 'thinking', text: '我记得你上次复习的重点...' },
      { type: 'result', text: '看了你之前记录的 20 个单词本' },
      { type: 'result', text: '发现你语法部分掌握得不错' },
      { type: 'thinking', text: '查查今年的最新考点...' },
      { type: 'result', text: '联网搜索到今年改革的题型' },
      { type: 'thinking', text: '针对你的薄弱环节制定计划' },
      { type: 'result', text: '完成！重点补强听力和作文' },
    ],
    highlight: '它记得你学过什么，会针对性地帮你',
  },
  {
    icon: '🎉',
    title: '策划活动',
    userRequest: '帮我策划公司年会活动方案',
    process: [
      { type: 'thinking', text: '看看去年的活动记录...' },
      { type: 'result', text: '读取了去年年会的预算和反馈笔记' },
      { type: 'thinking', text: '找找优秀的活动案例...' },
      { type: 'result', text: '联网搜索到 10 个创意年会方案' },
      { type: 'thinking', text: '结合预算帮你设计流程' },
      { type: 'result', text: '完成！已创建《年会策划方案》' },
    ],
    highlight: '参考历史经验 + 借鉴创意案例 + 生成完整方案',
  },
  {
    icon: '✈️',
    title: '旅行规划',
    userRequest: '帮我规划下个月去日本的旅行',
    process: [
      { type: 'thinking', text: '看看你之前的旅行偏好...' },
      { type: 'result', text: '读了你的旅行日记，发现你喜欢文化景点' },
      { type: 'thinking', text: '查查日本的热门路线...' },
      { type: 'result', text: '联网找到京都-大阪 7 日经典路线' },
      { type: 'thinking', text: '根据季节推荐特色活动' },
      { type: 'result', text: '完成！已保存《日本 7 日旅行计划》' },
    ],
    highlight: '懂你的喜好 + 获取实时攻略 + 定制专属行程',
  },
  {
    icon: '📊',
    title: '写工作总结',
    userRequest: '帮我写这个月的工作总结',
    process: [
      { type: 'thinking', text: '整理你这个月的工作记录...' },
      { type: 'result', text: '找到 15 条会议记录和任务笔记' },
      { type: 'thinking', text: '看看优秀总结的写法...' },
      { type: 'result', text: '联网参考了总结报告的框架模板' },
      { type: 'thinking', text: '提炼你的成果和亮点' },
      { type: 'result', text: '完成！已创建《本月工作总结》' },
    ],
    highlight: '挖掘你的记录 + 借鉴专业框架 + 自动生成报告',
  },
];

export default function AgentShowcase() {
  return (
    <section className="py-16 sm:py-32 px-4 sm:px-6 bg-mory-bg relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-20 right-0 w-96 h-96 bg-mory-orange/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      <div className="container mx-auto max-w-7xl relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 glass-panel bg-white/95 backdrop-blur-md rounded-full border border-white/80 shadow-sm shadow-gray-200/30 mb-6">
            <Sparkles size={16} className="text-mory-orange" />
            <span className="text-sm font-medium text-mory-text-primary">会思考的伙伴</span>
          </div>

          <h2 className="font-serif text-4xl md:text-6xl font-bold text-mory-text-primary mb-6">
            Mory 能帮你做什么？
          </h2>
          <p className="text-lg md:text-xl text-mory-text-secondary max-w-3xl mx-auto leading-relaxed">
            不管是学习、工作还是生活，
            <br />
            <span className="font-medium text-mory-text-primary">只要你说出来，它就能帮你搞定。</span>
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
              <div className="mb-6 p-4 glass-panel bg-orange-50/85 backdrop-blur-md rounded-2xl border-l-4 border-mory-orange shadow-sm">
                <p className="text-sm text-mory-text-muted mb-1">你说：</p>
                <p className="text-base text-mory-text-primary font-medium italic">
                  "{scenario.userRequest}"
                </p>
              </div>

              {/* Mory's Thinking Process */}
              <div className="mb-6">
                <p className="text-sm text-mory-text-muted mb-3 flex items-center gap-2">
                  <Sparkles size={14} className="text-mory-orange" />
                  Mory 的想法：
                </p>
                <ul className="space-y-2.5">
                  {scenario.process.map((step, stepIndex) => (
                    <li key={stepIndex} className="flex items-start gap-2.5 text-sm">
                      {step.type === 'thinking' ? (
                        <>
                          <span className="text-base flex-shrink-0 mt-0.5">💭</span>
                          <span className="text-mory-text-secondary italic pt-0.5">{step.text}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2
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
          <div className="p-8 glass-panel bg-gradient-to-br from-white/96 to-white/92 backdrop-blur-lg rounded-3xl border border-white/85 shadow-[0_4px_24px_0_rgba(0,0,0,0.04)] shadow-gray-200/50">
            <p className="text-base text-mory-text-secondary leading-relaxed mb-4">
              Mory 拥有越来越多的能力，
              <br />
              但真正聪明的是：
              <strong className="text-mory-orange">它知道什么时候该用哪个，怎么配合使用。</strong>
            </p>
            <p className="text-sm text-mory-text-muted">
              你不需要告诉它每一步怎么做，只需要说你想要什么结果。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
