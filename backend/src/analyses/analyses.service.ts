import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Analyse, AnalyseStatus } from '../entities/analyse.entity';
import { CreateAnalyseDto } from './dto/create-analyse.dto';
import { UpdateAnalyseResultsDto } from './dto/update-analyse-results.dto';
import { MinioService } from '../common/minio/minio.service';
import PDFDocument from 'pdfkit';

@Injectable()
export class AnalysesService {
  constructor(
    @InjectRepository(Analyse)
    private analyseRepository: Repository<Analyse>,
    private minioService: MinioService,
  ) {}

  async create(createAnalyseDto: CreateAnalyseDto) {
    const analyse = this.analyseRepository.create(createAnalyseDto);
    return this.analyseRepository.save(analyse);
  }

  async findAll(status?: AnalyseStatus, labId?: string, consultationId?: string) {
    const query = this.analyseRepository.createQueryBuilder('analyse')
      .leftJoinAndSelect('analyse.consultation', 'consultation')
      .leftJoinAndSelect('analyse.laboratoire', 'laboratoire')
      .leftJoinAndSelect('consultation.patient', 'patient')
      .leftJoinAndSelect('consultation.doctor', 'doctor');

    if (status) {
      query.andWhere('analyse.status = :status', { status });
    }

    if (labId) {
      query.andWhere('analyse.labId = :labId', { labId });
    }

    if (consultationId) {
      query.andWhere('analyse.consultationId = :consultationId', { consultationId });
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

  async updateStatus(id: string, status: AnalyseStatus, labId: string) {
    const analyse = await this.findOne(id);
    
    // Verify access control
    if (analyse.labId && analyse.labId !== labId) {
      throw new ForbiddenException('Vous n\'êtes pas autorisé à modifier cette analyse');
    }
    
    // Prevent modification of completed analyses
    if (analyse.status === AnalyseStatus.TERMINEE) {
      throw new BadRequestException('Impossible de modifier une analyse terminée');
    }
    
    analyse.status = status;
    return this.analyseRepository.save(analyse);
  }

  async startAnalysis(id: string, labId: string) {
    const analyse = await this.findOne(id);
    
    // Verify access control
    if (analyse.labId && analyse.labId !== labId) {
      throw new ForbiddenException('Vous n\'êtes pas autorisé à modifier cette analyse');
    }
    
    if (analyse.status !== AnalyseStatus.EN_ATTENTE) {
      throw new BadRequestException('Cette analyse a déjà été commencée');
    }
    
    analyse.status = AnalyseStatus.EN_COURS;
    return this.analyseRepository.save(analyse);
  }

  async submitResults(id: string, labId: string, updateDto: UpdateAnalyseResultsDto) {
    const analyse = await this.findOne(id);
    
    // Verify access control
    if (analyse.labId && analyse.labId !== labId) {
      throw new ForbiddenException('Vous n\'êtes pas autorisé à modifier cette analyse');
    }
    
    // Prevent modification of completed analyses
    if (analyse.status === AnalyseStatus.TERMINEE) {
      throw new BadRequestException('Impossible de modifier une analyse terminée');
    }
    
    // Validate that at least one result exists
    if (!updateDto.results || updateDto.results.length === 0) {
      throw new BadRequestException('Au moins un résultat de test est requis');
    }
    
    // Store results as JSON
    analyse.resultat = JSON.stringify(updateDto.results);
    analyse.status = AnalyseStatus.TERMINEE;
    analyse.dateResultat = new Date();
    
    // Convert DTO instances to plain objects for PDF generation
    const plainResults = updateDto.results.map(r => ({
      testName: r.testName,
      resultValue: r.resultValue,
      unit: r.unit,
      normalRange: r.normalRange,
      isAbnormal: r.isAbnormal,
    }));
    
    // Generate laboratory report PDF
    const pdfBuffer = await this.generateLabReportPdf(analyse, plainResults);
    
    // Upload to MinIO
    const fileName = `lab_report_${analyse.id}_${Date.now()}.pdf`;
    const objectName = `laboratory-reports/${fileName}`;
    const fileUrl = await this.minioService.uploadFile(objectName, pdfBuffer, 'application/pdf');
    
    analyse.resultatFileUrl = fileUrl;
    
    const saved = await this.analyseRepository.save(analyse);
    
    // TODO: Send notification to doctor
    
    return saved;
  }

  private async generateLabReportPdf(analyse: Analyse, results: any[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 50, 
        autoFirstPage: false,
        bufferPages: true
      });
      
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.addPage();
      
      // Override addPage to prevent automatic page breaks
      const originalAddPage = doc.addPage.bind(doc);
      doc.addPage = function() {
        console.warn('Attempted to add a new page - blocked!');
        return this;
      };

      // Watermark
      this.drawWatermark(doc);

      const dateStr = new Date(analyse.createdAt).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });

