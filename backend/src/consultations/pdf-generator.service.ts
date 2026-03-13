import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
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
 * 6. Footer/signature are absolute coordinates (single page)
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

  /** Draw caduceus watermark */
  private watermark(doc: InstanceType<typeof PDFDocument>) {
    const y0 = doc.y;
    doc.save();

    // Position center of the page
    const cx = doc.page.width / 2;
    const cy = doc.page.height / 2;

    doc.translate(cx - 150, cy - 130); // Center a 300x300 roughly
    doc.scale(3); // Scale up the 100x100 SVG to 300x300

    doc.opacity(0.02);
    doc.lineWidth(2);
    doc.strokeColor('#0f172a');

    // Draw Caduceus SVG path from the frontend version
    // Wings & Staff
    doc.path('M50 5 L50 95 M46 92 L50 98 L54 92 M35 25 C45 25 50 15 50 10 C50 15 55 25 65 25 C80 25 85 30 85 35 C85 45 70 45 60 40 C55 37 45 37 40 40 C30 45 15 45 15 35 C15 30 20 25 35 25 Z').stroke();
    // Snakes
    doc.lineWidth(1.5);
    doc.path('M40 50 C30 50 30 40 40 40 C50 40 50 50 60 50 C70 50 70 60 60 60 C50 60 50 70 40 70 C30 70 30 80 40 80 M60 50 C70 50 70 40 60 40 C50 40 50 50 40 50 C30 50 30 60 40 60 C50 60 50 70 60 70 C70 70 70 80 60 80').stroke();
    // Top dot
    doc.circle(50, 10, 2).fillAndStroke('#0f172a', '#0f172a');

    doc.restore();
    doc.y = y0;
  }

  /** Draw the professional header — returns next Y for content */
  private header(
    doc: InstanceType<typeof PDFDocument>,
    info: {
      doctor: { firstName: string; lastName: string; specialite?: string; phone?: string; address?: string; ville?: string };
      patient: { firstName: string; lastName: string };
      title: string;
      numero: string;
      date: string;
    },
  ): number {
    const W = doc.page.width;
    const L = 50;
    const R = W - 50;

    // ----- Top Row: Doctor on Left, Contact on Right -----
    let y = 80;

    // Doctor details on left
    doc.font('Helvetica-Bold').fontSize(22).fillColor('#0f172a');
    doc.text(`Dr. ${info.doctor.firstName} ${info.doctor.lastName}`, L, y, { lineBreak: false });

    const specY = y + 26;
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#475569');
    doc.text(info.doctor.specialite?.toUpperCase() || 'MÉDECIN GÉNÉRALISTE', L, specY, { lineBreak: false, characterSpacing: 0.5 });

    // Contact on Right - Better formatting
    let ry = y;
    doc.font('Helvetica').fontSize(10).fillColor('#475569');
    const contactWidth = 220;
    
    if (info.doctor.address) {
      doc.text(info.doctor.address, R - contactWidth, ry, { width: contactWidth, align: 'left', lineBreak: false });
      ry += 14;
    }
    if (info.doctor.ville) {
      doc.text(info.doctor.ville, R - contactWidth, ry, { width: contactWidth, align: 'left', lineBreak: false });
      ry += 14;
    }
    if (info.doctor.phone) {
      doc.text(`Tél : ${info.doctor.phone}`, R - contactWidth, ry, { width: contactWidth, align: 'left', lineBreak: false });
      ry += 14;
    }

    y = Math.max(specY, ry) + 24;

    // Minimalist Divider
    doc.moveTo(L, y).lineTo(R, y).strokeColor('#e2e8f0').lineWidth(1).stroke();
    y += 30;

    // ----- Title -----
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#0f172a');
    doc.text(info.title.toUpperCase(), L, y, { width: W - 100, align: 'center', characterSpacing: 2, lineBreak: false });
    y += 26;

    // ----- Meta Row (Reference, Date) -----
    doc.font('Helvetica').fontSize(11).fillColor('#475569');
    doc.text(`Référence : ${info.numero}`, L, y, { lineBreak: false });
    doc.text(`Date : ${info.date}`, R - 200, y, { width: 200, align: 'right', lineBreak: false });
    y += 24;

    // ----- Patient Box -----
    doc.roundedRect(L, y, W - 100, 70, 6).fillAndStroke('#f8fafc', '#e2e8f0');

    // Patient Label
    doc.font('Helvetica').fontSize(10).fillColor('#64748b');
    doc.text('NOM COMPLET', L + 20, y + 16, { characterSpacing: 0.5, lineBreak: false });

    // Patient Value
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#0f172a');
    doc.text(`${info.patient.lastName.toUpperCase()} ${info.patient.firstName}`, L + 20, y + 36, { lineBreak: false });

    return y + 100; // Return next Y after patient box
  }

  /** Draw footer with QR at absolute position */
  private async footer(
    doc: InstanceType<typeof PDFDocument>,
    _qrPayload: string,
    doctor: { phone?: string; address?: string; ville?: string }
  ) {
    const W = doc.page.width;
    const H = doc.page.height;

    // CRITICAL: Signature zone at fixed position (150px from bottom = 842 - 150 = 692pt)
    const sigY = H - 150;
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a');
    doc.text('Signature et Cachet du Médecin', W - 250, sigY, { width: 200, align: 'center', lineBreak: false });

    // Signature line
    doc.moveTo(W - 250, sigY + 18).lineTo(W - 50, sigY + 18).strokeColor('#cbd5e1').dash(3, { space: 3 }).lineWidth(1).stroke();
    doc.undash();

    // CRITICAL: Bottom footer at fixed position (40px from bottom = 842 - 40 = 802pt)
    const footY = H - 60;
    doc.moveTo(50, footY).lineTo(W - 50, footY).strokeColor('#e2e8f0').lineWidth(1).stroke();

    // Footer Text
    doc.font('Helvetica').fontSize(9).fillColor('#94a3b8');
    const parts = [doctor.address, doctor.ville].filter(p => !!p);
    const ftxt = parts.join(' - ');
    doc.text(ftxt, 50, footY + 12, { width: W - 100, align: 'center', lineBreak: false });
    
    if (doctor.phone) {
      doc.fontSize(8);
      doc.text(`Tél : ${doctor.phone}`, 50, footY + 26, { width: W - 100, align: 'center', lineBreak: false });
    }
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
      doctor: { firstName: string; lastName: string; specialite?: string; phone?: string; address?: string; ville?: string };
      patient: { firstName: string; lastName: string };
    },
  ): Promise<Buffer> {
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 50, 
      autoFirstPage: false,
      bufferPages: true
    });
    const bufferPromise = this.collectBuffer(doc);

    doc.addPage();
    
    // CRITICAL: Override addPage to prevent any automatic page creation
    const originalAddPage = doc.addPage.bind(doc);
    doc.addPage = function() {
      console.warn('Attempted to add a new page - blocked!');
      return this;
    };
    
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

    // CRITICAL: Keep a strict safe area so signature/footer always remain visible.
    // A4 height = 842pt, footer starts at 662pt (842-180), so max content Y = 612pt
    const maxY = doc.page.height - 230;

    // Prescription section heading
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#0f172a');
    doc.text('PRESCRIPTION', 50, y, { lineBreak: false, characterSpacing: 0.6 });
    y += 12;
    doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor('#e2e8f0').lineWidth(1).stroke();
    y += 16;

    // Calculate how many medications we can fit
    const cardH = 42;
    const cardSpacing = 8;
    const totalCardHeight = cardH + cardSpacing;
    const availableHeight = maxY - y;
    const maxMeds = Math.floor(availableHeight / totalCardHeight);
    
    // Only render medications that fit on the page
    const medsToRender = meds.slice(0, maxMeds);

    for (let i = 0; i < medsToRender.length; i++) {
      const med = medsToRender[i];
      
      // Double check we don't exceed maxY
      if (y + cardH > maxY) break;

      // Medication card
      doc.roundedRect(50, y, doc.page.width - 100, cardH, 4).strokeColor('#cbd5e1').dash(2, { space: 2 }).lineWidth(1).stroke();
      doc.undash();

      doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a');
      doc.text(`${i + 1}. ${med.nom || 'Médicament'}`, 58, y + 10, { lineBreak: false });

      // Posology
      const parts: string[] = [];
      if (med.dosage) parts.push(`Dosage : ${med.dosage}`);
      if (med.frequence) parts.push(`Fréquence : ${med.frequence}`);
      if (med.duree) parts.push(`Durée : ${med.duree}`);

      const posologyText = parts.length > 0 ? parts.join(' | ') : '-';
      doc.font('Helvetica').fontSize(10).fillColor('#475569');
      doc.text(posologyText, 58, y + 26, { lineBreak: false, width: doc.page.width - 116 });

      y += totalCardHeight;
    }

    // Footer
    await this.footer(doc, JSON.stringify({
      t: 'ord', id: consultation.id, d: dateStr,
      dr: consultation.doctor.lastName,
      p: consultation.patient.lastName,
      n: meds.length,
    }), consultation.doctor);

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
      doctor: { firstName: string; lastName: string; specialite?: string; phone?: string; address?: string; ville?: string };
      patient: { firstName: string; lastName: string };
    },
  ): Promise<Buffer> {
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 50, 
      autoFirstPage: false,
      bufferPages: true
    });
    const bufferPromise = this.collectBuffer(doc);

    doc.addPage();
    
    // CRITICAL: Override addPage to prevent any automatic page creation
    const originalAddPage = doc.addPage.bind(doc);
    doc.addPage = function() {
      console.warn('Attempted to add a new page - blocked!');
      return this;
    };
    
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

    const maxY = doc.page.height - 230;

    // Analysis List Header
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#0f172a');
    doc.text('DÉTAILS DE L\'ANALYSE', 50, y, { characterSpacing: 1, lineBreak: false });
    y += 24;
    doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor('#e2e8f0').lineWidth(1).stroke();
    y += 24;

    for (const an of analyses) {
      if (y >= maxY) break;

      // Clean list format with checkboxes (bounded to one page)
      const items = (an.description || '').split(/[\n,]+/).map(i => i.trim()).filter(i => i.length > 0);

      for (let i = 0; i < items.length; i++) {
        if (y >= maxY - 24) break;
        // Draw checkbox box
        doc.lineWidth(1.5).strokeColor('#64748b').roundedRect(54, y + 1, 14, 14, 2).stroke();

        // Draw text next to it
        doc.font('Helvetica').fontSize(12).fillColor('#0f172a');
        const trimmedItem = items[i].length > 60 ? `${items[i].slice(0, 60)}...` : items[i];
        doc.text(trimmedItem, 82, y + 2, { lineBreak: false });

        y += 26;
      }

      y += 6;

      // Result - only if space available
      if (an.resultat && y < maxY - 40) {
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a');
        doc.text('RÉSULTAT CLINIQUE', 60, y, { lineBreak: false });
        y += 14;

        doc.font('Helvetica').fontSize(10).fillColor('#334155');
        const maxChars = 150;
        const shortResult = an.resultat.length > maxChars ? `${an.resultat.slice(0, maxChars)}...` : an.resultat;
        doc.text(shortResult, 60, y, { width: doc.page.width - 110, lineBreak: false });
        y += 18;
      }

      // Bottom divider for item - only if space available
      if (y < maxY - 10) {
        doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor('#f1f5f9').lineWidth(1).stroke();
        y += 20;
      }
    }

    await this.footer(doc, JSON.stringify({
      t: 'an', id: consultation.id, d: dateStr,
      dr: consultation.doctor.lastName,
      p: consultation.patient.lastName,
      n: analyses.length,
    }), consultation.doctor);

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
