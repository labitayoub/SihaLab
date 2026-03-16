import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { SseController } from './sse.controller';
import { SseService } from './sse.service';

@Global()
@Module({
  imports: [ConfigModule, JwtModule.register({})],
  controllers: [SseController],
  providers: [SseService],
  exports: [SseService],
})
export class SseModule {}
