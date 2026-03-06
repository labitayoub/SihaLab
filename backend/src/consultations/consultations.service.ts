import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consultation } from '../entities/consultation.entity';
import { CreateConsultationDto } from './dto/create-consultation.dto';

@Injectable()
export class ConsultationsService {
  constructor(
    @InjectRepository(Consultation)
    private consultationRepository: Repository<Consultation>,
  ) {}

  async create(doctorId: string, createConsultationDto: CreateConsultationDto) {
    const consultation = this.consultationRepository.create({
      ...createConsultationDto,
      doctorId,
      date: new Date(),
    });
    return this.consultationRepository.save(consultation);
  }

  async findAll(patientId?: string, doctorId?: string) {
    const query = this.consultationRepository.createQueryBuilder('consultation')
      .leftJoinAndSelect('consultation.patient', 'patient')
      .leftJoinAndSelect('consultation.doctor', 'doctor');

    if (patientId) {
      query.andWhere('consultation.patientId = :patientId', { patientId });
    }

    if (doctorId) {
      query.andWhere('consultation.doctorId = :doctorId', { doctorId });
    }

    return query.orderBy('consultation.date', 'DESC').getMany();
  }

  async findOne(id: string) {
    const consultation = await this.consultationRepository.findOne({
      where: { id },
      relations: ['patient', 'doctor'],
    });
    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }
    return consultation;
  }

  async getPatientHistory(patientId: string) {
    return this.consultationRepository.find({
      where: { patientId },
      relations: ['doctor'],
      order: { date: 'DESC' },
    });
  }

  async update(id: string, updateData: Partial<CreateConsultationDto>) {
    const consultation = await this.findOne(id);
    Object.assign(consultation, updateData);
    return this.consultationRepository.save(consultation);
  }
}
