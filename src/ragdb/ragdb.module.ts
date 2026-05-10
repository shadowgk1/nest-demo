import { Module } from '@nestjs/common';
import { RagdbController } from './ragdb.controller';
import { RagdbService } from './ragdb.service';

@Module({
  controllers: [RagdbController],
  providers: [RagdbService]
})
export class RagdbModule {}
