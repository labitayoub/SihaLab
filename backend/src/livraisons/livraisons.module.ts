import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LivraisonsService } from './livraisons.service';
import { LivraisonsController } from './livraisons.controller';
import { Livraison, LivraisonHistorique } from '../entities/livraison.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Livraison, LivraisonHistorique])],
  controllers: [LivraisonsController],
  providers: [LivraisonsService],
})
export class LivraisonsModule {}
