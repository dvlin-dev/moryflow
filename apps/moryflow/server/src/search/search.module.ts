import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { MemoxModule } from '../memox';
import { SearchBackendService } from './search-backend.service';
import { SearchController } from './search.controller';
import { SearchLiveFileProjectorService } from './search-live-file-projector.service';
import { SearchService } from './search.service';

@Module({
  imports: [MemoxModule, AuthModule],
  controllers: [SearchController],
  providers: [
    SearchService,
    SearchBackendService,
    SearchLiveFileProjectorService,
  ],
  exports: [SearchService],
})
export class SearchModule {}
