import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CreditModule } from '../credit';
import { ActivityLogModule } from '../activity-log';

@Module({
  imports: [CreditModule, ActivityLogModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
