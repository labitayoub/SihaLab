import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import * as QRCode from 'qrcode';

@Injectable()
export class PdfGeneratorService {

  // ═══════════════════════════════════════
  // CADUCEUS watermark (medical symbol)
  // Uses lineBreak:false + saves/restores doc.y
  // so the huge fontSize(200) never triggers a new page
  // ═══════════════════════════════════════
  private drawCaduceusWatermark(doc: InstanceType<typeof PDFDocument>) {
    const pageW = doc.page.width;
    const cy = doc.page.height / 2 - 80;
    const cx = pageW / 2 - 60;

    const savedY = doc.y;
    doc.save();
    doc.opacity(0.03);
    doc.fontSize(200).font('Helvetica-Bold');
    doc.text('⚕', cx, cy, { width: 120, align: 'center', lineBreak: false });
    doc.restore();
    doc.y = savedY;
  }

  // ═══════════════════════════════════════
  // HEADER — all text uses lineBreak:false
  // to prevent any automatic page creation
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

    // Top accent bar
    doc.rect(0, 0, pageW, 10).fill('#1565c0');

    // Doctor name
    doc.font('Helvetica-Bold').fontSize(22).fillColor('#1565c0');
    doc.text(`Dr ${doctor.firstName} ${doctor.lastName}`, marginL, 25, { lineBreak: false });

    let infoY = 52;
    if (doctor.specialite) {
      doc.font('Helvetica').fontSize(11).fillColor('#555');
      doc.text(doctor.specialite, marginL, infoY, { lineBreak: false });
      infoY += 16;
    }

    if (doctor.phone || doctor.address) {
      const parts = [doctor.phone, doctor.address].filter(Boolean).join('  •  ');
      doc.font('Helvetica').fontSize(9).fillColor('#777');
      doc.text(parts, marginL, infoY, { lineBreak: false });
    }

