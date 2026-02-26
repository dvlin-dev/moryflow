/**
 * 图片生成器组件
 * 表单输入 + 结果展示
 */

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Image } from 'lucide-react';
import { imageGeneratorMethods } from '../methods';
import { ImageGeneratorForm } from './image-generator-form';
import { ImageGeneratorResult } from './image-generator-result';

export function ImageGenerator() {
  useEffect(() => {
    imageGeneratorMethods.resetImageGeneratorState();
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            生成参数
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ImageGeneratorForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>生成结果</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageGeneratorResult />
        </CardContent>
      </Card>
    </div>
  );
}
