import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import * as QRCode from 'qrcode';
import { PassThrough } from 'stream';

/**
 * PDF Generator — STRICTLY 1 PAGE.
 *
 * How we guarantee no extra pages:
 * 1. autoFirstPage: false → we manually addPage() once
 * 2. Every doc.text() uses lineBreak: false
 * 3. We NEVER use continued: true (it can silently advance y)
 * 4. We track y manually with a local variable, never read doc.y after text()
 * 5. We save/restore doc.y around watermark
 * 6. QR image is placed at absolute coordinates
 * 7. We collect chunks via PassThrough to avoid any bufferedPages weirdness
 */
@Injectable()
export class PdfGeneratorService {

  /** Collect PDF stream into a single Buffer */
  private collectBuffer(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = new PassThrough();
      doc.pipe(stream);
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  /** Draw watermark — saves and restores y so it won't affect layout */
  private watermark(doc: InstanceType<typeof PDFDocument>) {
    const y0 = doc.y;
    doc.save();
    doc.opacity(0.025);
    doc.font('Helvetica-Bold').fontSize(160);
    doc.text('⚕', doc.page.width / 2 - 45, doc.page.height / 2 - 90, { lineBreak: false });
    doc.restore();
    doc.y = y0;
  }

  /** Draw the professional header — returns next Y for content */
  private header(
    doc: InstanceType<typeof PDFDocument>,
    info: {
      doctor: { firstName: string; lastName: string; specialite?: string; phone?: string; address?: string };
      patient: { firstName: string; lastName: string };
      title: string;
      numero: string;
      date: string;
    },
  ): number {
    const W = doc.page.width;
    const L = 50;
    const R = W - 50;

    // Blue bar
    doc.rect(0, 0, W, 8).fill('#1565c0');

    // Doctor
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#1565c0');
    doc.text(`Dr ${info.doctor.firstName} ${info.doctor.lastName}`, L, 18, { lineBreak: false });

    let iy = 38;
    if (info.doctor.specialite) {
      doc.font('Helvetica').fontSize(9).fillColor('#555');
      doc.text(info.doctor.specialite, L, iy, { lineBreak: false });
      iy += 12;
    }
    if (info.doctor.phone || info.doctor.address) {
      doc.font('Helvetica').fontSize(8).fillColor('#999');
      doc.text([info.doctor.phone, info.doctor.address].filter(Boolean).join(' • '), L, iy, { lineBreak: false });
    }

    // Date / Numero box
    doc.roundedRect(R - 150, 16, 150, 38, 3).lineWidth(0.6).strokeColor('#bbb').stroke();
    doc.font('Helvetica').fontSize(8).fillColor('#666');
    doc.text('Date :', R - 144, 22, { lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#333');
    doc.text(info.date, R - 106, 22, { lineBreak: false });
    doc.font('Helvetica').fontSize(8).fillColor('#666');
    doc.text('N° :', R - 144, 38, { lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#333');
    doc.text(info.numero, R - 122, 38, { lineBreak: false });

    // Line
    doc.moveTo(L, 64).lineTo(R, 64).strokeColor('#e0e0e0').lineWidth(1).stroke();

    // Patient row
    doc.rect(L, 70, R - L, 20).fillColor('#f0f5ff').fill();
    doc.font('Helvetica').fontSize(9).fillColor('#444');
    doc.text('Patient(e) :', L + 8, 75, { lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#1565c0');
    doc.text(`${info.patient.lastName.toUpperCase()} ${info.patient.firstName}`, L + 75, 75, { lineBreak: false });

    // Title
    const titleW = doc.widthOfString(info.title);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#1565c0');
    doc.text(info.title, (W - titleW) / 2, 100, { lineBreak: false });

    // Underline
    doc.moveTo(W / 2 - 22, 116).lineTo(W / 2 + 22, 116).strokeColor('#1565c0').lineWidth(1.5).stroke();

    return 128;
  }

  /** Draw footer with QR at absolute position */
  private async footer(
    doc: InstanceType<typeof PDFDocument>,
    qrPayload: string,
    sigText: string,
  ) {
    const W = doc.page.width;
    const H = doc.page.height;

    // Line
    doc.moveTo(50, H - 58).lineTo(W - 50, H - 58).strokeColor('#e0e0e0').lineWidth(0.5).stroke();

    // QR
    const qrBuf = await QRCode.toBuffer(qrPayload, { width: 50, margin: 0 });
    doc.image(qrBuf, 50, H - 52, { width: 28 });

    // Signature
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#444');
    doc.text(sigText, W - 190, H - 50, { lineBreak: false });

    // Footer text
    doc.font('Helvetica').fontSize(5.5).fillColor('#bbb');
    const ftxt = 'Document généré par SihatiLab — Plateforme Médicale';
    const fw = doc.widthOfString(ftxt);
    doc.text(ftxt, (W - fw) / 2, H - 16, { lineBreak: false });

    // Bottom bar
    doc.rect(0, H - 5, W, 5).fill('#1565c0');
  }

  // ═══════════════════════════════════════════════
  //  ORDONNANCE — 1 page, patient name in filename
  // ═══════════════════════════════════════════════
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
    const doc = new PDFDocument({ size: 'A4', margin: 50, autoFirstPage: false });
    const bufferPromise = this.collectBuffer(doc);

    doc.addPage();
    this.watermark(doc);

    const dateStr = new Date(consultation.date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });

    let y = this.header(doc, {
      doctor: consultation.doctor,
      patient: consultation.patient,
      title: 'ORDONNANCE MÉDICALE',
      numero: `ORD-${consultation.id.substring(0, 8).toUpperCase()}`,
      date: dateStr,
    });

    // Collect all medicaments
    const meds: Array<{ nom: string; dosage: string; frequence: string; duree: string }> = [];
    for (const ord of ordonnances) {
      if (ord.medicaments && Array.isArray(ord.medicaments)) {
        meds.push(...ord.medicaments);
      }
    }

    // Footer zone starts at page.height - 65
    const maxY = doc.page.height - 68;

    for (const med of meds) {
      if (y >= maxY) break;

      // Bullet
      doc.circle(58, y + 4, 2).fill('#1565c0');

      // Med name + dosage
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#333');
      doc.text(`${med.nom || 'Médicament'}  ${med.dosage || ''}`, 68, y, { lineBreak: false });
      y += 14;

      // Posology
      const parts: string[] = [];
      if (med.frequence) parts.push(med.frequence);
      if (med.duree) parts.push(`pendant ${med.duree}`);
      if (parts.length > 0 && y < maxY) {
        doc.font('Helvetica').fontSize(8).fillColor('#777');
        doc.text(parts.join(' — '), 68, y, { lineBreak: false });
        y += 12;
      }
      y += 5;
    }

    // Footer
    await this.footer(doc, JSON.stringify({
      t: 'ord', id: consultation.id, d: dateStr,
      dr: consultation.doctor.lastName,
      p: consultation.patient.lastName,
      n: meds.length,
    }), 'Signature et Cachet :');

    doc.end();
    return bufferPromise;
  }

  // ═══════════════════════════════════════════════
  //  ANALYSES — 1 page, patient name in filename
  // ═══════════════════════════════════════════════
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
    const doc = new PDFDocument({ size: 'A4', margin: 50, autoFirstPage: false });
    const bufferPromise = this.collectBuffer(doc);

    doc.addPage();
    this.watermark(doc);

    const dateStr = new Date(consultation.date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });

    let y = this.header(doc, {
      doctor: consultation.doctor,
      patient: consultation.patient,
      title: 'DEMANDE D\'ANALYSES',
      numero: `AN-${consultation.id.substring(0, 8).toUpperCase()}`,
      date: dateStr,
    });

    const maxY = doc.page.height - 68;

    for (const an of analyses) {
      if (y >= maxY) break;

      // Stripe bg
      doc.rect(50, y, doc.page.width - 100, 16).fillColor('#f4f6f9').fill();
      doc.circle(60, y + 8, 2).fill('#1565c0');

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#333');
      doc.text(an.description, 72, y + 3, { lineBreak: false });
      y += 20;

      // Status
      if (y < maxY) {
        const lbl = an.status === 'terminee' ? 'Terminée' : an.status === 'en_cours' ? 'En cours' : 'En attente';
        doc.font('Helvetica').fontSize(7.5).fillColor('#999');
        doc.text(`Statut : ${lbl}`, 72, y, { lineBreak: false });
        y += 11;
      }

      // Result
      if (an.resultat && y < maxY) {
        doc.font('Helvetica').fontSize(7.5).fillColor('#666');
        doc.text(`Résultat : ${an.resultat}`, 72, y, { lineBreak: false });
        y += 11;
      }

      y += 4;
    }

    await this.footer(doc, JSON.stringify({
      t: 'an', id: consultation.id, d: dateStr,
      dr: consultation.doctor.lastName,
      p: consultation.patient.lastName,
      n: analyses.length,
    }), 'Signature et Cachet du Médecin :');

    doc.end();
    return bufferPromise;
  }

  /** Build a clean filename: PatientNom_Type_Date[_suffix].pdf */
  static buildFileName(
    patientLastName: string,
    patientFirstName: string,
    type: 'Ordonnance' | 'Analyses',
    dateStr: string,
    suffix?: string,
  ): string {
    const clean = (s: string) => s.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç]/g, '_').replace(/_+/g, '_');
    const base = `${clean(patientLastName)}_${clean(patientFirstName)}_${type}_${dateStr}`;
    return suffix ? `${base}_${suffix}.pdf` : `${base}.pdf`;
  }
}
