import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import * as QRCode from 'qrcode';

@Injectable()
export class PdfGeneratorService {

  // ═══════════════════════════════════════
  // CADUCEUS SVG PATH (medical symbol)
  // ═══════════════════════════════════════
  private drawCaduceusWatermark(doc: InstanceType<typeof PDFDocument>) {
    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const cx = pageW / 2 - 60;
    const cy = pageH / 2 - 80;

    doc.save();
    doc.opacity(0.04);
    doc.fontSize(160).font('Helvetica-Bold');
    doc.text('⚕', cx, cy, { width: 120, align: 'center' });
    doc.restore();
  }

  // ═══════════════════════════════════════
  // HEADER with doctor info
  // ═══════════════════════════════════════
  private drawHeader(
    doc: InstanceType<typeof PDFDocument>,
    doctor: { firstName: string; lastName: string; specialite?: string; phone?: string; address?: string },
    title: string,
    numero: string,
    date: string,
    patient: { firstName: string; lastName: string },
  ) {
    const pageW = doc.page.width;
    const marginL = 50;
    const marginR = pageW - 50;

    // Doctor name
    doc.font('Helvetica-Bold').fontSize(14)
      .text(`Dr ${doctor.firstName} ${doctor.lastName}`, marginL, 40, { align: 'center' });

    // Speciality
    if (doctor.specialite) {
      doc.font('Helvetica').fontSize(10)
        .text(doctor.specialite, marginL, doc.y + 2, { align: 'center' });
    }

    // Phone / address
    if (doctor.phone || doctor.address) {
      const parts = [doctor.phone, doctor.address].filter(Boolean).join(' — ');
      doc.font('Helvetica').fontSize(8)
        .text(parts, marginL, doc.y + 2, { align: 'center' });
    }

    // Separator
    doc.moveTo(marginL, doc.y + 10).lineTo(marginR, doc.y + 10)
      .strokeColor('#1976d2').lineWidth(1.5).stroke();

    // Date + Patient info on right side
    const yInfo = doc.y + 18;
    doc.font('Helvetica').fontSize(9).fillColor('#333');
    doc.text(`Date: ${date}`, marginR - 150, yInfo, { width: 150, align: 'right' });

    // Patient name on left
    doc.font('Helvetica').fontSize(10).fillColor('#333');
    doc.text(`Nom: ${patient.lastName}`, marginL, yInfo);
    doc.text(`Prénom: ${patient.firstName}`, marginL, doc.y + 2);

    // ── Title ──
    const yTitle = doc.y + 20;
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#1976d2');
    doc.text(title, marginL, yTitle, { align: 'center' });

    // Numero
    doc.font('Helvetica').fontSize(10).fillColor('#333');
    doc.text(`N° ${numero}`, marginL, doc.y + 4, { align: 'center' });

    // Separator
    doc.moveTo(marginL, doc.y + 10).lineTo(marginR, doc.y + 10)
      .strokeColor('#e0e0e0').lineWidth(0.5).stroke();

    doc.y += 20;
  }

  // ═══════════════════════════════════════
  // GENERATE ORDONNANCE PDF
  // ═══════════════════════════════════════
  async generateOrdonnancePdf(
    ordonnance: {
      id: string;
      medicaments: Array<{ nom: string; dosage: string; frequence: string; duree: string }>;
      status: string;
    },
    consultation: {
      id: string;
      date: Date;
      doctor: { firstName: string; lastName: string; specialite?: string; phone?: string; address?: string };
      patient: { firstName: string; lastName: string };
    },
    ordonnanceIndex: number,
  ): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Watermark
        this.drawCaduceusWatermark(doc);

