import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalysesService } from './analyses.service';
import { AnalysesController } from './analyses.controller';
import { Analyse } from '../entities/analyse.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Analyse])],
  controllers: [AnalysesController],
  providers: [AnalysesService],
})
export class AnalysesModule {}