      const dateResultatStr = new Date(analyse.dateResultat).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });

      // Header with laboratory info
      let y = this.drawLabHeader(doc, {
        laboratory: analyse.laboratoire,
        patient: analyse.consultation?.patient,
        title: 'RÉSULTATS D\'ANALYSES MÉDICALES',
        numero: `AN-${analyse.id.substring(0, 8).toUpperCase()}`,
        date: dateResultatStr,
      });

      const maxY = doc.page.height - 120; // More space for results table

      // Laboratory assigned section - more compact
      if (analyse.laboratoire) {
        doc.font('Helvetica').fontSize(9).fillColor('#64748b');
        doc.text('Laboratoire Assigné', 50, y, { lineBreak: false });
        y += 14;
        
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a');
        doc.text(analyse.laboratoire.firstName + ' ' + analyse.laboratoire.lastName, 50, y, { lineBreak: false });
        y += 24;
      }

      // Doctor info - more compact with specialty on separate line
      if (analyse.consultation?.doctor) {
        doc.font('Helvetica').fontSize(9).fillColor('#64748b');
        doc.text('Médecin Prescripteur', 50, y, { lineBreak: false });
        y += 14;
        
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a');
        const doctorName = `Dr ${analyse.consultation.doctor.firstName} ${analyse.consultation.doctor.lastName}`;
        doc.text(doctorName, 50, y, { lineBreak: false });
        y += 14;
        
        // Specialty on separate line with horizontal space
        if ((analyse.consultation.doctor as any).specialite) {
          doc.font('Helvetica').fontSize(9).fillColor('#64748b');
          doc.text((analyse.consultation.doctor as any).specialite, 50, y, { lineBreak: false });
          y += 14;
        }
        y += 10;
      }

      // Dates with divider line above - more compact
      doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor('#e2e8f0').lineWidth(1).stroke();
      y += 12;
      
      doc.font('Helvetica').fontSize(9).fillColor('#64748b');
      doc.text(`Date de demande : ${dateStr}`, 50, y, { lineBreak: false });
      doc.text(`Date de résultat : ${dateResultatStr}`, doc.page.width - 250, y, { width: 200, align: 'right', lineBreak: false });
      y += 16;

      // Divider before results
      doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor('#e2e8f0').lineWidth(1).stroke();
      y += 20;

      // Results Section Header
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a');
      doc.text('RÉSULTAT CLINIQUE', 50, y, { characterSpacing: 1, lineBreak: false });
      y += 22;

      // Results table
      if (results && results.length > 0) {
        const tableStartY = y;
        const rowHeight = 28; // Reduced from 36 to fit more rows
        const headerHeight = 32; // Reduced from 40
        
        // Header row with better styling
        doc.roundedRect(50, y, doc.page.width - 100, headerHeight, 6)
           .fillAndStroke('#f1f5f9', '#cbd5e1');
        
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#475569');
        doc.text('Test', 60, y + 11, { width: 200, lineBreak: false });
        doc.text('Résultat', 270, y + 11, { width: 100, lineBreak: false });
        doc.text('Valeurs Normales', 380, y + 11, { width: 100, lineBreak: false });
        doc.text('Unité', 490, y + 11, { width: 60, lineBreak: false });
        
        y += headerHeight + 3;

        // Data rows with better spacing
        for (let index = 0; index < results.length; index++) {
          const result = results[index];
          
          if (y + rowHeight > maxY) break;
          
          // Alternating row background
          if (index % 2 === 0) {
            doc.roundedRect(50, y, doc.page.width - 100, rowHeight, 4).fill('#fafafa');
          }
          
          // Test name
          doc.font('Helvetica').fontSize(9).fillColor('#0f172a');
          doc.text(result.testName || '', 60, y + 9, { width: 200, lineBreak: false });
          
          // Result value (red if abnormal)
          const resultColor = result.isAbnormal ? '#dc2626' : '#0f172a';
          const resultFont = result.isAbnormal ? 'Helvetica-Bold' : 'Helvetica';
          doc.font(resultFont).fontSize(10).fillColor(resultColor);
          doc.text(result.resultValue || '', 270, y + 9, { width: 100, lineBreak: false });
          
          // Normal range
          doc.font('Helvetica').fontSize(8).fillColor('#64748b');
          doc.text(result.normalRange || '—', 380, y + 9, { width: 100, lineBreak: false });
          
          // Unit
          doc.font('Helvetica').fontSize(8).fillColor('#64748b');
          doc.text(result.unit || '', 490, y + 9, { width: 60, lineBreak: false });
          
          y += rowHeight;
        }
        
        // Table border
        doc.roundedRect(50, tableStartY, doc.page.width - 100, y - tableStartY, 6)
           .strokeColor('#cbd5e1').lineWidth(1.5).stroke();
      } else {
        // No results message
        doc.font('Helvetica').fontSize(10).fillColor('#64748b');
        doc.text('Aucun résultat disponible', 50, y, { lineBreak: false });
        y += 24;
      }

      // Footer
      this.drawLabFooter(doc, analyse.laboratoire);

      doc.end();
    });
  }

  private drawWatermark(doc: InstanceType<typeof PDFDocument>) {
    const y0 = doc.y;
    doc.save();

    const cx = doc.page.width / 2;
    const cy = doc.page.height / 2;

    doc.translate(cx - 150, cy - 130);
    doc.scale(3);

    doc.opacity(0.02);
    doc.lineWidth(2);
    doc.strokeColor('#0f172a');

    // Caduceus
    doc.path('M50 5 L50 95 M46 92 L50 98 L54 92 M35 25 C45 25 50 15 50 10 C50 15 55 25 65 25 C80 25 85 30 85 35 C85 45 70 45 60 40 C55 37 45 37 40 40 C30 45 15 45 15 35 C15 30 20 25 35 25 Z').stroke();
    doc.lineWidth(1.5);
    doc.path('M40 50 C30 50 30 40 40 40 C50 40 50 50 60 50 C70 50 70 60 60 60 C50 60 50 70 40 70 C30 70 30 80 40 80 M60 50 C70 50 70 40 60 40 C50 40 50 50 40 50 C30 50 30 60 40 60 C50 60 50 70 60 70 C70 70 70 80 60 80').stroke();
    doc.circle(50, 10, 2).fillAndStroke('#0f172a', '#0f172a');

    doc.restore();
    doc.y = y0;
  }

  private drawLabHeader(
    doc: InstanceType<typeof PDFDocument>,
    info: {
      laboratory: any;
      patient: any;
      title: string;
      numero: string;
      date: string;
    },
  ): number {
    const W = doc.page.width;
    const L = 50;
    const R = W - 50;

    let y = 80;

    // Laboratory details on left
    doc.font('Helvetica-Bold').fontSize(22).fillColor('#0f172a');
    doc.text(`${info.laboratory?.firstName || ''} ${info.laboratory?.lastName || 'Laboratoire'}`, L, y, { lineBreak: false });

    const specY = y + 28;
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#475569');
    doc.text('LABORATOIRE D\'ANALYSES MÉDICALES', L, specY, { lineBreak: false, characterSpacing: 0.5 });

    // Contact on Right
    let ry = y;
    doc.font('Helvetica').fontSize(10).fillColor('#475569');
    const contactWidth = 220;
    
    if (info.laboratory?.address) {
      doc.text(info.laboratory.address, R - contactWidth, ry, { width: contactWidth, align: 'left', lineBreak: false });
      ry += 14;
    }
    if (info.laboratory?.ville) {
      doc.text(info.laboratory.ville, R - contactWidth, ry, { width: contactWidth, align: 'left', lineBreak: false });
      ry += 14;
    }
    if (info.laboratory?.phone) {
      doc.text(`Tél : ${info.laboratory.phone}`, R - contactWidth, ry, { width: contactWidth, align: 'left', lineBreak: false });
      ry += 14;
    }

    y = Math.max(specY, ry) + 28;

    // Divider
    doc.moveTo(L, y).lineTo(R, y).strokeColor('#e2e8f0').lineWidth(1).stroke();
    y += 32;

    // Title
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#0f172a');
    doc.text(info.title.toUpperCase(), L, y, { width: W - 100, align: 'center', characterSpacing: 2, lineBreak: false });
    y += 28;

    // Meta Row
    doc.font('Helvetica').fontSize(11).fillColor('#475569');
    doc.text(`Référence : ${info.numero}`, L, y, { lineBreak: false });
    doc.text(`Date : ${info.date}`, R - 200, y, { width: 200, align: 'right', lineBreak: false });
    y += 26;

    // Patient Box
    doc.roundedRect(L, y, W - 100, 70, 6).fillAndStroke('#f8fafc', '#e2e8f0');

    doc.font('Helvetica').fontSize(10).fillColor('#64748b');
    doc.text('NOM COMPLET', L + 20, y + 16, { characterSpacing: 0.5, lineBreak: false });

    doc.font('Helvetica-Bold').fontSize(14).fillColor('#0f172a');
    doc.text(`${info.patient?.lastName?.toUpperCase() || ''} ${info.patient?.firstName || ''}`, L + 20, y + 36, { lineBreak: false });

    return y + 104;
  }

  private drawLabFooter(
    doc: InstanceType<typeof PDFDocument>,
    laboratory: any
  ) {
    const W = doc.page.width;
    const H = doc.page.height;

    // Divider line above signature
    const dividerY = H - 180;
    doc.moveTo(50, dividerY).lineTo(W - 50, dividerY).strokeColor('#e2e8f0').lineWidth(1).stroke();

    // Signature zone (without line under it)
    const sigY = H - 150;
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a');
    doc.text('Signature et Cachet du Biologiste', W - 250, sigY, { width: 200, align: 'center', lineBreak: false });

    // Divider line above footer info
    const footerDividerY = H - 80;
    doc.moveTo(50, footerDividerY).lineTo(W - 50, footerDividerY).strokeColor('#e2e8f0').lineWidth(1).stroke();

    // Footer info
    const footerY = H - 60;
    doc.font('Helvetica').fontSize(9).fillColor('#94a3b8');
    
    const footerText = laboratory?.address && laboratory?.ville 
      ? `${laboratory.address}, ${laboratory.ville}` 
      : 'Laboratoire d\'Analyses Médicales';
    
    doc.text(footerText, 50, footerY, { width: W - 100, align: 'center', lineBreak: false });
    
    if (laboratory?.phone) {
      doc.text(`Tél : ${laboratory.phone}`, 50, footerY + 14, { width: W - 100, align: 'center', lineBreak: false });
    }
  }

  async uploadResultat(id: string, resultat: string, fileUrl: string) {
    const analyse = await this.findOne(id);
    analyse.resultat = resultat;
    analyse.resultatFileUrl = fileUrl;
    analyse.status = AnalyseStatus.TERMINEE;
    analyse.dateResultat = new Date();
    return this.analyseRepository.save(analyse);
  }

  async uploadFiles(id: string, files: Express.Multer.File[], labId: string) {
    const analyse = await this.findOne(id);
    
    // Verify access control
    if (analyse.labId && analyse.labId !== labId) {
      throw new ForbiddenException('Vous n\'êtes pas autorisé à modifier cette analyse');
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    // Validate file types (PDF and images only)
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    for (const file of files) {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(`Type de fichier non autorisé: ${file.mimetype}. Seuls les PDF et images sont acceptés.`);
      }
    }

    // Upload files to MinIO
    const uploadedUrls: string[] = [];
    for (const file of files) {
      const fileName = `analyse_${analyse.id}_${Date.now()}_${file.originalname}`;
      const objectName = `analyses-uploads/${fileName}`;
      const fileUrl = await this.minioService.uploadFile(objectName, file.buffer, file.mimetype);
      uploadedUrls.push(fileUrl);
    }

    // Add to existing uploaded files or create new array
    const existingFiles = analyse.uploadedFiles || [];
    analyse.uploadedFiles = [...existingFiles, ...uploadedUrls];

    const saved = await this.analyseRepository.save(analyse);

    return {
      message: `${files.length} fichier(s) uploadé(s) avec succès`,
      uploadedFiles: uploadedUrls,
      totalFiles: analyse.uploadedFiles.length,
    };
  }

  async update(id: string, data: { description?: string; labId?: string }) {
    const analyse = await this.findOne(id);
    if (data.description !== undefined) analyse.description = data.description;
    if (data.labId !== undefined) analyse.labId = data.labId;
    return this.analyseRepository.save(analyse);
  }

  async remove(id: string) {
    const analyse = await this.findOne(id);
    return this.analyseRepository.remove(analyse);
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
