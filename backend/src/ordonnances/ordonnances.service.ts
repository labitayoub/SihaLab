import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ordonnance, OrdonnanceVerificationStatus } from '../entities/ordonnance.entity';
import { CreateOrdonnanceDto } from './dto/create-ordonnance.dto';
import { OrdonnanceStatus } from '../common/enums/status.enum';
import * as QRCode from 'qrcode';
import { randomBytes } from 'crypto';

export interface ConfirmPrescriptionPayload {
  servedBy: string;
  servedByPhone: string;
  pharmacyNote?: string;
}

export interface ValidatePrescriptionResult {
  state: 'AVAILABLE' | 'SERVED' | 'ALREADY_SERVED' | 'INVALID';
  message: string;
  servedAt?: string;
  ordonnance?: Ordonnance;
}

@Injectable()
export class OrdonnancesService {
  constructor(
    @InjectRepository(Ordonnance)
    private ordonnanceRepository: Repository<Ordonnance>,
  ) {}

  private getPublicVerifyBaseUrl(): string {
    const raw = process.env.PUBLIC_VERIFY_BASE_URL || 'http://localhost:5173';
    return raw.endsWith('/') ? raw.slice(0, -1) : raw;
  }

  private buildVerifyUrl(hash: string): string {
    return `${this.getPublicVerifyBaseUrl()}/verify/${hash}`;
  }

  private async generateUniqueVerificationHash(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = randomBytes(24).toString('hex');
      const exists = await this.ordonnanceRepository.exist({
        where: { verificationHash: candidate },
      });
      if (!exists) {
        return candidate;
      }
    }

    throw new Error('Unable to generate unique prescription verification hash');
  }

  async create(createOrdonnanceDto: CreateOrdonnanceDto) {
    const ordonnance = this.ordonnanceRepository.create(createOrdonnanceDto);
    ordonnance.verificationHash = await this.generateUniqueVerificationHash();
    const saved = await this.ordonnanceRepository.save(ordonnance);
    
    // Encode the full public verification URL in the QR payload.
    const verifyUrl = this.buildVerifyUrl(saved.verificationHash as string);
    const qrCode = await QRCode.toDataURL(verifyUrl);
    saved.qrCode = qrCode;
    
    return this.ordonnanceRepository.save(saved);
  }

  async findAll(status?: OrdonnanceStatus, pharmacienId?: string, consultationId?: string) {
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

    if (consultationId) {
      query.andWhere('ordonnance.consultationId = :consultationId', { consultationId });
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

  async update(id: string, data: { medicaments?: any[]; pharmacienId?: string }) {
    const ordonnance = await this.findOne(id);
    if (data.medicaments !== undefined) ordonnance.medicaments = data.medicaments;
    if (data.pharmacienId !== undefined) ordonnance.pharmacienId = data.pharmacienId;
    return this.ordonnanceRepository.save(ordonnance);
  }

  async remove(id: string) {
    const ordonnance = await this.findOne(id);
    return this.ordonnanceRepository.remove(ordonnance);
  }

  async getByPatient(patientId: string) {
    return this.ordonnanceRepository.createQueryBuilder('ordonnance')
      .leftJoinAndSelect('ordonnance.consultation', 'consultation')
      .leftJoinAndSelect('consultation.doctor', 'doctor')
      .where('consultation.patientId = :patientId', { patientId })
      .orderBy('ordonnance.createdAt', 'DESC')
      .getMany();
  }

  async validatePrescription(hash: string): Promise<ValidatePrescriptionResult> {
    const ordonnance = await this.ordonnanceRepository.findOne({
      where: { verificationHash: hash },
      relations: ['consultation', 'consultation.patient', 'consultation.doctor'],
    });

    if (!ordonnance) {
      return {
        state: 'INVALID',
        message: 'Document Non-Existant / Fraude Détectée',
      };
    }

    if (ordonnance.verificationStatus === OrdonnanceVerificationStatus.SERVED) {
      return {
        state: 'ALREADY_SERVED',
        message: 'ATTENTION: Cette ordonnance a déjà été consommée.',
        servedAt: ordonnance.servedAt?.toISOString(),
        ordonnance,
      };
    }

    return {
      state: 'AVAILABLE',
      message: 'Ordonnance valide et disponible pour délivrance.',
      ordonnance,
    };
  }

  async confirmPrescriptionServed(
    hash: string,
    payload: ConfirmPrescriptionPayload,
  ): Promise<ValidatePrescriptionResult> {
    const now = new Date();

    const updateResult = await this.ordonnanceRepository
      .createQueryBuilder()
      .update(Ordonnance)
      .set({
        verificationStatus: OrdonnanceVerificationStatus.SERVED,
        servedAt: now,
        servedBy: payload.servedBy,
        servedByPhone: payload.servedByPhone,
        pharmacyNote: payload.pharmacyNote ?? null,
        // Keep legacy business status in sync with the new verification lock.
        status: OrdonnanceStatus.DELIVREE,
        dateDelivrance: now,
      })
      .where('verificationHash = :hash', { hash })
      .andWhere('verificationStatus = :available', {
        available: OrdonnanceVerificationStatus.AVAILABLE,
      })
      .execute();

    const current = await this.ordonnanceRepository.findOne({
      where: { verificationHash: hash },
      relations: ['consultation', 'consultation.patient', 'consultation.doctor'],
    });

    if (!current) {
      return {
        state: 'INVALID',
        message: 'Document Non-Existant / Fraude Détectée',
      };
    }

    if (current.verificationStatus === OrdonnanceVerificationStatus.SERVED) {
      if ((updateResult.affected ?? 0) > 0) {
        return {
          state: 'SERVED',
          message: 'Délivrance confirmée avec succès.',
          servedAt: current.servedAt?.toISOString(),
          ordonnance: current,
        };
      }

      return {
        state: 'ALREADY_SERVED',
        message: 'ATTENTION: Cette ordonnance a déjà été consommée.',
        servedAt: current.servedAt?.toISOString(),
        ordonnance: current,
      };
    }

    return {
      state: 'INVALID',
      message: 'Document Non-Existant / Fraude Détectée',
    };
  }
}
