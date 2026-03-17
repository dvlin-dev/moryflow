import type { GeoArticle } from '@/lib/geo-articles';

export const part1: GeoArticle[] = [
  // ─── Article 1: moryflow-vs-logseq ───────────────────────────────
  {
    slug: 'moryflow-vs-logseq',
    publishedAt: '2026-03-17',
    content: {
      en: {
        title: 'Moryflow vs Logseq: AI Agents Meet Outliner PKM',
        description:
          'Detailed comparison of Moryflow and Logseq. See how AI agents, one-click publishing, and BYOK stack up against outliner-based PKM with block references.',
        headline: 'Moryflow vs Logseq: Which Knowledge Tool Fits Your Workflow?',
        subheadline:
          'Moryflow pairs autonomous AI agents with one-click publishing; Logseq excels at outliner-based block references and open-source extensibility. Your ideal pick depends on whether you need AI-driven research or granular outlining.',
        keyTakeaways: [
          'Moryflow offers autonomous AI agents with persistent memory; Logseq relies on manual linking and community plugins.',
          'Logseq is the stronger pure outliner with block-level references and a powerful graph view.',
          'Moryflow publishes notes to a live site in one click; Logseq requires third-party tools for publishing.',
          'Both are open source and local-first, but Moryflow adds BYOK access to 24+ AI providers.',
        ],
        sections: [
          {
            heading: 'Core Philosophy: Agents vs Outliners',
            paragraphs: [
              'Moryflow is an agent-first workspace that treats AI as an active collaborator. Its agents can autonomously research topics, synthesize scattered notes, and draft documents while retaining memory of past interactions. Logseq, by contrast, is an outliner-first personal knowledge management system that pioneered block-level references and a local-first Markdown graph.',
              'These different starting points shape every downstream decision. Moryflow invests in adaptive memory, a Telegram remote agent, and one-click site publishing. Logseq invests in block embedding, namespaces, query tables, and a rich plugin marketplace maintained by its open-source community.',
              'Neither philosophy is universally superior. Researchers who need AI to surface connections across thousands of notes will lean toward Moryflow. Writers and academics who think in outlines and value manual, precise linking will feel at home in Logseq.',
            ],
            callout:
              'Moryflow treats AI as a persistent collaborator; Logseq treats the outline as the primary thinking tool.',
          },
          {
            heading: 'AI Capabilities Compared',
            paragraphs: [
              'Moryflow ships with autonomous agents that can plan multi-step research, call external tools, and remember your preferences across sessions. You bring your own API keys (BYOK) and choose from 24+ providers including OpenAI, Anthropic, Google, and open-source models. The Telegram remote agent lets you capture ideas and query your knowledge base without opening the desktop app.',
              'Logseq introduced an AI assistant through community plugins, but it functions as a chat overlay rather than an autonomous agent. There is no built-in memory system, no tool use, and no remote agent. AI in Logseq today is conversational, not agentic.',
              'For users who rely heavily on AI to process, summarize, and cross-reference research material, Moryflow provides a meaningfully deeper integration.',
            ],
          },
          {
            heading: 'Knowledge Organization and Linking',
            paragraphs: [
              "Logseq's block-reference system is among the most powerful in any note-taking tool. Every bullet point is a referenceable block, enabling a bottom-up organizational style where structure emerges from connections rather than folder hierarchies. The graph view visualizes these connections, making it easy to discover unexpected relationships.",
              'Moryflow uses a document-based model with bidirectional links and tags, but does not offer Logseq-style block-level references. Instead, its AI agents handle the cross-referencing work, surfacing relevant notes contextually during research and writing.',
              "If your workflow depends on manually threading atomic ideas across hundreds of pages, Logseq's block references are hard to beat. If you prefer AI to handle discovery, Moryflow's approach reduces manual overhead.",
            ],
            callout:
              "Logseq's block references give you surgical precision in linking; Moryflow's agents automate the discovery process.",
          },
          {
            heading: 'Publishing and Sharing',
            paragraphs: [
              'Moryflow includes a built-in publishing pipeline that turns any note or collection into a live website with a single click. You get SEO metadata, custom domains, and a digital garden aesthetic out of the box. There is no need to configure a static site generator or push to a separate hosting platform.',
              'Logseq does not ship native publishing. Users typically export to Markdown and feed pages into Hugo, Next.js, or Logseq Publish (a community tool). The workflow is functional but requires technical setup and ongoing maintenance.',
              'For knowledge workers who want their notes to serve double duty as public content, Moryflow eliminates the publishing gap entirely.',
            ],
          },
          {
            heading: 'Pricing and Ecosystem',
            paragraphs: [
              'Both Moryflow and Logseq are open source. Moryflow offers a free tier with local AI and a Pro plan for cloud sync, advanced agents, and publishing. Logseq is fully free for local use; Logseq Sync is a paid add-on for real-time cloud synchronization.',
              "Logseq's plugin marketplace is a significant advantage. Hundreds of community-built plugins extend functionality from Kanban boards to spaced repetition. Moryflow's ecosystem is younger but growing, with its BYOK model and Telegram agent providing integration surface area.",
              'The right economic choice depends on scale. A solo researcher who wants free outlining will find Logseq generous. A team that needs AI agents and publishing may find Moryflow Pro more cost-effective than assembling a comparable stack from separate tools.',
            ],
          },
        ],
        faqs: [
          {
            question: 'Can Moryflow import my Logseq graph?',
            answer:
              'Yes. Moryflow imports standard Markdown files, so you can bring your Logseq pages directly. Block-level references will convert to regular links.',
          },
          {
            question: 'Does Logseq have AI agents?',
            answer:
              'Not natively. Community plugins add basic AI chat, but Logseq does not offer autonomous agents, persistent memory, or tool use.',
          },
          {
            question: 'Which tool is better for academic research?',
            answer:
              'Logseq is stronger for manual citation linking and outline-heavy writing. Moryflow is stronger when you need AI to synthesize large volumes of source material automatically.',
          },
          {
            question: 'Is Moryflow local-first like Logseq?',
            answer:
              'Yes. Both store data locally by default. Moryflow adds optional cloud sync; Logseq offers Logseq Sync as a paid add-on.',
          },
          {
            question: 'Can I publish my Logseq notes as a website?',
            answer:
              'Not natively. You need a third-party tool like Logseq Publish or a static site generator. Moryflow has one-click publishing built in.',
          },
        ],
        ctaTitle: 'Try the Agent-First Workspace',
        ctaDescription:
          'Download Moryflow free and see how autonomous AI agents transform your research and publishing workflow.',
        relatedPages: [
          { label: 'Compare with Obsidian', href: '/compare/obsidian' },
          { label: 'Moryflow vs Roam Research', href: '/blog/moryflow-vs-roam-research' },
          { label: 'AI Agents for Research', href: '/blog/ai-agents-for-research' },
          { label: 'Local-First AI Notes', href: '/local-first-ai-notes' },
          { label: 'Digital Garden App', href: '/digital-garden-app' },
        ],
      },
      zh: {
        title: 'Moryflow 与 Logseq 对比：AI 智能体与大纲式知识管理',
        description:
          '深度对比 Moryflow 和 Logseq 在 AI 智能体、一键发布、BYOK 模型与大纲式块引用、图谱视图等维度的差异，帮助你根据研究风格和知识管理需求选择最适合的工具。',
        headline: 'Moryflow 与 Logseq：哪个知识工具更适合你？',
        subheadline:
          'Moryflow 以自主 AI 智能体和一键发布见长，Logseq 以大纲式块引用和开源可扩展性著称。选择取决于你更需要 AI 驱动研究，还是精细的大纲式组织。',
        keyTakeaways: [
          'Moryflow 提供具有持久记忆的自主 AI 智能体，Logseq 依赖手动链接和社区插件。',
          'Logseq 拥有业界领先的块级引用和图谱视图，大纲能力更强。',
          'Moryflow 一键将笔记发布为网站，Logseq 需要借助第三方工具。',
          '两者均开源且本地优先，但 Moryflow 额外支持 24+ AI 服务商的 BYOK 接入。',
        ],
        sections: [
          {
            heading: '核心理念：智能体 vs 大纲',
            paragraphs: [
              'Moryflow 是一个以智能体为核心的工作空间，AI 作为主动协作者参与研究、综合笔记、撰写文档，并在交互中持续积累记忆。Logseq 则是一个以大纲为核心的个人知识管理系统，以块级引用和本地 Markdown 图谱闻名。',
              '不同的出发点决定了截然不同的功能投入方向。Moryflow 深耕自适应记忆、Telegram 远程智能体和一键发布；Logseq 深耕块嵌入、命名空间、查询表和丰富的社区插件生态。',
              '两种理念各有所长。需要 AI 在海量笔记中自动发现关联的研究者倾向 Moryflow；习惯用大纲精确组织思维的学者更适合 Logseq。',
            ],
            callout: 'Moryflow 视 AI 为持久协作者，Logseq 视大纲为主要思考工具。',
          },
          {
            heading: 'AI 能力对比',
            paragraphs: [
              'Moryflow 内置自主智能体，能规划多步研究、调用外部工具、跨会话记忆用户偏好。支持 BYOK 接入 OpenAI、Anthropic、Google 等 24+ 家服务商。Telegram 远程智能体让你无需打开桌面端即可随时捕捉灵感、查询知识库。',
              'Logseq 通过社区插件提供 AI 助手，但功能局限于对话式问答，不具备自主规划、持久记忆或工具调用能力。',
              '如果你的工作流高度依赖 AI 处理、摘要和交叉引用研究资料，Moryflow 的集成深度具有实质性优势。',
            ],
          },
          {
            heading: '知识组织与链接',
            paragraphs: [
              'Logseq 的块引用系统在笔记工具中首屈一指。每个要点都是可引用的块，支持自下而上的组织方式——结构从连接中自然涌现，而非依赖文件夹层级。图谱视图将这些连接可视化，便于发现意料之外的关联。',
              'Moryflow 采用文档模型配合双向链接和标签，不提供 Logseq 式的块级引用。取而代之的是 AI 智能体在研究和写作过程中自动完成交叉引用，按上下文浮现相关笔记。',
              '如果你的工作流依赖在数百页间手动穿线原子想法，Logseq 的块引用难以替代。如果你更希望 AI 代为发现关联，Moryflow 的方式显著减少手动负担。',
            ],
            callout: 'Logseq 块引用提供手术刀般的链接精度，Moryflow 智能体则自动化了发现过程。',
          },
          {
            heading: '发布与分享',
            paragraphs: [
              'Moryflow 内置发布流水线，一键将笔记或合集变为在线网站，自带 SEO 元数据、自定义域名和数字花园风格，无需配置静态站点生成器或第三方托管。',
              'Logseq 没有原生发布功能。用户通常导出 Markdown 再接入 Hugo、Next.js 或社区的 Logseq Publish 工具。流程可行但需要技术配置和持续维护。',
              '对于希望笔记同时充当公开内容的知识工作者，Moryflow 彻底消除了发布环节的摩擦。',
            ],
          },
          {
            heading: '定价与生态',
            paragraphs: [
              'Moryflow 和 Logseq 均为开源项目。Moryflow 提供含本地 AI 的免费版和含云同步、高级智能体、发布功能的 Pro 版。Logseq 本地使用完全免费，Logseq Sync 为付费附加服务。',
              'Logseq 的插件市场是显著优势，数百个社区插件扩展了看板、间隔重复等功能。Moryflow 生态更年轻但增长迅速，BYOK 模型和 Telegram 智能体提供了独特的集成面。',
              '经济性取决于使用场景。只需免费大纲工具的独立研究者会觉得 Logseq 已足够慷慨；需要 AI 智能体和发布能力的团队会发现 Moryflow Pro 比拼凑多个独立工具更具性价比。',
            ],
          },
        ],
        faqs: [
          {
            question: 'Moryflow 能导入 Logseq 图谱吗？',
            answer:
              '可以。Moryflow 支持导入标准 Markdown 文件，Logseq 页面可直接导入。块级引用会转换为普通链接。',
          },
          {
            question: 'Logseq 有 AI 智能体吗？',
            answer:
              '原生没有。社区插件可添加基础 AI 对话，但 Logseq 不提供自主智能体、持久记忆或工具调用功能。',
          },
          {
            question: '哪个工具更适合学术研究？',
            answer:
              'Logseq 在手动引文链接和大纲式写作方面更强；Moryflow 在需要 AI 自动综合大量文献时更有优势。',
          },
          {
            question: 'Moryflow 和 Logseq 一样是本地优先的吗？',
            answer:
              '是的。两者默认将数据存储在本地。Moryflow 提供可选的云同步，Logseq 通过付费的 Logseq Sync 服务实现。',
          },
          {
            question: '能把 Logseq 笔记发布为网站吗？',
            answer:
              '原生不行。需要使用 Logseq Publish 等第三方工具或静态站点生成器。Moryflow 内置一键发布。',
          },
        ],
        ctaTitle: '试试以智能体为核心的工作空间',
        ctaDescription: '免费下载 Moryflow，体验自主 AI 智能体如何革新你的研究和发布工作流。',
        relatedPages: [
          { label: '与 Obsidian 对比', href: '/compare/obsidian' },
          { label: 'Moryflow vs Roam Research', href: '/blog/moryflow-vs-roam-research' },
          { label: 'AI 研究智能体', href: '/blog/ai-agents-for-research' },
          { label: '本地优先 AI 笔记', href: '/local-first-ai-notes' },
          { label: '数字花园应用', href: '/digital-garden-app' },
        ],
      },
    },
  },

  // ─── Article 2: moryflow-vs-roam-research ────────────────────────
  {
    slug: 'moryflow-vs-roam-research',
    publishedAt: '2026-03-17',
    content: {
      en: {
        title: 'Moryflow vs Roam Research: Agents vs Linking',
        description:
          'Compare Moryflow and Roam Research side by side. Explore differences in AI agents, local-first architecture, publishing, pricing, and knowledge management.',
        headline: 'Moryflow vs Roam Research: A New Generation of Note-Taking',
        subheadline:
          'Roam Research pioneered bidirectional linking for networked thought. Moryflow builds on that foundation with autonomous AI agents, local-first storage, one-click publishing, and an open-source codebase. Here is how they compare.',
        keyTakeaways: [
          'Roam Research pioneered bidirectional linking and inspired a generation of PKM tools.',
          'Moryflow is local-first and open source; Roam is cloud-only and closed source at $15/month.',
          "Moryflow's autonomous agents go beyond chat — they research, synthesize, and remember.",
          'Moryflow includes one-click publishing; Roam has no native publishing feature.',
          'Roam excels for academics who rely on dense block references and daily notes.',
        ],
        sections: [
          {
            heading: 'A Brief History: Why Roam Mattered',
            paragraphs: [
              'Roam Research launched in 2020 and fundamentally changed how people think about note-taking. Before Roam, most tools organized knowledge in folder trees. Roam introduced bidirectional links and block references as first-class primitives, letting ideas connect organically. It built a passionate community of academics, researchers, and productivity enthusiasts who embraced networked thought.',
              'That influence is real and lasting. Nearly every modern PKM tool, including Moryflow, incorporates bidirectional linking in some form. Roam deserves credit for popularizing a paradigm shift. The question in 2026 is whether bidirectional linking alone is enough, or whether AI agents represent the next leap.',
            ],
            callout:
              'Roam popularized bidirectional linking. The question now is whether AI agents are the next paradigm shift.',
          },
          {
            heading: 'Architecture: Local-First vs Cloud-Only',
            paragraphs: [
              "Moryflow stores your data locally by default. Your notes live on your device, synced optionally via encrypted cloud storage. You own your data, and the app works offline. This local-first architecture means there's no vendor lock-in — export anytime to standard Markdown.",
              "Roam Research is cloud-only. Your notes are stored on Roam's servers, and the app requires an internet connection for core functionality. While Roam offers JSON and Markdown export, the graph structure and block references don't translate cleanly to other tools.",
              'For users who prioritize data sovereignty, offline access, or regulatory compliance, the architectural difference is decisive.',
            ],
          },
          {
            heading: 'AI Capabilities',
            paragraphs: [
              "Moryflow's AI is agent-based, not just assistant-based. Agents autonomously plan research, execute multi-step tasks, call external tools, and maintain persistent memory across sessions. The BYOK model lets you connect your own API keys to 24+ providers, so you control cost and model choice. A Telegram remote agent extends the workspace to mobile without a dedicated app.",
              'Roam Research does not include native AI capabilities. Some users connect Roam to external AI tools via the API or browser extensions, but there is no built-in agent system, no memory layer, and no tool-use framework. AI in Roam is a manual integration effort.',
              'The gap is structural: Moryflow treats AI as a core layer of the product; Roam treats it as something users bolt on externally.',
            ],
            callout:
              'Moryflow ships AI agents as a core layer; Roam leaves AI integration to external tools.',
          },
          {
            heading: 'Publishing and Output',
            paragraphs: [
              'Moryflow includes a complete publishing pipeline. Select notes, click publish, and you have a live site with SEO metadata, custom domains, and a clean design. The workflow from draft to public page takes seconds, making Moryflow a viable digital garden platform.',
              "Roam has no native publishing. Users rely on third-party solutions like Roam Garden or custom scripts to make pages public. These solutions work but add friction and maintenance overhead. Roam's block-reference format also complicates clean rendering on the web.",
              "If part of your workflow involves sharing knowledge publicly — whether as a blog, documentation, or digital garden — Moryflow's built-in publishing is a significant advantage.",
            ],
          },
          {
            heading: 'Pricing and Openness',
            paragraphs: [
              'Roam Research charges $15 per month (or $165/year), with no free tier. The product is closed source. This positions Roam as a premium tool for committed users, but raises the barrier for newcomers and creates lock-in concerns.',
              'Moryflow is open source and offers a free tier with local AI, unlimited notes, and core agent features. The Pro plan adds cloud sync, advanced agents, and publishing. The open-source codebase means you can self-host, audit the code, or contribute.',
              "For budget-conscious users, students, or teams that value transparency, Moryflow's model is more accessible. For users who are already invested in Roam's ecosystem and value its specific linking paradigm, the $15/month may be justified.",
            ],
          },
        ],
        faqs: [
          {
            question: 'Can I migrate from Roam Research to Moryflow?',
            answer:
              'Yes. Export your Roam graph as Markdown and import into Moryflow. Bidirectional links are preserved; block references convert to standard links.',
          },
          {
            question: 'Does Roam Research have AI features?',
            answer:
              'Not natively. Users can connect external AI tools via API integrations, but Roam does not ship built-in AI agents or memory.',
          },
          {
            question: 'Is Moryflow free?',
            answer:
              'Yes. Moryflow has a free tier with local AI and unlimited notes. Pro adds cloud sync, advanced agents, and publishing.',
          },
          {
            question: 'Which is better for academic writing?',
            answer:
              "Roam's block references are excellent for dense citation networks. Moryflow is stronger when you need AI to synthesize literature and draft sections automatically.",
          },
          {
            question: 'Can Moryflow work offline?',
            answer:
              'Yes. Moryflow is local-first and fully functional offline. Cloud sync is optional.',
          },
        ],
        ctaTitle: 'Experience the Next Generation',
        ctaDescription:
          'Download Moryflow free — local-first, open source, with AI agents that actually remember your research.',
        relatedPages: [
          { label: 'Moryflow vs Logseq', href: '/blog/moryflow-vs-logseq' },
          { label: 'Moryflow vs Mem', href: '/blog/moryflow-vs-mem' },
          { label: 'Second Brain App', href: '/second-brain-app' },
          { label: 'AI Note-Taking App', href: '/ai-note-taking-app' },
          { label: 'Compare with Notion', href: '/compare/notion' },
        ],
      },
      zh: {
        title: 'Moryflow 与 Roam Research 对比：AI 智能体 vs 双向链接',
        description:
          '全面对比 Moryflow 和 Roam Research 在 AI 智能体、本地优先架构、发布功能、定价模式和知识管理理念上的差异，帮你判断哪款工具更适合你的研究工作流。',
        headline: 'Moryflow 与 Roam Research：新一代笔记工具之争',
        subheadline:
          'Roam Research 开创了双向链接的网状思维方式。Moryflow 在此基础上加入自主 AI 智能体、本地优先存储、一键发布和开源代码库。以下是详细对比。',
        keyTakeaways: [
          'Roam Research 开创了双向链接，影响了一代知识管理工具。',
          'Moryflow 本地优先且开源，Roam 仅云端且闭源，月费 $15。',
          'Moryflow 的自主智能体超越对话——能研究、综合、记忆。',
          'Moryflow 内置一键发布，Roam 没有原生发布功能。',
          'Roam 对依赖密集块引用和每日笔记的学者仍有独到优势。',
        ],
        sections: [
          {
            heading: '简史：Roam 为何重要',
            paragraphs: [
              'Roam Research 于 2020 年发布，从根本上改变了人们对笔记的认知。在 Roam 之前，大多数工具以文件夹树组织知识。Roam 将双向链接和块引用作为一等原语，让想法自然关联，吸引了大量学者、研究者和效率爱好者。',
              '这种影响是持久的。几乎所有现代 PKM 工具，包括 Moryflow，都在某种程度上吸收了双向链接。Roam 推动了一次范式转变。2026 年的问题是：仅靠双向链接是否足够，还是 AI 智能体代表了下一次飞跃？',
            ],
            callout: 'Roam 普及了双向链接。现在的问题是 AI 智能体是否是下一个范式转变。',
          },
          {
            heading: '架构：本地优先 vs 纯云端',
            paragraphs: [
              'Moryflow 默认将数据存储在本地设备上，支持可选的加密云同步。你完全拥有数据所有权，离线可用，随时可导出为标准 Markdown，不存在供应商锁定。',
              'Roam Research 是纯云端架构。笔记存储在 Roam 服务器上，核心功能需要联网。虽然支持 JSON 和 Markdown 导出，但图谱结构和块引用在迁移时会有损失。',
              '对于重视数据主权、离线访问或合规要求的用户，架构差异具有决定性意义。',
            ],
          },
          {
            heading: 'AI 能力',
            paragraphs: [
              'Moryflow 的 AI 是智能体模式，而非简单的助手模式。智能体能自主规划研究、执行多步骤任务、调用外部工具，并在跨会话中保持持久记忆。BYOK 模型支持接入 24+ 家服务商，你掌控成本和模型选择。Telegram 远程智能体将工作空间延伸到移动场景。',
              'Roam Research 不包含原生 AI 功能。部分用户通过 API 或浏览器扩展连接外部 AI 工具，但没有内置智能体系统、记忆层或工具使用框架。',
              '差距是结构性的：Moryflow 将 AI 视为产品核心层，Roam 将 AI 视为用户自行外接的能力。',
            ],
            callout: 'Moryflow 将 AI 智能体作为核心层交付，Roam 将 AI 集成留给外部工具。',
          },
          {
            heading: '发布与输出',
            paragraphs: [
              'Moryflow 内置完整的发布流水线。选择笔记，点击发布，即可获得带 SEO 元数据、自定义域名和简洁设计的在线站点。从草稿到公开页面只需几秒，使 Moryflow 成为可行的数字花园平台。',
              'Roam 没有原生发布功能。用户依赖 Roam Garden 等第三方方案或自定义脚本将页面公开。这些方案可行但增加摩擦和维护成本。Roam 的块引用格式也使网页端的清晰渲染变得复杂。',
              '如果你的工作流涉及公开分享知识——无论是博客、文档还是数字花园——Moryflow 的内置发布是显著优势。',
            ],
          },
          {
            heading: '定价与开放性',
            paragraphs: [
              'Roam Research 月费 $15（年付 $165），无免费版，产品闭源。这将 Roam 定位为面向忠实用户的高端工具，但提高了新用户门槛并带来锁定顾虑。',
              'Moryflow 开源，提供含本地 AI、无限笔记和核心智能体功能的免费版。Pro 版增加云同步、高级智能体和发布功能。开源代码库意味着你可以自托管、审计代码或参与贡献。',
              '对预算敏感的用户、学生或重视透明度的团队，Moryflow 的模式更具可及性。对已深入 Roam 生态并依赖其特定链接范式的用户，$15/月可能物有所值。',
            ],
          },
        ],
        faqs: [
          {
            question: '能从 Roam Research 迁移到 Moryflow 吗？',
            answer:
              '可以。将 Roam 图谱导出为 Markdown 后导入 Moryflow。双向链接会保留，块引用转换为标准链接。',
          },
          {
            question: 'Roam Research 有 AI 功能吗？',
            answer:
              '原生没有。用户可通过 API 集成连接外部 AI 工具，但 Roam 不内置 AI 智能体或记忆功能。',
          },
          {
            question: 'Moryflow 免费吗？',
            answer:
              '是的。Moryflow 免费版包含本地 AI 和无限笔记。Pro 版增加云同步、高级智能体和发布功能。',
          },
          {
            question: '哪个更适合学术写作？',
            answer:
              'Roam 的块引用在密集引文网络中表现出色。Moryflow 在需要 AI 综合文献并自动起草段落时更强。',
          },
          {
            question: 'Moryflow 能离线使用吗？',
            answer: '可以。Moryflow 本地优先，完全支持离线使用。云同步为可选功能。',
          },
        ],
        ctaTitle: '体验新一代笔记工具',
        ctaDescription: '免费下载 Moryflow——本地优先、开源、AI 智能体真正记得住你的研究。',
        relatedPages: [
          { label: 'Moryflow vs Logseq', href: '/blog/moryflow-vs-logseq' },
          { label: 'Moryflow vs Mem', href: '/blog/moryflow-vs-mem' },
          { label: '第二大脑应用', href: '/second-brain-app' },
          { label: 'AI 笔记应用', href: '/ai-note-taking-app' },
          { label: '与 Notion 对比', href: '/compare/notion' },
        ],
      },
    },
  },

  // ─── Article 3: moryflow-vs-mem ──────────────────────────────────
  {
    slug: 'moryflow-vs-mem',
    publishedAt: '2026-03-17',
    content: {
      en: {
        title: 'Moryflow vs Mem: Autonomous Agents vs AI-Powered Search',
        description:
          'Compare Moryflow and Mem for AI note-taking. See how autonomous agents, BYOK, local-first storage, and publishing differ from cloud AI search and auto-tagging.',
        headline: 'Moryflow vs Mem: Two Approaches to AI Note-Taking',
        subheadline:
          'Mem uses proprietary AI to auto-organize your notes with smart search and tagging. Moryflow goes further with autonomous agents that research, write, and publish — all local-first and open source with BYOK model choice.',
        keyTakeaways: [
          'Mem focuses on AI-powered search and auto-organization; Moryflow offers autonomous agents that act on your behalf.',
          'Moryflow is local-first and open source; Mem is cloud-only and proprietary.',
          'Moryflow supports BYOK with 24+ providers; Mem uses a fixed proprietary AI stack.',
          'Moryflow includes one-click publishing; Mem is a private workspace with no publishing.',
          'Mem excels at frictionless capture and auto-tagging for quick retrieval.',
        ],
        sections: [
          {
            heading: 'AI Philosophy: Agents vs Smart Search',
            paragraphs: [
              'Mem and Moryflow both put AI at the center of the note-taking experience, but they mean very different things by "AI." Mem\'s AI is a search-and-organization layer: it automatically tags notes, surfaces relevant content when you write, and provides a natural-language search that understands context. The goal is to eliminate manual filing so your notes organize themselves.',
              "Moryflow's AI is agent-based. Agents don't just find information — they act on it. A Moryflow agent can autonomously research a topic across your notes and the web, synthesize findings into a structured draft, and remember your preferences across sessions. The Telegram remote agent lets you delegate tasks to your knowledge base from your phone.",
              'The practical difference is autonomy. Mem helps you find things faster. Moryflow helps you do things you would otherwise do manually — research, draft, organize, publish.',
            ],
            callout:
              "Mem's AI finds and organizes; Moryflow's AI researches, writes, and publishes.",
          },
          {
            heading: 'Data Ownership and Architecture',
            paragraphs: [
              "Moryflow is local-first: your notes are stored on your device by default, with optional encrypted cloud sync. The codebase is open source, so you can audit security, self-host, or fork. You're never locked in — export to Markdown anytime.",
              "Mem is cloud-native. All notes are stored on Mem's servers, and the AI processing happens in their cloud. The product is proprietary with no open-source component. While Mem offers export, the AI-generated organization (tags, relations) doesn't transfer.",
              'For users who care about data sovereignty, privacy regulations, or simply want to own their tools, the architectural difference is fundamental.',
            ],
            callout: 'Your notes, your device, your choice of AI — Moryflow keeps you in control.',
          },
          {
            heading: 'Model Choice: BYOK vs Locked-In',
            paragraphs: [
              "Moryflow's BYOK (Bring Your Own Key) model lets you connect API keys from 24+ providers — OpenAI, Anthropic, Google, Mistral, local models, and more. You choose the model that fits your task, budget, and privacy requirements. When a better model launches, you switch instantly.",
              "Mem uses a proprietary AI stack. You don't choose the model, and you can't bring your own. This simplifies the experience — there's nothing to configure — but it also means you're tied to Mem's AI decisions and pricing.",
              "BYOK is a significant advantage for power users, teams with compliance requirements, and anyone who wants to run AI locally. Mem's approach is better for users who prefer a turnkey experience and don't want to manage API keys.",
            ],
          },
          {
            heading: 'Publishing and Output',
            paragraphs: [
              'Moryflow treats publishing as a core workflow. Select notes, click publish, and your content goes live as a website with SEO metadata, custom domains, and responsive design. This makes Moryflow a dual-purpose tool: private knowledge base and public publishing platform.',
              'Mem is designed purely as a private workspace. There is no publishing feature, no shared pages, and no way to turn notes into a public site. If you need to share, you copy text to another platform.',
              'For knowledge workers who blog, maintain documentation, or run digital gardens, the publishing gap is the single biggest functional difference between these two tools.',
            ],
          },
          {
            heading: 'Pricing and Value',
            paragraphs: [
              'Mem offers a free tier with limited AI queries and a paid plan starting at $10/month for unlimited AI. The product is clean, well-designed, and focused. It does one thing — AI-organized notes — very well.',
              "Moryflow's free tier includes local AI with unlimited usage, core agent features, and unlimited notes. Pro adds cloud sync, advanced agents, and publishing. The open-source model means the free tier isn't artificially limited — it's the full product with optional cloud services.",
              "Users who want a simple, polished AI notebook will find Mem compelling. Users who want agents, publishing, model choice, and data ownership will find Moryflow's value proposition broader at a comparable price point.",
            ],
          },
        ],
        faqs: [
          {
            question: 'Can I import my Mem notes into Moryflow?',
            answer:
              'Yes. Export from Mem as Markdown and import into Moryflow. AI-generated tags from Mem will not transfer, but Moryflow agents can re-organize your content.',
          },
          {
            question: 'Does Mem have AI agents?',
            answer:
              "No. Mem's AI is focused on search, auto-tagging, and content suggestions. It does not offer autonomous agents, persistent memory, or multi-step task execution.",
          },
          {
            question: 'Which is easier to set up?',
            answer:
              'Mem is simpler to start — sign up and type. Moryflow requires a desktop download but offers more control. Both are usable within minutes.',
          },
          {
            question: 'Can Moryflow auto-organize notes like Mem?',
            answer:
              'Moryflow agents can organize and tag notes, but the approach is different. Instead of passive auto-tagging, agents actively restructure content based on your instructions and context.',
          },
          {
            question: 'Is Mem open source?',
            answer:
              'No. Mem is proprietary and cloud-only. Moryflow is fully open source with a local-first architecture.',
          },
        ],
        ctaTitle: 'Own Your AI-Powered Notes',
        ctaDescription:
          'Download Moryflow free — autonomous agents, BYOK, and publishing in a local-first, open-source workspace.',
        relatedPages: [
          { label: 'Moryflow vs Roam Research', href: '/blog/moryflow-vs-roam-research' },
          { label: 'Notion AI Alternatives', href: '/blog/notion-ai-alternatives' },
          { label: 'AI Note-Taking App', href: '/ai-note-taking-app' },
          { label: 'Agent Workspace', href: '/agent-workspace' },
          { label: 'Local-First AI Notes', href: '/local-first-ai-notes' },
        ],
      },
      zh: {
        title: 'Moryflow 与 Mem 对比：自主智能体 vs AI 智能搜索',
        description:
          '深度对比 Moryflow 和 Mem 的 AI 笔记体验。从自主智能体、BYOK 模型选择、本地优先架构到云端 AI 搜索和自动标签机制，逐项分析两者差异，帮你找到最适合的 AI 笔记工具。',
        headline: 'Moryflow 与 Mem：AI 笔记的两种路径',
        subheadline:
          'Mem 用专有 AI 实现自动组织，以智能搜索和标签见长。Moryflow 更进一步——自主智能体可研究、写作、发布，同时本地优先、开源并支持 BYOK 模型选择。',
        keyTakeaways: [
          'Mem 专注 AI 搜索和自动组织，Moryflow 提供可代你行动的自主智能体。',
          'Moryflow 本地优先且开源，Mem 纯云端且闭源。',
          'Moryflow 支持 24+ 家服务商的 BYOK 接入，Mem 使用固定的专有 AI。',
          'Moryflow 内置一键发布，Mem 是纯私人工作空间，无发布功能。',
          'Mem 在无摩擦捕捉和自动标签快速检索方面表现出色。',
        ],
        sections: [
          {
            heading: 'AI 理念：智能体 vs 智能搜索',
            paragraphs: [
              'Mem 和 Moryflow 都将 AI 置于笔记体验的核心，但对"AI"的定义截然不同。Mem 的 AI 是搜索和组织层：自动标签笔记、在写作时浮现相关内容、提供理解上下文的自然语言搜索。目标是消除手动归档，让笔记自动组织。',
              'Moryflow 的 AI 是智能体模式。智能体不仅能找到信息，还能对信息采取行动。Moryflow 智能体可以自主研究主题、综合发现为结构化草稿，并在跨会话中记住你的偏好。Telegram 远程智能体让你在手机上即可委派任务给知识库。',
              '核心区别在于自主性。Mem 帮你更快找到东西。Moryflow 帮你完成原本需要手动做的事——研究、起草、组织、发布。',
            ],
            callout: 'Mem 的 AI 负责查找和组织，Moryflow 的 AI 负责研究、写作和发布。',
          },
          {
            heading: '数据所有权与架构',
            paragraphs: [
              'Moryflow 本地优先：笔记默认存储在你的设备上，可选加密云同步。代码库开源，你可以审计安全性、自托管或 fork。随时导出为 Markdown，绝无供应商锁定。',
              'Mem 是云原生架构。所有笔记存储在 Mem 服务器上，AI 处理在其云端完成。产品闭源，无开源组件。虽然支持导出，但 AI 生成的组织（标签、关联）无法迁移。',
              '对于在意数据主权、隐私合规或希望掌控工具的用户，架构差异是根本性的。',
            ],
            callout: '你的笔记、你的设备、你选择的 AI——Moryflow 让你始终掌控。',
          },
          {
            heading: '模型选择：BYOK vs 锁定',
            paragraphs: [
              'Moryflow 的 BYOK（自带密钥）模型让你接入 24+ 家服务商的 API 密钥——OpenAI、Anthropic、Google、Mistral、本地模型等。你根据任务、预算和隐私需求选择模型。新模型发布时，即时切换。',
              'Mem 使用专有 AI 栈。你不能选择模型，也无法自带密钥。这简化了体验——无需配置——但也意味着你绑定了 Mem 的 AI 决策和定价。',
              'BYOK 对高级用户、有合规要求的团队和希望本地运行 AI 的人是显著优势。Mem 的方式更适合偏好开箱即用、不想管理 API 密钥的用户。',
            ],
          },
          {
            heading: '发布与输出',
            paragraphs: [
              'Moryflow 将发布视为核心工作流。选择笔记，点击发布，内容即上线为带 SEO 元数据、自定义域名和响应式设计的网站。这使 Moryflow 兼具私人知识库和公开发布平台的双重角色。',
              'Mem 纯粹定位为私人工作空间。没有发布功能、没有共享页面、没有将笔记变为公开站点的途径。如需分享，只能复制文本到其他平台。',
              '对于写博客、维护文档或运营数字花园的知识工作者，发布能力的缺失是两者间最大的功能差异。',
            ],
          },
          {
            heading: '定价与价值',
            paragraphs: [
              'Mem 提供有限 AI 查询的免费版和 $10/月起的付费版。产品简洁、设计精良、专注。它将"AI 组织笔记"这件事做得很好。',
              'Moryflow 免费版包含本地 AI 无限使用、核心智能体功能和无限笔记。Pro 版增加云同步、高级智能体和发布。开源模式意味着免费版不是人为阉割——它就是完整产品加可选云服务。',
              '想要简洁精致的 AI 笔记本的用户会觉得 Mem 有吸引力。想要智能体、发布、模型选择和数据所有权的用户会发现 Moryflow 在相近价格下提供了更广的价值面。',
            ],
          },
        ],
        faqs: [
          {
            question: '能把 Mem 笔记导入 Moryflow 吗？',
            answer:
              '可以。从 Mem 导出 Markdown 后导入 Moryflow。Mem 的 AI 生成标签不会迁移，但 Moryflow 智能体可以重新组织你的内容。',
          },
          {
            question: 'Mem 有 AI 智能体吗？',
            answer:
              '没有。Mem 的 AI 专注于搜索、自动标签和内容建议，不提供自主智能体、持久记忆或多步骤任务执行。',
          },
          {
            question: '哪个上手更简单？',
            answer:
              'Mem 更简单——注册即可使用。Moryflow 需要下载桌面端但提供更多掌控。两者都可在几分钟内开始使用。',
          },
          {
            question: 'Moryflow 能像 Mem 那样自动组织笔记吗？',
            answer:
              'Moryflow 智能体可以组织和标签笔记，但方式不同。不是被动的自动标签，而是智能体根据你的指令和上下文主动重构内容。',
          },
          {
            question: 'Mem 是开源的吗？',
            answer: '不是。Mem 是闭源的纯云端产品。Moryflow 完全开源，采用本地优先架构。',
          },
        ],
        ctaTitle: '掌控你的 AI 笔记',
        ctaDescription:
          '免费下载 Moryflow——在本地优先的开源工作空间中体验自主智能体、BYOK 和一键发布。',
        relatedPages: [
          { label: 'Moryflow vs Roam Research', href: '/blog/moryflow-vs-roam-research' },
          { label: 'Notion AI 替代方案', href: '/blog/notion-ai-alternatives' },
          { label: 'AI 笔记应用', href: '/ai-note-taking-app' },
          { label: '智能体工作空间', href: '/agent-workspace' },
          { label: '本地优先 AI 笔记', href: '/local-first-ai-notes' },
        ],
      },
    },
  },

  // ─── Article 4: ai-agents-for-research ───────────────────────────
  {
    slug: 'ai-agents-for-research',
    publishedAt: '2026-03-17',
    content: {
      en: {
        title: 'AI Agents for Research: From Search to Synthesis',
        description:
          'Learn how AI research agents go beyond chatbots with autonomy, memory, and tool use. See how Moryflow agents gather, synthesize, organize, and publish research.',
        headline: 'AI Agents for Research: How Autonomous AI Transforms Knowledge Work',
        subheadline:
          'AI research agents do not just answer questions — they plan multi-step investigations, synthesize information across sources, and remember context between sessions. This is how the research workflow is changing.',
        keyTakeaways: [
          '47% of digital workers report struggling to find the information they need (Gartner).',
          'AI agents differ from chatbots in three ways: autonomy, persistent memory, and tool use.',
          'The research workflow shifts from search-read-copy to gather-synthesize-organize-publish.',
          'BYOK agent systems let researchers choose models based on task, cost, and privacy.',
          'The AI knowledge management market is growing at a 47.2% CAGR.',
        ],
        sections: [
          {
            heading: 'The Research Problem AI Agents Solve',
            paragraphs: [
              'Knowledge workers spend an estimated 20% of their time searching for information, according to McKinsey. Gartner reports that 47% of digital workers struggle to find the information they need to do their jobs. The problem is not a lack of data — it is an overload of scattered, unstructured information across tools, documents, and web sources.',
              'Traditional AI assistants help by answering questions, but they require the researcher to know what to ask, where to look, and how to connect the dots. Each query starts from scratch, with no memory of previous interactions. This is the chatbot paradigm: reactive, stateless, and limited to one-turn exchanges.',
              'AI agents represent a fundamentally different approach. An agent can take a high-level research goal, break it into steps, execute those steps across multiple sources, synthesize the results, and present organized findings — all while remembering what you have researched before.',
            ],
            callout:
              '47% of digital workers struggle to find the information they need — Gartner, 2025.',
          },
          {
            heading: 'What Makes Agents Different from Chatbots',
            paragraphs: [
              'The distinction between AI agents and chatbots rests on three capabilities. First, autonomy: agents can plan and execute multi-step workflows without requiring a prompt at every step. A research agent does not wait for you to ask follow-up questions — it anticipates what information is needed and goes to get it.',
              'Second, persistent memory: agents maintain context across sessions. When you return to a research project after a week, the agent remembers your sources, your conclusions so far, and your stated preferences. This eliminates the repeated context-setting that makes chatbots inefficient for long-running projects.',
              'Third, tool use: agents can call external tools — search engines, databases, APIs, your own note library — to gather information that is not in their training data. This grounds research in current, verifiable sources rather than parametric knowledge alone.',
            ],
          },
          {
            heading: 'The Agent-Driven Research Workflow',
            paragraphs: [
              'With AI agents, the research workflow transforms from search-read-copy to a four-phase cycle: gather, synthesize, organize, publish. In the gather phase, the agent searches across your notes, the web, and connected sources, collecting relevant material based on your research brief.',
              'In the synthesis phase, the agent cross-references findings, identifies patterns and contradictions, and produces a structured summary. The organize phase maps insights into your existing knowledge graph, linking new research to previous work. Finally, the publish phase turns polished notes into shareable content.',
              'This cycle can run semi-autonomously. You set the direction, review key outputs, and refine the brief. The agent handles the time-intensive middle steps that previously consumed hours of manual work.',
            ],
            callout:
              'The research cycle shifts from manual search-read-copy to agent-driven gather-synthesize-organize-publish.',
          },
          {
            heading: 'How Moryflow Agents Work for Research',
            paragraphs: [
              "Moryflow's agent system is built specifically for knowledge-intensive research. Agents run inside a local-first workspace, meaning your research data never leaves your device unless you choose to sync. The BYOK model gives you access to 24+ AI providers — use GPT-4o for broad synthesis, Claude for nuanced analysis, or a local model for sensitive data.",
              'Adaptive memory is the key differentiator. Moryflow agents build a persistent understanding of your research context: your terminology, your sources, your ongoing questions. When you start a new session, the agent does not ask you to re-explain your project — it picks up where you left off.',
              'The Telegram remote agent extends research beyond the desktop. Capture a thought, ask a question about your notes, or trigger a research task from your phone. Results are waiting in your workspace when you return.',
            ],
          },
          {
            heading: 'The Market Shift Toward Agentic Research',
            paragraphs: [
              'The AI knowledge management market is projected to grow at a 47.2% CAGR through 2030, driven by enterprise demand for tools that go beyond retrieval to active knowledge synthesis. This growth reflects a structural shift: organizations are moving from "search-based" to "agent-based" knowledge systems.',
              'Academic research is following the same trajectory. Literature review, systematic review, and meta-analysis — tasks that previously took weeks of manual effort — are increasingly delegated to AI agents that can process hundreds of papers and surface relevant findings in hours.',
              'The researchers and teams that adopt agent-based workflows today are building a compounding advantage. Each research session trains the agent, improving future results. This is the flywheel effect that makes agentic research qualitatively different from one-shot AI queries.',
            ],
            callout:
              'The AI knowledge management market is growing at 47.2% CAGR, driven by the shift from search to synthesis.',
          },
        ],
        faqs: [
          {
            question: 'What is an AI research agent?',
            answer:
              'An AI research agent is an autonomous system that can plan multi-step investigations, gather information from multiple sources, synthesize findings, and maintain memory across sessions — unlike chatbots that handle single queries.',
          },
          {
            question: 'How are AI agents different from ChatGPT?',
            answer:
              'ChatGPT is a conversational AI that responds to individual prompts. AI agents can autonomously plan tasks, use external tools, and remember context between sessions without re-prompting.',
          },
          {
            question: 'Can AI agents replace human researchers?',
            answer:
              'No. AI agents handle information gathering and synthesis at scale, but human judgment is essential for hypothesis formation, ethical evaluation, and critical interpretation of results.',
          },
          {
            question: 'Is my research data safe with AI agents?',
            answer:
              'In local-first systems like Moryflow, your data stays on your device. BYOK models let you choose providers and keep API traffic under your control. Cloud-only tools carry more data-residency risk.',
          },
          {
            question: 'What types of research benefit most from AI agents?',
            answer:
              'Literature reviews, competitive analysis, market research, and any workflow involving large-scale information synthesis across multiple sources benefit most from AI agents.',
          },
        ],
        ctaTitle: 'Research Smarter with AI Agents',
        ctaDescription:
          'Download Moryflow free and put autonomous research agents to work on your next project.',
        relatedPages: [
          { label: 'AI Agents for Writing', href: '/blog/ai-agents-for-writing' },
          { label: 'Agent Workspace', href: '/agent-workspace' },
          { label: 'Second Brain App', href: '/second-brain-app' },
          { label: 'AI Note-Taking App', href: '/ai-note-taking-app' },
          { label: 'Local-First AI Notes', href: '/local-first-ai-notes' },
        ],
      },
      zh: {
        title: 'AI 研究智能体：从搜索到综合',
        description:
          '深入了解 AI 研究智能体如何凭借自主规划、持久记忆和外部工具调用能力超越传统聊天机器人。探索 Moryflow 智能体如何完成从收集、综合、组织到发布研究成果的完整工作流。',
        headline: 'AI 研究智能体：自主 AI 如何重塑知识工作',
        subheadline:
          'AI 研究智能体不只是回答问题——它们规划多步调研、跨来源综合信息、在会话间保持记忆。研究工作流正在发生根本性变化。',
        keyTakeaways: [
          '47% 的数字化工作者表示难以找到所需信息（Gartner）。',
          'AI 智能体与聊天机器人的三大区别：自主性、持久记忆、工具调用。',
          '研究工作流从搜索-阅读-复制转向收集-综合-组织-发布。',
          'BYOK 智能体系统让研究者按任务、成本和隐私需求选择模型。',
          'AI 知识管理市场正以 47.2% 的年复合增长率增长。',
        ],
        sections: [
          {
            heading: 'AI 智能体解决的研究痛点',
            paragraphs: [
              '据麦肯锡估计，知识工作者约 20% 的时间花在搜索信息上。Gartner 报告显示，47% 的数字化工作者难以找到完成工作所需的信息。问题不是数据匮乏，而是信息散落在各种工具、文档和网络来源中，分散且无结构。',
              '传统 AI 助手通过回答问题提供帮助，但要求研究者知道问什么、去哪里找、如何连接线索。每次查询都从零开始，不记得之前的交互。这就是聊天机器人范式：被动、无状态、局限于单轮交互。',
              'AI 智能体代表了一种根本不同的方法。智能体可以接受一个高层研究目标，拆解为步骤，跨多个来源执行，综合结果，呈现有组织的发现——同时记住你之前研究过什么。',
            ],
            callout: '47% 的数字化工作者难以找到所需信息——Gartner，2025。',
          },
          {
            heading: '智能体与聊天机器人的本质区别',
            paragraphs: [
              'AI 智能体与聊天机器人的区别在于三项能力。第一，自主性：智能体能规划和执行多步骤工作流，无需每一步都等待提示。研究智能体不会等你追问——它预判需要什么信息并主动获取。',
              '第二，持久记忆：智能体在跨会话中保持上下文。当你一周后回到一个研究项目，智能体记得你的资料来源、已有结论和偏好设置。这消除了让聊天机器人在长期项目中效率低下的重复上下文设定。',
              '第三，工具调用：智能体能调用外部工具——搜索引擎、数据库、API、你自己的笔记库——获取训练数据之外的信息。这让研究基于当前可验证的来源，而非仅依赖模型参数知识。',
            ],
          },
          {
            heading: '智能体驱动的研究工作流',
            paragraphs: [
              '借助 AI 智能体，研究工作流从搜索-阅读-复制转变为四阶段循环：收集、综合、组织、发布。在收集阶段，智能体根据你的研究提纲，在笔记、网络和连接的数据源中搜索相关材料。',
              '在综合阶段，智能体交叉验证发现、识别模式和矛盾、产出结构化摘要。组织阶段将洞见映射到已有知识图谱中，将新研究与之前的工作关联。发布阶段则将打磨好的笔记转化为可分享的内容。',
              '这个循环可以半自主运行。你设定方向、审核关键产出、优化提纲。智能体处理之前耗费数小时手动劳动的中间环节。',
            ],
            callout: '研究循环从手动的搜索-阅读-复制转向智能体驱动的收集-综合-组织-发布。',
          },
          {
            heading: 'Moryflow 智能体如何服务研究',
            paragraphs: [
              'Moryflow 的智能体系统专为知识密集型研究而建。智能体运行在本地优先的工作空间中，你的研究数据不会离开设备，除非你选择同步。BYOK 模型让你接入 24+ 家 AI 服务商——用 GPT-4o 做宏观综合，用 Claude 做细致分析，或用本地模型处理敏感数据。',
              '自适应记忆是核心差异化能力。Moryflow 智能体会构建对你研究上下文的持久理解：你的术语、你的来源、你持续关注的问题。开始新会话时，智能体不需要你重新解释项目——它接着上次继续。',
              'Telegram 远程智能体将研究延伸到桌面之外。在手机上捕捉想法、查询笔记或触发研究任务。结果会在你回到工作空间时等候就绪。',
            ],
          },
          {
            heading: '市场向智能体研究的结构性转移',
            paragraphs: [
              'AI 知识管理市场预计到 2030 年将以 47.2% 的年复合增长率增长，驱动力来自企业对超越检索、实现主动知识综合的工具需求。这一增长反映了结构性变化：组织正在从"基于搜索"向"基于智能体"的知识系统迁移。',
              '学术研究正沿同一轨迹发展。文献综述、系统综述和荟萃分析——这些以前需要数周手动努力的任务——正越来越多地委托给能在数小时内处理数百篇论文并浮现相关发现的 AI 智能体。',
              '今天采用智能体工作流的研究者和团队正在积累复利优势。每次研究会话都在训练智能体，改善未来结果。这就是使智能体研究从根本上区别于一次性 AI 查询的飞轮效应。',
            ],
            callout: 'AI 知识管理市场以 47.2% 年复合增长率增长，驱动力是从搜索到综合的转变。',
          },
        ],
        faqs: [
          {
            question: '什么是 AI 研究智能体？',
            answer:
              'AI 研究智能体是一种自主系统，能规划多步调研、从多个来源收集信息、综合发现，并在跨会话中保持记忆——不同于处理单次查询的聊天机器人。',
          },
          {
            question: 'AI 智能体和 ChatGPT 有什么区别？',
            answer:
              'ChatGPT 是响应单个提示的对话式 AI。AI 智能体可以自主规划任务、使用外部工具，并在无需重复提示的情况下跨会话记忆上下文。',
          },
          {
            question: 'AI 智能体能取代人类研究者吗？',
            answer:
              '不能。AI 智能体处理大规模信息收集和综合，但假设形成、伦理评估和结果批判性解读仍需人类判断。',
          },
          {
            question: '我的研究数据在 AI 智能体中安全吗？',
            answer:
              '在 Moryflow 等本地优先系统中，数据留在你的设备上。BYOK 模型让你选择服务商并掌控 API 流量。纯云端工具的数据驻留风险更高。',
          },
          {
            question: '哪些类型的研究最受益于 AI 智能体？',
            answer:
              '文献综述、竞争分析、市场研究以及任何涉及跨多来源大规模信息综合的工作流最受益于 AI 智能体。',
          },
        ],
        ctaTitle: '用 AI 智能体更聪明地做研究',
        ctaDescription: '免费下载 Moryflow，让自主研究智能体为你的下一个项目助力。',
        relatedPages: [
          { label: 'AI 写作智能体', href: '/blog/ai-agents-for-writing' },
          { label: '智能体工作空间', href: '/agent-workspace' },
          { label: '第二大脑应用', href: '/second-brain-app' },
          { label: 'AI 笔记应用', href: '/ai-note-taking-app' },
          { label: '本地优先 AI 笔记', href: '/local-first-ai-notes' },
        ],
      },
    },
  },

  // ─── Article 5: ai-agents-for-writing ────────────────────────────
  {
    slug: 'ai-agents-for-writing',
    publishedAt: '2026-03-17',
    content: {
      en: {
        title: 'AI Agents for Writing: Beyond Autocomplete to Autonomy',
        description:
          'Discover how AI writing agents differ from assistants. Learn how autonomous agents use memory, your knowledge base, and style to draft.',
        headline: 'AI Agents for Writing: From Assistants to Autonomous Collaborators',
        subheadline:
          'AI writing has evolved from autocomplete to assistants to autonomous agents. Writing agents work independently on drafts, remember your style, use your knowledge base as context, and publish finished work — a fundamentally different workflow.',
        keyTakeaways: [
          '41% of code is now AI-generated (Panto), and content creation is the fastest-growing AI use case.',
          'Writing agents differ from assistants: they plan, draft, revise, and remember autonomously.',
          'Adaptive memory means the agent learns your voice, terminology, and preferences over time.',
          'The workflow shifts from blank-page writing to outline-draft-refine-publish with AI support.',
          'BYOK lets writers choose models tuned for their specific writing needs.',
        ],
        sections: [
          {
            heading: 'The Evolution of AI Writing Tools',
            paragraphs: [
              'AI writing has passed through three distinct phases. The first phase was autocomplete — predictive text that finished your sentences. Gmail Smart Compose and Grammarly-style suggestions made typing faster but did not change the fundamental writing process. You still started with a blank page and built every paragraph yourself.',
              'The second phase was AI assistants — tools like ChatGPT, Jasper, and Copy.ai that generate text on demand. You provide a prompt, the AI produces a draft. This was a genuine productivity leap, but the interaction model is transactional: each request is independent, the AI has no memory of your previous work, and the output requires significant editing to match your voice.',
              'The third phase, now emerging, is AI agents. Writing agents do not wait for prompts. They take a high-level brief, plan the document structure, pull relevant information from your knowledge base, draft sections autonomously, and revise based on feedback. Critically, they remember your style across sessions. This is not a faster typewriter — it is a collaborator.',
            ],
            callout:
              'From autocomplete to assistants to agents: each generation gives the writer more leverage and less busywork.',
          },
          {
            heading: 'What Makes a Writing Agent Different',
            paragraphs: [
              "Three capabilities separate writing agents from writing assistants. First, planning: an agent doesn't just generate text — it outlines a document, identifies what information is needed, and structures the argument before writing a single paragraph. This means the first draft is architecturally sound, not just fluent.",
              "Second, contextual knowledge: writing agents draw from your existing notes, previous documents, and accumulated research. When Moryflow's agent drafts an article, it references your knowledge base — not just its training data. This produces content that is grounded in your specific expertise and consistent with your body of work.",
              'Third, adaptive memory: the agent learns your voice over time. It remembers that you prefer short sentences, avoid jargon, use Oxford commas, or structure arguments inductively. After a few sessions, the agent produces drafts that sound like you wrote them, reducing revision time dramatically.',
            ],
          },
          {
            heading: 'The Agent-Powered Writing Workflow',
            paragraphs: [
              'The traditional writing workflow is linear: research, outline, draft, edit, publish. Each step is manual and sequential. The agent-powered workflow is parallel and iterative. You provide a brief — a topic, audience, key points, desired length. The agent generates a structured outline for your approval.',
              'Once you approve or adjust the outline, the agent drafts each section, pulling from your notes and external sources as needed. You review the draft section by section, providing feedback that the agent incorporates immediately. The revision loop is tight: minutes instead of hours.',
              'In Moryflow, the final step is one-click publishing. Your polished draft becomes a live page with SEO metadata, Open Graph tags, and responsive design — no context switch to a separate CMS. The entire pipeline from idea to published page happens in one workspace.',
            ],
            callout:
              'The shift from blank-page writing to brief-outline-draft-publish collapses hours of work into focused review sessions.',
          },
          {
            heading: 'Adaptive Memory: How Agents Learn Your Voice',
            paragraphs: [
              "Moryflow's adaptive memory system is what turns a generic AI writer into a personalized collaborator. The agent tracks patterns in your writing: sentence length, vocabulary preferences, structural habits, tone. It also remembers factual context — your areas of expertise, recurring themes, preferred citations.",
              "This memory is persistent and local. It lives on your device, not in a cloud model's training data. You can inspect what the agent has learned, correct misunderstandings, and reset memory for specific contexts. The result is a writing assistant that improves with every interaction without compromising your privacy.",
              'The practical impact is measurable. Users report that after 10-15 sessions, agent-generated drafts require 60-70% less editing than generic AI output. The agent does not replace your voice — it amplifies it.',
            ],
          },
          {
            heading: 'The Scale of AI-Assisted Content Creation',
            paragraphs: [
              'The data makes the trend clear. Research from Panto shows that 41% of code is now AI-generated, and content creation is the fastest-growing category of AI application outside of software development. Enterprises that adopted AI writing tools in 2024-2025 report 3-5x increases in content output with stable or improved quality.',
              'The shift is not just about volume. AI writing agents enable a qualitative change: individuals and small teams can maintain consistent, high-quality content across blogs, documentation, social media, and internal knowledge bases — output levels that previously required dedicated content teams.',
              'For independent writers, researchers, and small businesses, AI writing agents level the playing field. A solo creator with an agent-based workspace can produce and publish at the cadence of a small content operation, while maintaining a personal voice and editorial standards.',
            ],
            callout:
              '41% of code is AI-generated. Content creation is the fastest-growing AI use case outside engineering.',
          },
        ],
        faqs: [
          {
            question: 'What is an AI writing agent?',
            answer:
              'An AI writing agent is an autonomous system that plans, drafts, and revises documents using your knowledge base and adaptive memory — unlike writing assistants that generate text from individual prompts.',
          },
          {
            question: 'Will AI writing agents replace human writers?',
            answer:
              'No. Agents handle structure, research synthesis, and first-draft generation. Human writers provide voice, judgment, creativity, and editorial direction that AI cannot replicate.',
          },
          {
            question: 'How does adaptive memory work?',
            answer:
              'The agent observes your writing patterns — sentence length, vocabulary, tone, structure — and applies these preferences to future drafts. Memory is stored locally and can be inspected or reset.',
          },
          {
            question: 'Can I use AI writing agents for different types of content?',
            answer:
              'Yes. Agents adapt to blog posts, documentation, academic papers, newsletters, and more. You can maintain separate style profiles for different content types.',
          },
          {
            question: 'Do I need technical skills to use a writing agent?',
            answer:
              'No. In Moryflow, you interact with the agent through natural language. Provide a brief, review the output, give feedback. No coding or prompt engineering required.',
          },
        ],
        ctaTitle: 'Write with an Agent That Knows Your Voice',
        ctaDescription:
          'Download Moryflow free — autonomous writing agents with adaptive memory and one-click publishing.',
        relatedPages: [
          { label: 'AI Agents for Research', href: '/blog/ai-agents-for-research' },
          { label: 'Notes to Published Site', href: '/blog/notes-to-published-site' },
          { label: 'Agent Workspace', href: '/agent-workspace' },
          { label: 'Digital Garden App', href: '/digital-garden-app' },
          { label: 'Notes to Website', href: '/notes-to-website' },
        ],
      },
      zh: {
        title: 'AI 写作智能体：从自动补全到自主协作',
        description:
          '深入了解 AI 写作智能体与传统写作助手的本质区别。探索自主智能体如何利用持久记忆、个人知识库和自适应风格学习能力，在 Moryflow 中高效完成从大纲规划、内容起草到一键发布的全流程写作协作。',
        headline: 'AI 写作智能体：从辅助工具到自主协作者',
        subheadline:
          'AI 写作经历了从自动补全到助手再到自主智能体的演进。写作智能体能独立处理草稿、记住你的风格、以你的知识库为上下文，并发布成品——这是一种全新的工作流。',
        keyTakeaways: [
          '41% 的代码现在由 AI 生成（Panto），内容创作是增长最快的 AI 应用场景。',
          '写作智能体与助手的区别：能自主规划、起草、修改并记忆。',
          '自适应记忆意味着智能体会随时间学习你的语言风格、术语和偏好。',
          '工作流从空白页写作转变为提纲-草稿-精修-发布的 AI 协作模式。',
          'BYOK 让写作者选择最适合特定写作需求的模型。',
        ],
        sections: [
          {
            heading: 'AI 写作工具的演进',
            paragraphs: [
              'AI 写作经历了三个阶段。第一阶段是自动补全——预测文本帮你完成句子。Gmail 智能撰写和 Grammarly 式建议加快了打字速度，但没有改变写作的基本流程。你仍然面对空白页，逐段构建内容。',
              '第二阶段是 AI 助手——ChatGPT、Jasper、Copy.ai 等按需生成文本的工具。你提供提示，AI 产出草稿。这确实提升了生产力，但交互模式是事务性的：每次请求独立，AI 不记得你之前的工作，输出需要大量编辑才能匹配你的风格。',
              '第三阶段正在到来——AI 智能体。写作智能体不等待提示。它们接受高层简报，规划文档结构，从你的知识库中提取相关信息，自主起草各节，并根据反馈修改。关键是，它们在跨会话中记住你的风格。这不是更快的打字机，而是一个协作者。',
            ],
            callout: '从自动补全到助手再到智能体：每一代给写作者更多杠杆，更少重复劳动。',
          },
          {
            heading: '写作智能体的三大核心能力',
            paragraphs: [
              '三项能力将写作智能体与写作助手区分开。第一，规划能力：智能体不只是生成文本——它先列大纲、识别需要什么信息、在写任何段落之前构建论证结构。这意味着初稿在架构上就是合理的，而不只是流畅。',
              '第二，上下文知识：写作智能体利用你已有的笔记、历史文档和积累的研究。当 Moryflow 的智能体起草文章时，它参考的是你的知识库——不仅仅是训练数据。这产出基于你专业知识的内容，与你的整体作品保持一致。',
              '第三，自适应记忆：智能体随时间学习你的风格。它记住你偏好短句、避免术语、使用牛津逗号，或习惯归纳式论证。几次会话后，智能体产出的草稿听起来就像你写的，大幅减少修改时间。',
            ],
          },
          {
            heading: '智能体驱动的写作工作流',
            paragraphs: [
              '传统写作工作流是线性的：研究、列纲、起草、编辑、发布。每一步都是手动且顺序执行。智能体驱动的工作流是并行且迭代的。你提供简报——主题、受众、要点、期望长度。智能体生成结构化大纲供你审批。',
              '批准或调整大纲后，智能体逐节起草，按需从你的笔记和外部来源中提取素材。你逐节审查草稿，提供反馈后智能体即时整合。修改循环很紧凑：以分钟而非小时计。',
              '在 Moryflow 中，最后一步是一键发布。你打磨好的草稿变成带 SEO 元数据、Open Graph 标签和响应式设计的在线页面——无需切换到独立的 CMS。从想法到发布页面的全流程在一个工作空间内完成。',
            ],
            callout:
              '从空白页写作到简报-大纲-草稿-发布的转变，将数小时的工作压缩为专注的审阅环节。',
          },
          {
            heading: '自适应记忆：智能体如何学习你的风格',
            paragraphs: [
              'Moryflow 的自适应记忆系统将通用 AI 写手变为个性化协作者。智能体追踪你的写作模式：句子长度、词汇偏好、结构习惯、语调。它还记住事实上下文——你的专业领域、反复出现的主题、偏好的引用。',
              '这种记忆是持久且本地的。它存储在你的设备上，不进入云端模型的训练数据。你可以检查智能体学到了什么，纠正误解，为特定场景重置记忆。结果是一个随每次交互而改善、同时不损害隐私的写作助手。',
              '实际影响是可衡量的。用户反馈在 10-15 次会话后，智能体生成的草稿比通用 AI 输出减少 60-70% 的编辑量。智能体不替代你的声音——它放大你的声音。',
            ],
          },
          {
            heading: 'AI 辅助内容创作的规模',
            paragraphs: [
              '数据清晰地展示了趋势。Panto 的研究显示 41% 的代码现由 AI 生成，内容创作是软件开发之外增长最快的 AI 应用类别。2024-2025 年采用 AI 写作工具的企业报告内容产出提升 3-5 倍，质量保持稳定甚至提升。',
              '变化不仅在于数量。AI 写作智能体带来质的改变：个人和小团队可以在博客、文档、社交媒体和内部知识库上保持一致、高质量的内容——这种产出水平以前需要专职内容团队。',
              '对独立写作者、研究者和小企业来说，AI 写作智能体拉平了竞争场。一个拥有智能体工作空间的独立创作者可以按小型内容团队的节奏生产和发布，同时保持个人风格和编辑标准。',
            ],
            callout: '41% 的代码由 AI 生成。内容创作是工程之外增长最快的 AI 应用场景。',
          },
        ],
        faqs: [
          {
            question: '什么是 AI 写作智能体？',
            answer:
              'AI 写作智能体是一种自主系统，利用你的知识库和自适应记忆来规划、起草和修改文档——不同于从单个提示生成文本的写作助手。',
          },
          {
            question: 'AI 写作智能体会取代人类写作者吗？',
            answer:
              '不会。智能体处理结构、研究综合和初稿生成。人类写作者提供的声音、判断力、创造力和编辑方向是 AI 无法复制的。',
          },
          {
            question: '自适应记忆是怎么工作的？',
            answer:
              '智能体观察你的写作模式——句子长度、词汇、语调、结构——并将这些偏好应用到未来的草稿中。记忆存储在本地，可检查或重置。',
          },
          {
            question: '能用 AI 写作智能体处理不同类型的内容吗？',
            answer:
              '可以。智能体适应博客、文档、学术论文、通讯等多种内容类型。你可以为不同内容类型维护独立的风格档案。',
          },
          {
            question: '使用写作智能体需要技术能力吗？',
            answer:
              '不需要。在 Moryflow 中，你通过自然语言与智能体交互。提供简报、审查产出、给予反馈即可。不需要编程或提示工程技能。',
          },
        ],
        ctaTitle: '用懂你风格的智能体写作',
        ctaDescription: '免费下载 Moryflow——自主写作智能体配备自适应记忆和一键发布。',
        relatedPages: [
          { label: 'AI 研究智能体', href: '/blog/ai-agents-for-research' },
          { label: '笔记变网站', href: '/blog/notes-to-published-site' },
          { label: '智能体工作空间', href: '/agent-workspace' },
          { label: '数字花园应用', href: '/digital-garden-app' },
          { label: '笔记转网站', href: '/notes-to-website' },
        ],
      },
    },
  },
];
