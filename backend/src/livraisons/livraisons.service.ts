import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Livraison, LivraisonHistorique } from '../entities/livraison.entity';
import { CreateLivraisonDto } from './dto/create-livraison.dto';
import { LivraisonStatus } from '../common/enums/status.enum';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LivraisonsService {
  constructor(
    @InjectRepository(Livraison)
    private livraisonRepository: Repository<Livraison>,
    @InjectRepository(LivraisonHistorique)
    private historiqueRepository: Repository<LivraisonHistorique>,
  ) {}

  async create(pharmacieId: string, patientId: string, createLivraisonDto: CreateLivraisonDto) {
    const codeSuivi = `LIV-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;
    
    const livraison = this.livraisonRepository.create({
      ...createLivraisonDto,
      pharmacieId,
      patientId,
      codeSuivi,
      fraisLivraison: createLivraisonDto.fraisLivraison || 20,
    });

    const saved = await this.livraisonRepository.save(livraison);
    
    await this.addHistorique(saved.id, LivraisonStatus.EN_PREPARATION, 'Livraison créée');
    
    return saved;
  }

  async findAll(status?: LivraisonStatus, pharmacieId?: string, patientId?: string) {
    const query = this.livraisonRepository.createQueryBuilder('livraison')
      .leftJoinAndSelect('livraison.ordonnance', 'ordonnance')
      .leftJoinAndSelect('livraison.patient', 'patient')
      .leftJoinAndSelect('livraison.pharmacie', 'pharmacie');

    if (status) {
      query.andWhere('livraison.statut = :status', { status });
    }

    if (pharmacieId) {
      query.andWhere('livraison.pharmacieId = :pharmacieId', { pharmacieId });
    }

    if (patientId) {
      query.andWhere('livraison.patientId = :patientId', { patientId });
    }

    return query.orderBy('livraison.createdAt', 'DESC').getMany();
  }

  async findOne(id: string) {
    const livraison = await this.livraisonRepository.findOne({
      where: { id },
      relations: ['ordonnance', 'patient', 'pharmacie'],
    });
    if (!livraison) {
      throw new NotFoundException('Livraison not found');
    }
    return livraison;
  }

  async findByCodeSuivi(codeSuivi: string) {
    const livraison = await this.livraisonRepository.findOne({
      where: { codeSuivi },
      relations: ['ordonnance', 'patient', 'pharmacie'],
    });
    if (!livraison) {
      throw new NotFoundException('Livraison not found');
    }

    const historique = await this.historiqueRepository.find({
      where: { livraisonId: livraison.id },
      order: { createdAt: 'ASC' },
    });

    return { ...livraison, historique };
  }

  async updateStatut(id: string, statut: LivraisonStatus, description?: string) {
    const livraison = await this.findOne(id);
    livraison.statut = statut;
    
    if (statut === LivraisonStatus.LIVREE) {
      livraison.dateLivraison = new Date();
    }

    await this.livraisonRepository.save(livraison);
    await this.addHistorique(id, statut, description);

    return livraison;
  }

  private async addHistorique(livraisonId: string, statut: LivraisonStatus, description?: string) {
    const historique = this.historiqueRepository.create({
      livraisonId,
      statut,
      description,
    });
    return this.historiqueRepository.save(historique);
  }
}
