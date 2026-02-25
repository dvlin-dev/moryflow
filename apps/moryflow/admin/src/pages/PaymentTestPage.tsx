/**
 * 支付测试页面
 * 用于测试各产品的支付流程
 */
import { useState } from 'react';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Coins, CreditCard, SquareArrowUpRight, Loader } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { ADMIN_API } from '@/lib/api-paths';

// 产品配置（与后端保持一致）
const PRODUCTS = {
  subscriptions: [
    {
      id: 'basic_monthly',
      envKey: 'CREEM_PRODUCT_BASIC_MONTHLY',
      name: 'Basic Monthly',
      description: '基础会员 - 月付',
      price: 4.9,
      credits: 50000,
      cycle: 'monthly',
      tier: 'basic',
    },
    {
      id: 'basic_yearly',
      envKey: 'CREEM_PRODUCT_BASIC_YEARLY',
      name: 'Basic Yearly',
      description: '基础会员 - 年付（省 $9.80）',
      price: 49,
      credits: 50000,
      cycle: 'yearly',
      tier: 'basic',
    },
    {
      id: 'pro_monthly',
      envKey: 'CREEM_PRODUCT_PRO_MONTHLY',
      name: 'Pro Monthly',
      description: '专业会员 - 月付',
      price: 19,
      credits: 200000,
      cycle: 'monthly',
      tier: 'pro',
    },
    {
      id: 'pro_yearly',
      envKey: 'CREEM_PRODUCT_PRO_YEARLY',
      name: 'Pro Yearly',
      description: '专业会员 - 年付（省 $29）',
      price: 199,
      credits: 200000,
      cycle: 'yearly',
      tier: 'pro',
    },
  ],
  credits: [
    {
      id: 'credits_50000',
      envKey: 'CREEM_PRODUCT_CREDITS_50000',
      name: 'Credits Pack 50000',
      description: '50,000 积分包',
      price: 5,
      credits: 50000,
    },
  ],
};

interface ProductCardProps {
  product: {
    id: string;
    envKey: string;
    name: string;
    description: string;
    price: number;
    credits?: number;
    cycle?: string;
    tier?: string;
    devices?: number;
  };
  type: 'subscription' | 'credits';
  testUserId: string;
  onCheckout: (productEnvKey: string) => Promise<void>;
  isLoading: boolean;
}

function ProductCard({ product, type, testUserId, onCheckout, isLoading }: ProductCardProps) {
  const getTypeIcon = () => {
    switch (type) {
      case 'subscription':
        return <CreditCard className="h-5 w-5" />;
      case 'credits':
        return <Coins className="h-5 w-5" />;
    }
  };

  const getTypeBadge = () => {
    switch (type) {
      case 'subscription':
        return <Badge variant="default">订阅</Badge>;
      case 'credits':
        return <Badge variant="secondary">积分包</Badge>;
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getTypeIcon()}
            <CardTitle className="text-lg">{product.name}</CardTitle>
          </div>
          {getTypeBadge()}
        </div>
        <CardDescription>{product.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        <div className="space-y-2 mb-4">
          <div className="text-3xl font-bold">${product.price}</div>
          {product.credits && (
            <p className="text-sm text-muted-foreground">
              {product.credits.toLocaleString()} 积分
              {product.cycle === 'monthly' ? '/月' : product.cycle === 'yearly' ? '/月' : ''}
            </p>
          )}
          {product.devices && (
            <p className="text-sm text-muted-foreground">{product.devices} 台设备</p>
          )}
          {product.tier && (
            <Badge variant="outline" className="mt-2">
              {product.tier} 等级
            </Badge>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-mono break-all">ENV: {product.envKey}</p>
          <Button
            className="w-full"
            onClick={() => onCheckout(product.envKey)}
            disabled={!testUserId || isLoading}
          >
            {isLoading ? (
              <Loader className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <SquareArrowUpRight className="h-4 w-4 mr-2" />
            )}
            {!testUserId ? '请先输入用户 ID' : '测试购买'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PaymentTestPage() {
  const [testUserId, setTestUserId] = useState('');
  const [loadingProduct, setLoadingProduct] = useState<string | null>(null);

  const handleCheckout = async (productEnvKey: string) => {
    if (!testUserId) {
      toast.error('请输入测试用户 ID');
      return;
    }

    setLoadingProduct(productEnvKey);

    try {
      // 调用后端 API 创建 checkout session
      const data = await apiClient.post<{ checkoutUrl: string }>(
        `${ADMIN_API.PAYMENT}/test-checkout`,
        {
          productEnvKey,
          testUserId,
          successUrl: `${window.location.origin}/payment-test?success=true`,
          cancelUrl: `${window.location.origin}/payment-test?canceled=true`,
        }
      );

      if (data.checkoutUrl) {
        // 在新窗口打开 Creem checkout 页面
        window.open(data.checkoutUrl, '_blank');
        toast.success('已打开支付页面');
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error instanceof Error ? error.message : '创建支付失败');
    } finally {
      setLoadingProduct(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="支付测试" description="测试各产品的支付流程（使用 Creem 测试模式）" />

      {/* 测试配置 */}
      <Card className={!testUserId ? 'border-yellow-500 dark:border-yellow-600' : ''}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            测试配置
            {!testUserId && (
              <Badge variant="outline" className="text-yellow-600 border-yellow-500">
                必填
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            输入要测试的用户 ID，点击产品卡片上的"测试购买"按钮将在新窗口打开 Creem 支付页面
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-md">
              <Label htmlFor="testUserId">测试用户 ID *</Label>
              <Input
                id="testUserId"
                placeholder="输入用户 ID（可从用户管理页面复制）"
                value={testUserId}
                onChange={(e) => setTestUserId(e.target.value)}
                className={`mt-1.5 ${!testUserId ? 'border-yellow-500 focus:border-yellow-500' : ''}`}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                // 可以从 URL 参数获取成功/取消状态
                const params = new URLSearchParams(window.location.search);
                if (params.get('success')) {
                  toast.success('支付成功！请检查用户状态');
                } else if (params.get('canceled')) {
                  toast.info('支付已取消');
                }
              }}
            >
              检查回调状态
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 产品列表 */}
      <Tabs defaultValue="subscriptions">
        <TabsList>
          <TabsTrigger value="subscriptions">订阅产品</TabsTrigger>
          <TabsTrigger value="credits">积分包</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {PRODUCTS.subscriptions.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                type="subscription"
                testUserId={testUserId}
                onCheckout={handleCheckout}
                isLoading={loadingProduct === product.envKey}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="credits" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PRODUCTS.credits.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                type="credits"
                testUserId={testUserId}
                onCheckout={handleCheckout}
                isLoading={loadingProduct === product.envKey}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">使用说明</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. 从用户管理页面复制一个测试用户的 ID</p>
          <p>2. 在上方输入框中粘贴用户 ID</p>
          <p>3. 点击任意产品的"测试购买"按钮</p>
          <p>4. 在新窗口中完成 Creem 测试支付（使用测试卡号：4242 4242 4242 4242）</p>
          <p>5. 支付完成后，检查用户的等级或积分状态是否正确更新</p>
          <p className="text-yellow-600 dark:text-yellow-400 mt-4">
            ⚠️ 确保后端已配置 CREEM_TEST_MODE=true 和正确的产品 ID
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
