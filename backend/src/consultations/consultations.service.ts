import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consultation } from '../entities/consultation.entity';
import { Ordonnance } from '../entities/ordonnance.entity';
import { Analyse } from '../entities/analyse.entity';
import { Document, DocumentType } from '../entities/document.entity';
import { Appointment } from '../entities/appointment.entity';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { AppointmentStatus, ConsultationStatus } from '../common/enums/status.enum';
import { PdfGeneratorService } from './pdf-generator.service';
import { MinioService } from '../common/minio/minio.service';

@Injectable()
export class ConsultationsService {
  constructor(
    @InjectRepository(Consultation)
    private consultationRepository: Repository<Consultation>,
    @InjectRepository(Ordonnance)
    private ordonnanceRepository: Repository<Ordonnance>,
    @InjectRepository(Analyse)
    private analyseRepository: Repository<Analyse>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>,
    private pdfGeneratorService: PdfGeneratorService,
    private minioService: MinioService,
  ) {}

  async create(doctorId: string, createConsultationDto: CreateConsultationDto) {
    const consultation = this.consultationRepository.create({
      ...createConsultationDto,
      doctorId,
      date: new Date(),
    });
    const saved = await this.consultationRepository.save(consultation);

    // If linked to an appointment, mark it as CONFIRMÉ (in progress)
    if (createConsultationDto.appointmentId) {
      await this.appointmentRepository.update(
        { id: createConsultationDto.appointmentId },
        { status: AppointmentStatus.CONFIRME },
      );
    }

    return saved;
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
    const consultation = await this.consultationRepository
      .createQueryBuilder('consultation')
      .leftJoinAndSelect('consultation.patient', 'patient')
      .leftJoinAndSelect('consultation.doctor', 'doctor')
      .leftJoinAndSelect('consultation.ordonnances', 'ordonnances')
      .leftJoinAndSelect('consultation.analyses', 'analyses')
      .where('consultation.id = :id', { id })
      .getOne();
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

  async cancelConsultation(id: string) {
    const consultation = await this.consultationRepository
      .createQueryBuilder('consultation')
      .leftJoinAndSelect('consultation.ordonnances', 'ordonnances')
      .leftJoinAndSelect('consultation.analyses', 'analyses')
      .where('consultation.id = :id', { id })
      .getOne();

    if (!consultation) throw new NotFoundException('Consultation not found');
    if (consultation.status === ConsultationStatus.TERMINEE) {
      throw new BadRequestException(
        'Impossible d\'annuler une consultation déjà terminée.',
      );
    }

    // Free the linked appointment back to EN_ATTENTE (not cancelled)
    if (consultation.appointmentId) {
      await this.appointmentRepository.update(
        { id: consultation.appointmentId },
        { status: AppointmentStatus.EN_ATTENTE },
      );
    }

    // Delete ordonnances and analyses linked to this consultation
    if (consultation.ordonnances?.length > 0) {
      await this.ordonnanceRepository.delete(
        consultation.ordonnances.map((o) => o.id)
      );
    }
    if (consultation.analyses?.length > 0) {
      await this.analyseRepository.delete(
        consultation.analyses.map((a) => a.id)
      );
    }

    // Delete the consultation itself
    await this.consultationRepository.delete(id);

    return { message: 'Consultation supprimée — Rendez-vous libéré et remis en attente' };
  }

  /**
   * Récupérer les patients uniques d'un médecin (via ses consultations et appointments)
   */
  async getMyPatients(doctorId: string) {
    const consultations = await this.consultationRepository.find({
      where: { doctorId },
      relations: ['patient'],
      order: { date: 'DESC' },
    });

    // Dédupliquer par patientId
    const patientMap = new Map<string, any>();
    for (const c of consultations) {
      if (c.patient && !patientMap.has(c.patientId)) {
        const { password, ...patient } = c.patient as any;
        patientMap.set(c.patientId, patient);
      }
    }
    return Array.from(patientMap.values());
  }

  /**
   * Récupérer les consultations d'un médecin avec ordonnances et analyses liées
   */
  async findAllWithDetails(doctorId?: string, patientId?: string) {
    const query = this.consultationRepository
      .createQueryBuilder('consultation')
      .leftJoinAndSelect('consultation.patient', 'patient')
      .leftJoinAndSelect('consultation.doctor', 'doctor')
      .leftJoinAndSelect('consultation.ordonnances', 'ordonnances')
      .leftJoinAndSelect('consultation.analyses', 'analyses');

    if (doctorId) {
      query.andWhere('consultation.doctorId = :doctorId', { doctorId });
    }
    if (patientId) {
      query.andWhere('consultation.patientId = :patientId', { patientId });
    }

    return query.orderBy('consultation.date', 'DESC').getMany();
  }

  /**
   * Dossier Médical complet d'un patient :
   * - Toutes les consultations avec le médecin
   * - Les ordonnances liées à chaque consultation
   * - Les analyses liées à chaque consultation
   * - Tous les documents du patient
   */
  async getDossierMedical(patientId: string) {
    // 1. Consultations avec ordonnances et analyses imbriquées
    const consultations = await this.consultationRepository.find({
      where: { patientId },
      relations: ['doctor', 'appointment', 'ordonnances', 'analyses', 'analyses.laboratoire'],
      order: { date: 'DESC' },
    });

    // 2. Toutes les ordonnances du patient (via les consultations)
    const allOrdonnances = await this.ordonnanceRepository
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.consultation', 'c')
      .leftJoinAndSelect('c.doctor', 'doctor')
      .leftJoinAndSelect('o.pharmacien', 'pharmacien')
      .where('c.patientId = :patientId', { patientId })
      .orderBy('o.createdAt', 'DESC')
      .getMany();

    // 3. Toutes les analyses du patient (via les consultations)
    const allAnalyses = await this.analyseRepository
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.consultation', 'c')
      .leftJoinAndSelect('c.doctor', 'doctor')
      .leftJoinAndSelect('a.laboratoire', 'lab')
      .where('c.patientId = :patientId', { patientId })
      .orderBy('a.createdAt', 'DESC')
      .getMany();

    // 4. Tous les documents du patient
    const documents = await this.documentRepository.find({
      where: { patientId },
      relations: ['uploader'],
      order: { createdAt: 'DESC' },
    });

    // 5. Statistiques
    const stats = {
      totalConsultations: consultations.length,
      totalOrdonnances: allOrdonnances.length,
      totalAnalyses: allAnalyses.length,
      totalDocuments: documents.length,
      ordonnancesEnAttente: allOrdonnances.filter((o) => o.status === 'en_attente').length,
      analysesEnAttente: allAnalyses.filter((a) => a.status === 'en_attente').length,
      analysesTerminees: allAnalyses.filter((a) => a.status === 'terminee').length,
      derniereConsultation: consultations.length > 0 ? consultations[0].date : null,
    };

    return {
      patientId,
      stats,
      consultations,
      ordonnances: allOrdonnances,
      analyses: allAnalyses,
      documents,
    };
  }

  /**
   * Générer les PDFs pour les ordonnances et analyses d'une consultation
   * - Nommage : PatientNom_PatientPrenom_Type_Date.pdf
   * - Upload vers MinIO
   * - Sauvegarde des URLs sur la consultation (ordonnancePdfUrl / analysePdfUrl)
   * - Sauvegarde dans la table documents
   */
  async generatePdfs(consultationId: string, doctorId: string) {
    const consultation = await this.consultationRepository
      .createQueryBuilder('consultation')
      .leftJoinAndSelect('consultation.patient', 'patient')
      .leftJoinAndSelect('consultation.doctor', 'doctor')
      .leftJoinAndSelect('consultation.ordonnances', 'ordonnances')
      .leftJoinAndSelect('consultation.analyses', 'analyses')
      .where('consultation.id = :consultationId', { consultationId })
      .getOne();

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    if (consultation.status === ConsultationStatus.TERMINEE) {
      throw new BadRequestException('Cette consultation est déjà terminée. Impossible de regénérer les PDFs.');
    }

    const results: { ordonnanceUrl?: string; analyseUrl?: string; ordonnanceFileName?: string; analyseFileName?: string } = {};
    const dateISO = new Date(consultation.date).toISOString().split('T')[0]; // 2026-03-08
    const dateFr = new Date(consultation.date).toLocaleDateString('fr-FR');
    const patientLast = consultation.patient?.lastName || 'Patient';
    const patientFirst = consultation.patient?.firstName || '';

    // ── Generate ONE ordonnance PDF ──
    if (consultation.ordonnances.length > 0) {
      const pdfBuffer = await this.pdfGeneratorService.generateOrdonnancePdf(
        consultation.ordonnances, consultation,
      );

      const fileName = PdfGeneratorService.buildFileName(patientLast, patientFirst, 'Ordonnance', dateISO);
      const objectName = `consultations/${consultationId}/${fileName}`;
      const fileUrl = await this.minioService.uploadFile(objectName, pdfBuffer, 'application/pdf');

      // Update all ordonnances pdfUrl
      for (const ord of consultation.ordonnances) {
        await this.ordonnanceRepository.update(ord.id, { pdfUrl: fileUrl });
      }

      // Save URL on consultation itself
      await this.consultationRepository.update(consultationId, { ordonnancePdfUrl: fileUrl });

      // Create document record
      await this.documentRepository.save(this.documentRepository.create({
        patientId: consultation.patientId,
        uploadedBy: doctorId,
        type: DocumentType.ORDONNANCE,
        fileName,
        fileUrl,
        mimeType: 'application/pdf',
        fileSize: pdfBuffer.length,
        description: `Ordonnance — ${patientLast} ${patientFirst} — ${dateFr}`,
      }));

      results.ordonnanceUrl = fileUrl;
      results.ordonnanceFileName = fileName;
    }

    // ── Generate ONE analyse PDF ──
    if (consultation.analyses.length > 0) {
      const pdfBuffer = await this.pdfGeneratorService.generateAnalysePdf(
        consultation.analyses, consultation,
      );

      const fileName = PdfGeneratorService.buildFileName(patientLast, patientFirst, 'Analyses', dateISO);
      const objectName = `consultations/${consultationId}/${fileName}`;
      const fileUrl = await this.minioService.uploadFile(objectName, pdfBuffer, 'application/pdf');

      // Save URL on consultation itself
      await this.consultationRepository.update(consultationId, { analysePdfUrl: fileUrl });

      // Create document record
      await this.documentRepository.save(this.documentRepository.create({
        patientId: consultation.patientId,
        uploadedBy: doctorId,
        type: DocumentType.ANALYSE,
        fileName,
        fileUrl,
        mimeType: 'application/pdf',
        fileSize: pdfBuffer.length,
        description: `Analyses — ${patientLast} ${patientFirst} — ${dateFr}`,
      }));

      results.analyseUrl = fileUrl;
      results.analyseFileName = fileName;
    }

    const count = (results.ordonnanceUrl ? 1 : 0) + (results.analyseUrl ? 1 : 0);

    // ── Mark consultation as TERMINÉE after PDF generation ──
    await this.consultationRepository.update(consultationId, {
      status: ConsultationStatus.TERMINEE,
    });

    // ── Mark linked appointment as TERMINÉ ──
    if (consultation.appointmentId) {
      await this.appointmentRepository.update(
        { id: consultation.appointmentId },
        { status: AppointmentStatus.TERMINE },
      );
    }

    return {
      message: `${count} PDF(s) générés — Consultation terminée`,
      ...results,
    };
  }
}
