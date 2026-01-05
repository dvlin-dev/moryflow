/**
 * AI Image 模块导出
 */

// Module
export { AiImageModule } from './ai-image.module';

// Service
export { AiImageService } from './ai-image.service';

// Config（供 admin 模块查询模型列表）
export {
  IMAGE_MODELS,
  DEFAULT_IMAGE_MODEL,
  getImageModelConfig,
  getEnabledImageModels,
  type ImageSdkType,
  type ImageModelConfig,
} from './config';

// DTO（供外部类型引用）
export type { ImageGenerationRequest, ImageGenerationResponse } from './dto';
