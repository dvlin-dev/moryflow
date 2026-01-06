import { PageHeader } from '@/components/shared/page-header';
import { ImageGenerator } from '@/features/image-generation';

export function ImageGenerationTestPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="图片生成测试"
        description="测试图片生成 API (gpt-image-1.5, seedream-4.5, gemini-3-pro-image)"
      />
      <ImageGenerator />
    </div>
  );
}
