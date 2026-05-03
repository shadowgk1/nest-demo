import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { PostModule } from './post/post.module';
import { ConfigModule } from '@nestjs/config';
import { ModelsModule } from './models/models.module';
import { PromptsModule } from './prompts/prompts.module';
import { ChainsModule } from './chains/chains.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }),UserModule, PrismaModule, PostModule, ModelsModule, PromptsModule, ChainsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
