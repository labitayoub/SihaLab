import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalysesService } from './analyses.service';
import { AnalysesController } from './analyses.controller';
import { Analyse } from '../entities/analyse.entity';
import { MinioModule } from '../common/minio/minio.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Analyse]),
    MinioModule,
  ],
  controllers: [AnalysesController],
  providers: [AnalysesService],
})
export class AnalysesModule {}
