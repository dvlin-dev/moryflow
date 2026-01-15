/**
 * [PROPS]: onCreateSubscription, onBrowseTopics, onSignIn, isAuthenticated, onBrowseTopicsHover?, onCreateSubscriptionHover?
 * [POS]: 新用户引导组件，显示在空状态时
 */

import { motion } from 'motion/react';
import { Button, Icon, Card, CardContent } from '@aiget/ui';
import {
  Add01Icon,
  Search01Icon,
  RssIcon,
  SparklesIcon,
  Clock01Icon,
  Notification01Icon,
} from '@hugeicons/core-free-icons';

interface WelcomeGuideProps {
  /** 点击创建订阅 */
  onCreateSubscription: () => void;
  /** 预加载创建订阅弹窗 chunk */
  onCreateSubscriptionHover?: () => void;
  /** 点击浏览 Topics（Reader 内视图） */
  onBrowseTopics: () => void;
  /** 预加载 Topics 浏览 chunk */
  onBrowseTopicsHover?: () => void;
  /** 打开登录弹窗（未登录时） */
  onSignIn: () => void;
  /** 是否已登录 */
  isAuthenticated: boolean;
}

const features = [
  {
    icon: RssIcon,
    title: 'AI-Curated Content',
    description: 'Get personalized news and articles based on your interests',
  },
  {
    icon: SparklesIcon,
    title: 'Smart Summaries',
    description: 'AI-generated summaries help you quickly understand each article',
  },
  {
    icon: Clock01Icon,
    title: 'Scheduled Delivery',
    description: 'Receive digests at your preferred time - daily, weekly, or custom',
  },
  {
    icon: Notification01Icon,
    title: 'Multi-Channel',
    description: 'Get updates via inbox, email, or webhook integrations',
  },
];

/**
 * 新用户引导组件
 *
 * 显示 Aiget Digest 的功能介绍和快速操作入口
 */
export function WelcomeGuide({
  onCreateSubscription,
  onCreateSubscriptionHover,
  onBrowseTopics,
  onBrowseTopicsHover,
  onSignIn,
  isAuthenticated,
}: WelcomeGuideProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-lg text-center"
      >
        {/* 标题 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <h1 className="mb-2 text-2xl font-bold">Welcome to Aiget Digest</h1>
          <p className="mb-8 text-muted-foreground">
            Your AI-powered content curation assistant. Create subscriptions to receive personalized
            news digests on topics you care about.
          </p>
        </motion.div>

        {/* 功能介绍 */}
        <motion.div
          className="mb-8 grid gap-4 sm:grid-cols-2"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.1, delayChildren: 0.2 },
            },
          }}
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <Card className="h-full text-left">
                <CardContent className="p-4">
                  <div className="mb-2 flex size-8 items-center justify-center rounded-lg bg-primary/10">
                    <Icon icon={feature.icon} className="size-4 text-primary" />
                  </div>
                  <h3 className="mb-1 text-sm font-medium">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* 快速操作 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col gap-3 sm:flex-row sm:justify-center"
        >
          {isAuthenticated ? (
            <>
              <Button
                onClick={onCreateSubscription}
                onMouseEnter={onCreateSubscriptionHover}
                size="lg"
              >
                <Icon icon={Add01Icon} className="mr-2 size-4" />
                Create Subscription
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={onBrowseTopics}
                onMouseEnter={onBrowseTopicsHover}
              >
                <Icon icon={Search01Icon} className="mr-2 size-4" />
                Discover Topics
              </Button>
            </>
          ) : (
            <>
              <Button size="lg" onClick={onSignIn}>
                Sign In to Get Started
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={onBrowseTopics}
                onMouseEnter={onBrowseTopicsHover}
              >
                <Icon icon={Search01Icon} className="mr-2 size-4" />
                Browse Topics
              </Button>
            </>
          )}
        </motion.div>

        {/* 快捷键提示 */}
        {isAuthenticated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-8"
          >
            <p className="mb-2 text-xs font-medium text-muted-foreground">Keyboard Shortcuts</p>
            <div className="flex flex-wrap justify-center gap-2">
              <KeyboardHint keys={['j', 'k']} description="Navigate" />
              <KeyboardHint keys={['s']} description="Save" />
              <KeyboardHint keys={['x']} description="Not interested" />
              <KeyboardHint keys={['r']} description="Refresh" />
              <KeyboardHint keys={['o']} description="Open" />
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

function KeyboardHint({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      {keys.map((key, i) => (
        <span key={key}>
          {i > 0 && <span className="mx-0.5">/</span>}
          <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">{key}</kbd>
        </span>
      ))}
      <span className="ml-1">{description}</span>
    </div>
  );
}
