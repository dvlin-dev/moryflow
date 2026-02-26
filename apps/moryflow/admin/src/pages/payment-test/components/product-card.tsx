import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Coins, CreditCard, Loader, SquareArrowUpRight } from 'lucide-react';
import { getCreditsCycleSuffix } from '../cycle';

export interface PaymentTestProduct {
  id: string;
  envKey: string;
  name: string;
  description: string;
  price: number;
  credits?: number;
  cycle?: string;
  tier?: string;
  devices?: number;
}

interface ProductCardProps {
  product: PaymentTestProduct;
  type: 'subscription' | 'credits';
  testUserId: string;
  onCheckout: (productEnvKey: string) => Promise<void>;
  isLoading: boolean;
}

function ProductTypeIcon({ type }: Pick<ProductCardProps, 'type'>) {
  switch (type) {
    case 'subscription':
      return <CreditCard className="h-5 w-5" />;
    case 'credits':
      return <Coins className="h-5 w-5" />;
    default:
      return null;
  }
}

function ProductTypeBadge({ type }: Pick<ProductCardProps, 'type'>) {
  switch (type) {
    case 'subscription':
      return <Badge variant="default">订阅</Badge>;
    case 'credits':
      return <Badge variant="secondary">积分包</Badge>;
    default:
      return null;
  }
}

export function ProductCard({
  product,
  type,
  testUserId,
  onCheckout,
  isLoading,
}: ProductCardProps) {
  const creditsCycleSuffix = getCreditsCycleSuffix(product.cycle);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ProductTypeIcon type={type} />
            <CardTitle className="text-lg">{product.name}</CardTitle>
          </div>
          <ProductTypeBadge type={type} />
        </div>
        <CardDescription>{product.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between">
        <div className="mb-4 space-y-2">
          <div className="text-3xl font-bold">${product.price}</div>
          {product.credits && (
            <p className="text-sm text-muted-foreground">
              {product.credits.toLocaleString()} 积分
              {creditsCycleSuffix}
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
          <p className="break-all font-mono text-xs text-muted-foreground">ENV: {product.envKey}</p>
          <Button
            className="w-full"
            onClick={() => onCheckout(product.envKey)}
            disabled={!testUserId || isLoading}
          >
            {isLoading ? (
              <Loader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <SquareArrowUpRight className="mr-2 h-4 w-4" />
            )}
            {!testUserId ? '请先输入用户 ID' : '测试购买'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
