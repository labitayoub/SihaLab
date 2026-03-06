import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Analyse } from '../entities/analyse.entity';
import { CreateAnalyseDto } from './dto/create-analyse.dto';
import { AnalyseStatus } from '../common/enums/status.enum';

@Injectable()
export class AnalysesService {
  constructor(
    @InjectRepository(Analyse)
    private analyseRepository: Repository<Analyse>,
  ) {}

  async create(createAnalyseDto: CreateAnalyseDto) {
    const analyse = this.analyseRepository.create(createAnalyseDto);
    return this.analyseRepository.save(analyse);
  }

  async findAll(status?: AnalyseStatus, labId?: string) {
    const query = this.analyseRepository.createQueryBuilder('analyse')
      .leftJoinAndSelect('analyse.consultation', 'consultation')
      .leftJoinAndSelect('consultation.patient', 'patient')
      .leftJoinAndSelect('consultation.doctor', 'doctor');

    if (status) {
      query.andWhere('analyse.status = :status', { status });
    }

    if (labId) {
      query.andWhere('analyse.labId = :labId', { labId });
    }

    return query.orderBy('analyse.createdAt', 'DESC').getMany();
  }

  async findOne(id: string) {
    const analyse = await this.analyseRepository.findOne({
      where: { id },
      relations: ['consultation', 'consultation.patient', 'consultation.doctor', 'laboratoire'],
    });
    if (!analyse) {
      throw new NotFoundException('Analyse not found');
    }
    return analyse;
  }

  async updateStatus(id: string, status: AnalyseStatus, labId?: string) {
    const analyse = await this.findOne(id);
    analyse.status = status;
    if (labId) {
      analyse.labId = labId;
    }
    return this.analyseRepository.save(analyse);
  }

  async uploadResultat(id: string, resultat: string, fileUrl: string) {
    const analyse = await this.findOne(id);
    analyse.resultat = resultat;
    analyse.resultatFileUrl = fileUrl;
    analyse.status = AnalyseStatus.TERMINEE;
    analyse.dateResultat = new Date();
    return this.analyseRepository.save(analyse);
  }

  async getByPatient(patientId: string) {
    return this.analyseRepository.createQueryBuilder('analyse')
      .leftJoinAndSelect('analyse.consultation', 'consultation')
      .leftJoinAndSelect('consultation.doctor', 'doctor')
      .where('consultation.patientId = :patientId', { patientId })
      .orderBy('analyse.createdAt', 'DESC')
      .getMany();
  }
}