        // Format date
        const dateStr = new Date(consultation.date).toLocaleDateString('fr-FR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
        });

        // Header
        this.drawHeader(
          doc,
          consultation.doctor,
          'ORDONNANCE',
          `ORD-${ordonnanceIndex.toString().padStart(3, '0')}`,
          dateStr,
          consultation.patient,
        );

        // Medicaments list
        const marginL = 50;
        let yPos = doc.y + 10;

        for (let i = 0; i < ordonnance.medicaments.length; i++) {
          const med = ordonnance.medicaments[i];
          doc.font('Helvetica-Bold').fontSize(11).fillColor('#333');
          doc.text(`${i + 1}.   ${med.nom} ${med.dosage}`, marginL + 10, yPos);
          yPos = doc.y + 3;

          doc.font('Helvetica').fontSize(9).fillColor('#666');
          doc.text(`     ${med.frequence} pendant ${med.duree}`, marginL + 20, yPos);
          yPos = doc.y + 12;
        }

        // QR Code at bottom-right
        const qrData = JSON.stringify({
          type: 'ordonnance',
          id: ordonnance.id,
          consultationId: consultation.id,
          date: dateStr,
          doctor: `Dr ${consultation.doctor.firstName} ${consultation.doctor.lastName}`,
          patient: `${consultation.patient.firstName} ${consultation.patient.lastName}`,
        });
        const qrImage = await QRCode.toBuffer(qrData, { width: 80, margin: 1 });
        doc.image(qrImage, doc.page.width - 130, doc.page.height - 130, { width: 80 });
        doc.font('Helvetica').fontSize(6).fillColor('#999');
        doc.text('Scanner pour vérifier', doc.page.width - 140, doc.page.height - 45, { width: 100, align: 'center' });

        // Footer line
        doc.moveTo(50, doc.page.height - 60)
          .lineTo(doc.page.width - 50, doc.page.height - 60)
          .strokeColor('#1976d2').lineWidth(0.5).stroke();

        doc.font('Helvetica').fontSize(7).fillColor('#999');
        doc.text('Document généré par SihatiLab — Plateforme Médicale',
          50, doc.page.height - 50, { align: 'center', width: doc.page.width - 100 });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  // ═══════════════════════════════════════
  // GENERATE ANALYSE PDF
  // ═══════════════════════════════════════
  async generateAnalysePdf(
    analyse: {
      id: string;
      description: string;
      status: string;
      resultat?: string;
    },
    consultation: {
      id: string;
      date: Date;
      doctor: { firstName: string; lastName: string; specialite?: string; phone?: string; address?: string };
      patient: { firstName: string; lastName: string };
    },
    analyseIndex: number,
  ): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Watermark
        this.drawCaduceusWatermark(doc);

        // Format date
        const dateStr = new Date(consultation.date).toLocaleDateString('fr-FR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
        });

        // Header
        this.drawHeader(
          doc,
          consultation.doctor,
          'ANALYSE DE LABORATOIRE',
          `AN-${analyseIndex.toString().padStart(3, '0')}`,
          dateStr,
          consultation.patient,
        );

        const marginL = 50;
        let yPos = doc.y + 10;

        // Description
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#333');
        doc.text('Description de l\'analyse:', marginL, yPos);
        yPos = doc.y + 6;
        doc.font('Helvetica').fontSize(10).fillColor('#555');
        doc.text(analyse.description, marginL + 10, yPos, { width: 450 });
        yPos = doc.y + 20;

        // Status
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#333');
        doc.text(`Statut: ${analyse.status === 'terminee' ? 'Terminée' : analyse.status === 'en_cours' ? 'En cours' : 'En attente'}`, marginL, yPos);
        yPos = doc.y + 15;

        // Resultat if exists
        if (analyse.resultat) {
          doc.font('Helvetica-Bold').fontSize(11).fillColor('#333');
          doc.text('Résultat:', marginL, yPos);
          yPos = doc.y + 6;
          doc.font('Helvetica').fontSize(10).fillColor('#555');
          doc.text(analyse.resultat, marginL + 10, yPos, { width: 450 });
        }

        // QR Code at bottom-right
        const qrData = JSON.stringify({
          type: 'analyse',
          id: analyse.id,
          consultationId: consultation.id,
          date: dateStr,
          doctor: `Dr ${consultation.doctor.firstName} ${consultation.doctor.lastName}`,
          patient: `${consultation.patient.firstName} ${consultation.patient.lastName}`,
          description: analyse.description,
        });
        const qrImage = await QRCode.toBuffer(qrData, { width: 80, margin: 1 });
        doc.image(qrImage, doc.page.width - 130, doc.page.height - 130, { width: 80 });
        doc.font('Helvetica').fontSize(6).fillColor('#999');
        doc.text('Scanner pour vérifier', doc.page.width - 140, doc.page.height - 45, { width: 100, align: 'center' });

        // Footer
        doc.moveTo(50, doc.page.height - 60)
          .lineTo(doc.page.width - 50, doc.page.height - 60)
          .strokeColor('#1976d2').lineWidth(0.5).stroke();

        doc.font('Helvetica').fontSize(7).fillColor('#999');
        doc.text('Document généré par SihatiLab — Plateforme Médicale',
          50, doc.page.height - 50, { align: 'center', width: doc.page.width - 100 });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
