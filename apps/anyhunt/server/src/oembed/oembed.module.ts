/**
 * oEmbed Module
 */
import { Module } from '@nestjs/common';
import { ApiKeyModule } from '../api-key/api-key.module';
import { OembedController } from './oembed.controller';
import { OembedService } from './oembed.service';
import { ProviderFactory } from './providers';

@Module({
  imports: [ApiKeyModule],
  controllers: [OembedController],
  providers: [OembedService, ProviderFactory],
  exports: [OembedService],
})
export class OembedModule {}
