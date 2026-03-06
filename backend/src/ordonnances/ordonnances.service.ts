import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ordonnance } from '../entities/ordonnance.entity';
import { CreateOrdonnanceDto } from './dto/create-ordonnance.dto';
import { OrdonnanceStatus } from '../common/enums/status.enum';
import * as QRCode from 'qrcode';

@Injectable()
export class OrdonnancesService {
  constructor(
    @InjectRepository(Ordonnance)
    private ordonnanceRepository: Repository<Ordonnance>,
  ) {}

  async create(createOrdonnanceDto: CreateOrdonnanceDto) {
    const ordonnance = this.ordonnanceRepository.create(createOrdonnanceDto);
    const saved = await this.ordonnanceRepository.save(ordonnance);
    
    // Generate QR Code
    const qrCode = await QRCode.toDataURL(saved.id);
    saved.qrCode = qrCode;
    
    return this.ordonnanceRepository.save(saved);
  }

  async findAll(status?: OrdonnanceStatus, pharmacienId?: string) {
    const query = this.ordonnanceRepository.createQueryBuilder('ordonnance')
      .leftJoinAndSelect('ordonnance.consultation', 'consultation')
      .leftJoinAndSelect('consultation.patient', 'patient')
      .leftJoinAndSelect('consultation.doctor', 'doctor');

    if (status) {
      query.andWhere('ordonnance.status = :status', { status });
    }

    if (pharmacienId) {
      query.andWhere('ordonnance.pharmacienId = :pharmacienId', { pharmacienId });
    }

    return query.orderBy('ordonnance.createdAt', 'DESC').getMany();
  }

  async findOne(id: string) {
    const ordonnance = await this.ordonnanceRepository.findOne({
      where: { id },
      relations: ['consultation', 'consultation.patient', 'consultation.doctor', 'pharmacien'],
    });
    if (!ordonnance) {
      throw new NotFoundException('Ordonnance not found');
    }
    return ordonnance;
  }

  async delivrer(id: string, pharmacienId: string) {
    const ordonnance = await this.findOne(id);
    ordonnance.status = OrdonnanceStatus.DELIVREE;
    ordonnance.pharmacienId = pharmacienId;
    ordonnance.dateDelivrance = new Date();
    return this.ordonnanceRepository.save(ordonnance);
  }

  async getByPatient(patientId: string) {
    return this.ordonnanceRepository.createQueryBuilder('ordonnance')
      .leftJoinAndSelect('ordonnance.consultation', 'consultation')
      .leftJoinAndSelect('consultation.doctor', 'doctor')
      .where('consultation.patientId = :patientId', { patientId })
      .orderBy('ordonnance.createdAt', 'DESC')
      .getMany();
  }
}
