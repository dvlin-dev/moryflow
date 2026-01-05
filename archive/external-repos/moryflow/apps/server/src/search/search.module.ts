import { Module } from '@nestjs/common';
import { VectorizeModule } from '../vectorize';
import { AuthModule } from '../auth';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [VectorizeModule, AuthModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
