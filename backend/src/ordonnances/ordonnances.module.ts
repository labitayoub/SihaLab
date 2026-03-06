import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdonnancesService } from './ordonnances.service';
import { OrdonnancesController } from './ordonnances.controller';
import { Ordonnance } from '../entities/ordonnance.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ordonnance])],
  controllers: [OrdonnancesController],
  providers: [OrdonnancesService],
})
export class OrdonnancesModule {}