    // Info box — top right
    doc.roundedRect(marginR - 180, 25, 180, 50, 4).lineWidth(1).strokeColor('#e3f2fd').stroke();
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#333');
    doc.text('DATE', marginR - 170, 33, { lineBreak: false });
    doc.font('Helvetica').fontSize(10).fillColor('#666');
    doc.text(date, marginR - 170, 47, { lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#333');
    doc.text('N°', marginR - 60, 33, { lineBreak: false });
    doc.font('Helvetica').fontSize(10).fillColor('#666');
    doc.text(numero.replace('ORD-', '').replace('AN-', ''), marginR - 60, 47, { lineBreak: false });

    // Separator
    doc.moveTo(marginL, 90).lineTo(marginR, 90)
      .strokeColor('#e3f2fd').lineWidth(2).stroke();

    // Patient info box
    doc.rect(marginL, 100, pageW - 100, 28).fillColor('#f5f9ff').fill();
    doc.font('Helvetica').fontSize(11).fillColor('#333');
    doc.text('Patient(e) : ', marginL + 15, 108, { lineBreak: false, continued: true });
    doc.font('Helvetica-Bold').fillColor('#1565c0');
    doc.text(`${patient.lastName.toUpperCase()} ${patient.firstName}`, { lineBreak: false });

    // Title
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#1565c0');
    doc.text(title, 0, 140, { align: 'center', width: pageW, lineBreak: false });

    // Title underline
    const lineX = pageW / 2 - 30;
    doc.moveTo(lineX, 162).lineTo(lineX + 60, 162)
      .strokeColor('#1565c0').lineWidth(2).stroke();

    // Set cursor for content below header
    doc.y = 180;
  }

  // ═══════════════════════════════════════
  // FOOTER — drawn on each buffered page
  // Every doc.text() uses lineBreak:false
  // to guarantee no extra page is ever created
  // ═══════════════════════════════════════
  private async drawFooter(
    doc: InstanceType<typeof PDFDocument>,
    qrData: string,
    signatureLabel: string,
  ) {
    const pages = doc.bufferedPageRange();
    const qrImage = await QRCode.toBuffer(qrData, { width: 70, margin: 0 });
    const pH = doc.page.height;
    const pW = doc.page.width;

    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);

      // Footer line
      doc.moveTo(50, pH - 70).lineTo(pW - 50, pH - 70)
        .strokeColor('#e3f2fd').lineWidth(1).stroke();

      // QR code bottom-left
      doc.image(qrImage, 50, pH - 60, { width: 40 });
      doc.font('Helvetica').fontSize(6).fillColor('#999');
      doc.text('Code vérification', 40, pH - 16, { width: 60, align: 'center', lineBreak: false });

      // Signature placeholder
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#333');
      doc.text(signatureLabel, pW - 220, pH - 60, { lineBreak: false });

      // Paging
      doc.font('Helvetica').fontSize(7).fillColor('#aaa');
      doc.text(`Page ${i + 1}/${pages.count}`, 0, pH - 28, { align: 'center', width: pW, lineBreak: false });
      doc.text('Document généré par SihatiLab', 0, pH - 18, { align: 'center', width: pW, lineBreak: false });

      // Bottom accent bar
      doc.rect(0, pH - 5, pW, 5).fill('#1565c0');
    }
  }

  // ═══════════════════════════════════════
  // GENERATE SINGLE ORDONNANCE PDF
  // ═══════════════════════════════════════
  async generateOrdonnancePdf(
    ordonnances: Array<{
      id: string;
      medicaments: Array<{ nom: string; dosage: string; frequence: string; duree: string }>;
      status: string;
    }>,
    consultation: {
      id: string;
      date: Date;
      doctor: { firstName: string; lastName: string; specialite?: string; phone?: string; address?: string };
      patient: { firstName: string; lastName: string };
    },
  ): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true, autoFirstPage: false });
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        doc.addPage();
        this.drawCaduceusWatermark(doc);

        const dateStr = new Date(consultation.date).toLocaleDateString('fr-FR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
        });

        this.drawHeader(
          doc,
          consultation.doctor,
          'ORDONNANCE MÉDICALE',
          `ORD-${consultation.id.substring(0, 8).toUpperCase()}`,
          dateStr,
          consultation.patient,
        );

        const marginL = 50;

        // Collect all medicaments
        const allMedicaments: Array<{ nom: string; dosage: string; frequence: string; duree: string }> = [];
        for (const ord of ordonnances) {
          if (ord.medicaments && Array.isArray(ord.medicaments)) {
            allMedicaments.push(...ord.medicaments);
          }
        }

        // Draw each medicament
        for (const med of allMedicaments) {
          // Only create a new page if truly close to footer zone
          if (doc.y > doc.page.height - 120) {
            doc.addPage();
            this.drawCaduceusWatermark(doc);
            doc.y = 50;
          }

          const y = doc.y;
          doc.circle(marginL + 5, y + 5, 3).fill('#1565c0');

          doc.font('Helvetica-Bold').fontSize(12).fillColor('#333');
          doc.text(`${med.nom || 'Médicament'} ${med.dosage || ''}`, marginL + 20, y, { lineBreak: false });

          const posList: string[] = [];
          if (med.frequence) posList.push(med.frequence);
          if (med.duree) posList.push(`pendant ${med.duree}`);

          if (posList.length > 0) {
            doc.font('Helvetica').fontSize(10).fillColor('#666');
            doc.text(posList.join(' — '), marginL + 20, y + 16, { lineBreak: false });
            doc.y = y + 34;
          } else {
            doc.y = y + 22;
          }
        }

        // Footer + QR
        const qrData = JSON.stringify({
          type: 'ordonnance',
          id: consultation.id,
          date: dateStr,
          dr: consultation.doctor.lastName,
          pat: consultation.patient.lastName,
          meds: allMedicaments.length,
        });
        await this.drawFooter(doc, qrData, 'Signature et Cachet :');

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  // ═══════════════════════════════════════
  // GENERATE SINGLE ANALYSE PDF
  // ═══════════════════════════════════════
  async generateAnalysePdf(
    analyses: Array<{
      id: string;
      description: string;
      status: string;
      resultat?: string;
    }>,
    consultation: {
      id: string;
      date: Date;
      doctor: { firstName: string; lastName: string; specialite?: string; phone?: string; address?: string };
      patient: { firstName: string; lastName: string };
    },
  ): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true, autoFirstPage: false });
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        doc.addPage();
        this.drawCaduceusWatermark(doc);

        const dateStr = new Date(consultation.date).toLocaleDateString('fr-FR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
        });

        this.drawHeader(
          doc,
          consultation.doctor,
          'DEMANDE D\'ANALYSES',
          `AN-${consultation.id.substring(0, 8).toUpperCase()}`,
          dateStr,
          consultation.patient,
        );

        const marginL = 50;

        for (let i = 0; i < analyses.length; i++) {
          const analyse = analyses[i];

          if (doc.y > doc.page.height - 120) {
            doc.addPage();
            this.drawCaduceusWatermark(doc);
            doc.y = 50;
          }

          const y = doc.y;

          // Background stripe
          doc.rect(marginL, y, doc.page.width - 100, 22).fillColor('#f8f9fa').fill();
          doc.circle(marginL + 12, y + 11, 3).fill('#1565c0');
          doc.font('Helvetica-Bold').fontSize(11).fillColor('#333');
          doc.text(`${analyse.description}`, marginL + 25, y + 5, { lineBreak: false });

          let curY = y + 28;

          // Status
          const statusLabel = analyse.status === 'terminee' ? 'Terminée' : analyse.status === 'en_cours' ? 'En cours' : 'En attente';
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#666');
          doc.text('Statut : ', marginL + 25, curY, { continued: true, lineBreak: false });
          doc.font('Helvetica').fillColor('#888');
          doc.text(statusLabel, { lineBreak: false });
          curY += 14;

          // Result
          if (analyse.resultat) {
            doc.font('Helvetica-Bold').fontSize(9).fillColor('#666');
            doc.text('Résultat : ', marginL + 25, curY, { continued: true, lineBreak: false });
            doc.font('Helvetica').fillColor('#333');
            doc.text(analyse.resultat, { lineBreak: false });
            curY += 14;
          }

          doc.y = curY + 8;
        }

        // Footer + QR
        const qrData = JSON.stringify({
          type: 'analyses',
          id: consultation.id,
          date: dateStr,
          dr: consultation.doctor.lastName,
          pat: consultation.patient.lastName,
          count: analyses.length,
        });
        await this.drawFooter(doc, qrData, 'Signature et Cachet du Médecin :');

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
