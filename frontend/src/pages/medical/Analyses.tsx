import { useEffect, useState, useMemo, useRef } from 'react';
import { Box, Button, Card, Typography, Dialog, DialogTitle, DialogContent, TextField, Chip, MenuItem, IconButton, Divider, Alert, Autocomplete } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Add, Upload, Close, Biotech, CheckCircle, Visibility, Print } from '@mui/icons-material';
import { Country, City } from 'country-state-city';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/user.types';
import { Analyse, AnalyseStatus } from '../../types/analyse.types';
import api from '../../config/api';
import { toast } from '../../utils/toast';

export default function Analyses() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<Analyse[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedAnalyse, setSelectedAnalyse] = useState<string>('');
  const [formData, setFormData] = useState({
    consultationId: '',
    labId: '',
    description: '',
  });
  const [resultat, setResultat] = useState('');

  // View / Print sheet dialog
  const [viewOpen, setViewOpen] = useState(false);
  const [viewAnalyse, setViewAnalyse] = useState<Analyse | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Laboratoire selector state
  const [allLaboratoires, setAllLaboratoires] = useState<any[]>([]);
  const [countryIsoCode, setCountryIsoCode] = useState('');
  const [selectedCountryName, setSelectedCountryName] = useState('');
  const [selectedVille, setSelectedVille] = useState('');

  // country-state-city data
  const allCountries = useMemo(() => Country.getAllCountries(), []);
  const citiesForCountry = useMemo(
    () => countryIsoCode ? (City.getCitiesOfCountry(countryIsoCode) ?? []) : [],
    [countryIsoCode]
  );

  // Laboratoires inscrits sur la plateforme correspondant au pays + ville
  const filteredLaboratoires = useMemo(() =>
    allLaboratoires.filter((l) =>
      (!selectedCountryName || l.pays === selectedCountryName) &&
      (!selectedVille || l.ville === selectedVille)
    ),
    [allLaboratoires, selectedCountryName, selectedVille]);

  useEffect(() => {
    loadAnalyses();
    if (user?.role === UserRole.MEDECIN) {
      loadConsultations();
    }
  }, []);

  // Load ALL laboratoires once when dialog opens
  useEffect(() => {
    if (user?.role === UserRole.MEDECIN && open) {
      api.get('/users/laboratoires')
        .then(({ data }) => setAllLaboratoires(data))
        .catch((e) => console.error('Erreur chargement laboratoires', e));
    }
  }, [open]);

  const loadAnalyses = async () => {
    try {
      const endpoint = user?.role === UserRole.PATIENT ? '/analyses/patient/me' : '/analyses';
      const { data } = await api.get(endpoint);
      setAnalyses(data);
    } catch (error) {
      toast.error('Erreur de chargement');
    }
  };

  const loadConsultations = async () => {
    try {
      const { data } = await api.get('/consultations');
      setConsultations(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreate = async () => {
    try {
      const payload: any = {
        consultationId: formData.consultationId,
        description: formData.description,
      };
      if (formData.labId) payload.labId = formData.labId;
      const { data: newAnalyse } = await api.post('/analyses', payload);
      // Génération automatique du PDF dédié à cette analyse
      try {
        await api.post(`/consultations/${newAnalyse.consultationId}/generate-analyse-pdf/${newAnalyse.id}`);
        toast.success('Analyse demandée et PDF généré automatiquement');
      } catch {
        toast.success('Analyse demandée (PDF sera généré depuis la consultation)');
      }
      setOpen(false);
      loadAnalyses();
      setFormData({ consultationId: '', labId: '', description: '' });
      setCountryIsoCode('');
      setSelectedCountryName('');
      setSelectedVille('');
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };

  const handleUploadResultat = async () => {
    try {
      await api.post(`/analyses/${selectedAnalyse}/upload-resultat`, {
        resultat,
        fileUrl: '/uploads/resultat.pdf',
      });
      toast.success('Résultat uploadé');
      setUploadOpen(false);
      loadAnalyses();
      setResultat('');
    } catch (error) {
      toast.error('Erreur');
    }
  };

  /* ── View / Print handlers ── */
  const handleOpenView = (analyse: Analyse) => {
    setViewAnalyse(analyse);
    setViewOpen(true);
  };

  const handlePrintSheet = () => {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=800,height=1100');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Feuille d'Analyse</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Inter', sans-serif; 
              background-color: #f1f5f9; /* default gray bg for web view */
              color: #334155; 
              padding: 40px;
            }
            
            /* A4 Container */
            .a4-container {
              background: #ffffff;
              max-width: 210mm; /* A4 width */
              min-height: 297mm; /* A4 height */
              margin: 0 auto;
              padding: 40px 50px;
              position: relative;
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            }

            /* Typography & Colors */
            .text-navy { color: #1e3a8a; }
            .text-slate { color: #64748b; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .font-medium { font-weight: 500; }
            .text-sm { font-size: 13px; }
            .text-xs { font-size: 11px; }

            /* Header Section */
            .header-flex { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
            .dr-info { max-width: 50%; }
            .dr-name { font-size: 22px; margin-bottom: 4px; letter-spacing: -0.5px; }
            .dr-spec { font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
            .contact-info { text-align: right; line-height: 1.6; }
            
            /* Divider */
            .minimal-divider { border-top: 1px solid #e2e8f0; margin: 24px 0 32px 0; }

            /* Document Title */
            .doc-title { text-align: center; margin-bottom: 32px; }
            .doc-title h1 { 
              font-size: 20px; 
              font-weight: 700; 
              color: #1e3a8a;
              letter-spacing: 0.15em;
              text-transform: uppercase;
              margin-bottom: 12px;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
              font-size: 13px;
              color: #64748b;
              padding: 0 20px;
            }

            /* Patient Info Box */
            .patient-box {
              background-color: #f8fafc; /* slate-50 */
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 20px;
              margin-bottom: 40px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
            }
            .patient-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
            .patient-val { font-size: 15px; font-weight: 600; color: #0f172a; }

            /* Analysis Area */
            .analysis-area { margin-bottom: 40px; }
            .section-heading { font-size: 15px; font-weight: 700; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;}
            
            .analysis-grid { display: grid; grid-template-columns: 160px 1fr; border-bottom: 1px solid #f1f5f9; padding: 12px 0; }
            .analysis-label { color: #64748b; font-size: 13px; font-weight: 500; }
            .analysis-val { color: #334155; font-size: 14px; }
            
            .analysis-desc {
              margin-top: 24px;
              padding-left: 16px;
              border-left: 3px solid #cbd5e1;
              color: #334155;
              font-size: 14px;
              line-height: 1.7;
            }
            
            .result-container {
              margin-top: 32px;
              background-color: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 20px;
            }
            .result-title { font-size: 14px; font-weight: 600; color: #1e3a8a; margin-bottom: 12px; }
            .result-text { font-size: 14px; color: #334155; line-height: 1.6; }

            /* Footer */
            .signature-area {
              margin-top: 60px;
              display: flex;
              justify-content: flex-end;
              padding-right: 40px;
            }
            .signature-box {
              text-align: center;
              width: 200px;
            }
            .signature-title { font-size: 13px; font-weight: 600; color: #1e3a8a; margin-bottom: 60px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px; }
            
            .doc-footer {
              position: absolute;
              bottom: 40px;
              left: 50px;
              right: 50px;
              text-align: center;
              font-size: 11px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 16px;
            }

            @media print { 
              body { background: transparent; padding: 0; }
              .a4-container {
                box-shadow: none;
                margin: 0;
                padding: 0; /* Let print margins handle it, or keep standard padding */
                width: 100%;
                max-width: none;
                min-height: auto;
              }
              .patient-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .result-container { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>${printContents}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 800);
  };

  const columns: GridColDef[] = [
    { field: 'createdAt', headerName: 'Date', width: 155, valueFormatter: (params) => new Date(params).toLocaleString('fr-FR') },
    {
      field: 'patient',
      headerName: 'Patient',
      flex: 1,
      minWidth: 130,
      valueGetter: (_value: any, row: any) => `${row.consultation?.patient?.firstName} ${row.consultation?.patient?.lastName}`,
    },
    { field: 'description', headerName: 'Description', flex: 2, minWidth: 170 },
    {
      field: 'laboratoire',
      headerName: 'Laboratoire',
      flex: 1,
      minWidth: 130,
      valueGetter: (_value: any, row: any) =>
        row.laboratoire ? `${row.laboratoire.firstName} ${row.laboratoire.lastName}` : '—',
    },
    {
      field: 'status',
      headerName: 'Statut',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={
            params.value === AnalyseStatus.TERMINEE ? 'success' :
              params.value === AnalyseStatus.EN_COURS ? 'warning' : 'default'
          }
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <IconButton size="small" color="primary" onClick={() => handleOpenView(params.row)} title="Voir la feuille d'analyse">
            <Visibility fontSize="small" />
          </IconButton>
          <IconButton size="small" color="secondary" onClick={() => { handleOpenView(params.row); setTimeout(handlePrintSheet, 500); }} title="Imprimer">
            <Print fontSize="small" />
          </IconButton>
          {user?.role === UserRole.LABORATOIRE && params.row.status !== AnalyseStatus.TERMINEE && (
            <Button
              size="small"
              startIcon={<Upload />}
              onClick={() => { setSelectedAnalyse(params.row.id); setUploadOpen(true); }}
            >
              Upload Résultat
            </Button>
          )}
        </Box>
      ),
    },
  ];

  /* ── Helper: status label/color ── */
  const statusLabel = (s: string) => {
    if (s === AnalyseStatus.TERMINEE) return 'Terminée';
    if (s === AnalyseStatus.EN_COURS) return 'En cours';
    return 'En attente';
  };

  // Caduceus SVG for logo and watermark
  const CaduceusLogo = () => (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 5 L50 95 M46 92 L50 98 L54 92 M35 25 C45 25 50 15 50 10 C50 15 55 25 65 25 C80 25 85 30 85 35 C85 45 70 45 60 40 C55 37 45 37 40 40 C30 45 15 45 15 35 C15 30 20 25 35 25 Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 50 C30 50 30 40 40 40 C50 40 50 50 60 50 C70 50 70 60 60 60 C50 60 50 70 40 70 C30 70 30 80 40 80 M60 50 C70 50 70 40 60 40 C50 40 50 50 40 50 C30 50 30 60 40 60 C50 60 50 70 60 70 C70 70 70 80 60 80" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="10" r="4" fill="currentColor" />
    </svg>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Analyses</Typography>
        {user?.role === UserRole.MEDECIN && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
            Nouvelle Analyse
          </Button>
        )}
      </Box>

      {/* Affichage pour laboratoire: analyses assignées */}
      {user?.role === UserRole.LABORATOIRE && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight="bold">Analyses qui vous sont assignées</Typography>
          <Typography variant="caption">Vous pouvez voir et imprimer les analyses qui vous ont été attribuées par les médecins.</Typography>
        </Alert>
      )}

      <Card>
        <DataGrid rows={analyses} columns={columns} autoHeight pageSizeOptions={[10, 20]} />
      </Card>

      {/* ══════════════ View / Print Sheet Dialog ══════════════ */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Biotech color="secondary" />
            Rapport d'Analyse
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {viewAnalyse?.pdfUrl && (
              <IconButton size="small" color="primary" href={viewAnalyse.pdfUrl} target="_blank" title="Voir PDF">
                <Visibility fontSize="small" />
              </IconButton>
            )}
            <IconButton size="small" color="secondary" onClick={handlePrintSheet} title="Imprimer">
              <Print fontSize="small" />
            </IconButton>
            <IconButton onClick={() => setViewOpen(false)}><Close /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#e2e8f0', p: { xs: 2, md: 4 } }}>
          {viewAnalyse && (
            <Box ref={printRef}>
              {/* Inject standard print styling to preview modal */}
              <style>{`
                .a4-container { background: #ffffff; max-width: 210mm; min-height: 297mm; margin: 0 auto; padding: 80px 60px 40px; position: relative; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); font-family: 'Inter', sans-serif; color: #334155; border-radius: 4px; overflow: hidden; }
                .watermark-bg { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 450px; height: 450px; opacity: 0.04; color: #0f172a; pointer-events: none; z-index: 0; }
                .content-layer { position: relative; z-index: 1; min-height: calc(100% - 100px); }
                .text-navy { color: #0f172a; } .text-slate { color: #475569; } .font-bold { font-weight: 700; } .font-semibold { font-weight: 600; } .font-medium { font-weight: 500; } .text-sm { font-size: 13px; } .text-xs { font-size: 11px; }
                .header-flex { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
                .dr-info { max-width: 50%; } .dr-name { font-size: 22px; margin-bottom: 4px; letter-spacing: -0.5px; } .dr-spec { font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
                .contact-info { text-align: left; line-height: 1.6; }
                .minimal-divider { border-top: 1px solid #e2e8f0; margin: 24px 0 32px 0; }
                .doc-title { text-align: center; margin-bottom: 32px; }
                .doc-title h1 { font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 12px; }
                .meta-row { display: flex; justify-content: space-between; font-size: 13px; color: #475569; padding: 0 20px; }
                .patient-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin-bottom: 40px; }
                .patient-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
                .patient-val { font-size: 15px; font-weight: 600; color: #0f172a; }
                .analysis-area { margin-bottom: 40px; }
                .section-heading { font-size: 16px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;}
                .analysis-grid { display: grid; grid-template-columns: 160px 1fr; padding: 6px 0; }
                .analysis-label { color: #64748b; font-size: 13px; font-weight: 500; }
                .analysis-val { color: #334155; font-size: 14px; }
                .analysis-checklist { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 16px; margin-top: 32px; padding-left: 8px; }
                .checklist-item { display: flex; align-items: flex-start; gap: 12px; }
                .checkbox-square { width: 16px; height: 16px; flex-shrink: 0; border: 1.5px solid #64748b; border-radius: 2px; margin-top: 2px; }
                .checklist-text { color: #0f172a; font-size: 15px; font-weight: 500; line-height: 1.4; }
                .result-container { margin-top: 40px; background-color: #ffffff; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 20px; }
                .result-title { font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
                .result-text { font-size: 14px; color: #334155; line-height: 1.6; }
                .signature-area { position: absolute; bottom: 128px; right: 60px; display: flex; justify-content: flex-end; }
                .signature-box { text-align: center; width: 220px; }
                .signature-title { font-size: 13px; font-weight: 600; color: #0f172a; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px; margin-bottom: 60px; }
                .doc-footer { position: absolute; bottom: 32px; left: 48px; right: 48px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
                @media print {
                  @page { margin: 0; }
                  body { margin: 1cm; }
                  .a4-container { box-shadow: none !important; border-radius: 0; padding: 30px 40px; }
                }
              `}</style>

              <div className="a4-container">
                <div className="watermark-bg">
                  <CaduceusLogo />
                </div>

                <div className="content-layer">
                  {/* Header */}
                  <div className="header-flex">
                    <div className="dr-info">
                      <div className="dr-name text-navy font-bold">
                        Dr. {viewAnalyse.consultation?.doctor?.firstName} {viewAnalyse.consultation?.doctor?.lastName}
                      </div>
                      <div className="dr-spec text-slate font-medium">
                        {viewAnalyse.consultation?.doctor?.specialite || 'MÉDECIN GÉNÉRALISTE'}
                      </div>
                    </div>

                    <div className="contact-info text-xs text-slate">
                      {viewAnalyse.consultation?.doctor?.address && <div>{viewAnalyse.consultation.doctor.address}</div>}
                      {viewAnalyse.consultation?.doctor?.ville && <div>{viewAnalyse.consultation.doctor.ville}</div>}
                      {viewAnalyse.consultation?.doctor?.phone && <div style={{ marginTop: '4px' }}>Tél : {viewAnalyse.consultation.doctor.phone}</div>}
                    </div>
                  </div>

                  <div className="minimal-divider" />

                  {/* Title and Meta */}
                  <div className="doc-title">
                    <h1>Demande d'Analyse Médicale</h1>
                    <div className="meta-row">
                      <span>Référence : AN-{viewAnalyse.id.substring(0, 8).toUpperCase()}</span>
                      <span>Date : {new Date(viewAnalyse.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Patient Box */}
                  <div className="patient-box">
                    <div>
                      <div className="patient-label">Nom Complet</div>
                      <div className="patient-val text-navy">
                        {viewAnalyse.consultation?.patient?.lastName?.toUpperCase()} {viewAnalyse.consultation?.patient?.firstName}
                      </div>
                    </div>
                  </div>

                  {/* Analysis Area */}
                  <div className="analysis-area">
                    <div className="section-heading">Détails de l'analyse</div>

                    {viewAnalyse.laboratoire && (
                      <div className="analysis-grid" style={{ marginTop: '8px' }}>
                        <div className="analysis-label">Laboratoire Assigné</div>
                        <div className="analysis-val">{viewAnalyse.laboratoire.firstName} {viewAnalyse.laboratoire.lastName}</div>
                      </div>
                    )}

                    {/* Rendering comma/newline separated items as Checkboxes */}
                    <div className="analysis-checklist">
                      {viewAnalyse.description.split(/[\n,]+/).map((item, idx) => (
                        item.trim() && (
                          <div key={idx} className="checklist-item">
                            <span className="checkbox-square"></span>
                            <span className="checklist-text">{item.trim()}</span>
                          </div>
                        )
                      ))}
                    </div>

                    {/* Optional Result Block */}
                    {viewAnalyse.resultat && (
                      <div className="result-container">
                        <div className="result-title">RÉSULTAT CLINIQUE</div>
                        <div className="result-text">{viewAnalyse.resultat}</div>
                        {viewAnalyse.dateResultat && (
                          <div className="text-xs text-slate" style={{ marginTop: '16px' }}>
                            Saisi le {new Date(viewAnalyse.dateResultat).toLocaleDateString('fr-FR')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Signature Area */}
                  <div className="signature-area">
                    <div className="signature-box">
                      <div className="signature-title">Signature et Cachet du Médecin</div>
                      {/* Empty space for physical stamp/signature */}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="doc-footer">
                    <div>
                      {viewAnalyse.consultation?.doctor?.address} {viewAnalyse.consultation?.doctor?.address && viewAnalyse.consultation?.doctor?.ville ? '-' : ''} {viewAnalyse.consultation?.doctor?.ville}
                    </div>
                    <div style={{ fontSize: '9px', marginTop: '6px' }}>
                      {viewAnalyse.consultation?.doctor?.phone ? `Tél : ${viewAnalyse.consultation.doctor.phone}` : ''}
                    </div>
                  </div>
                </div>
              </div>

            </Box>
          )}
        </DialogContent>
      </Dialog>


      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Nouvelle Demande d'Analyse
          <IconButton onClick={() => setOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Consultation"
            value={formData.consultationId}
            onChange={(e) => setFormData({ ...formData, consultationId: e.target.value })}
            margin="normal"
          >
            {consultations.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.patient?.firstName} {c.patient?.lastName} - {new Date(c.date).toLocaleDateString()}
              </MenuItem>
            ))}
          </TextField>

          {/* ── Laboratoire selection ── */}
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Biotech color="secondary" />
            <Typography variant="subtitle1" fontWeight={600}>Laboratoire (optionnel)</Typography>
          </Box>

          {/* Étape 1 — Pays (liste complète country-state-city) */}
          <Autocomplete
            options={allCountries}
            getOptionLabel={(opt) => `${opt.flag ?? ''} ${opt.name}`}
            isOptionEqualToValue={(opt, val) => opt.isoCode === val.isoCode}
            value={allCountries.find((c) => c.isoCode === countryIsoCode) ?? null}
            onChange={(_, country) => {
              if (country) { setCountryIsoCode(country.isoCode); setSelectedCountryName(country.name); }
              else { setCountryIsoCode(''); setSelectedCountryName(''); }
              setSelectedVille('');
              setFormData((f) => ({ ...f, labId: '' }));
            }}
            renderInput={(params) => (
              <TextField {...params} label="1. Pays" size="small" margin="dense" />
            )}
            sx={{ mb: 0.5 }}
          />

          {/* Étape 2 — Ville (villes du pays sélectionné) */}
          {countryIsoCode && (
            <TextField
              select
              fullWidth
              size="small"
              label="2. Ville"
              value={selectedVille}
              onChange={(e) => { setSelectedVille(e.target.value); setFormData((f) => ({ ...f, labId: '' })); }}
              margin="dense"
            >
              <MenuItem value=""><em>— Toutes les villes —</em></MenuItem>
              {citiesForCountry.map((c) => (
                <MenuItem key={`${c.name}-${(c as any).stateCode ?? ''}`} value={c.name}>{c.name}</MenuItem>
              ))}
            </TextField>
          )}

          {/* Étape 3 — Laboratoires inscrits sur la plateforme */}
          {selectedCountryName && (
            <Box sx={{ mt: 1.5 }}>
              {filteredLaboratoires.length === 0 ? (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Aucun laboratoire inscrit pour {[selectedVille, selectedCountryName].filter(Boolean).join(', ')}
                </Alert>
              ) : (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    {filteredLaboratoires.length} laboratoire(s) inscrit(s) sur la plateforme
                  </Typography>
                  {filteredLaboratoires.map((l) => (
                    <Box
                      key={l.id}
                      onClick={() => setFormData((f) => ({ ...f, labId: f.labId === l.id ? '' : l.id }))}
                      sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        p: 1.5, mb: 1, borderRadius: 2, cursor: 'pointer', border: '2px solid',
                        borderColor: formData.labId === l.id ? 'secondary.main' : 'divider',
                        bgcolor: formData.labId === l.id ? 'secondary.50' : 'background.paper',
                        '&:hover': { borderColor: 'secondary.light', bgcolor: 'action.hover' },
                        transition: 'all .15s',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Biotech color={formData.labId === l.id ? 'secondary' : 'disabled'} />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{l.firstName} {l.lastName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {[l.ville, l.pays].filter(Boolean).join(', ')}
                            {l.phone ? ` · ${l.phone}` : ''}
                          </Typography>
                        </Box>
                      </Box>
                      {formData.labId === l.id && <CheckCircle color="secondary" fontSize="small" />}
                    </Box>
                  ))}
                </>
              )}
            </Box>
          )}

          {formData.labId && (
            <Button
              size="small" color="inherit"
              sx={{ mt: 0.5, mb: 1, color: 'text.secondary', textTransform: 'none' }}
              onClick={() => setFormData((f) => ({ ...f, labId: '' }))}
            >
              ✕ Retirer la sélection du laboratoire
            </Button>
          )}
          <Divider sx={{ my: 2 }} />

          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
            multiline
            rows={4}
          />
          <Button fullWidth variant="contained" onClick={handleCreate} sx={{ mt: 2 }}>
            Créer
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Upload Résultat
          <IconButton onClick={() => setUploadOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Résultat"
            value={resultat}
            onChange={(e) => setResultat(e.target.value)}
            margin="normal"
            multiline
            rows={6}
          />
          <Button fullWidth variant="contained" onClick={handleUploadResultat} sx={{ mt: 2 }}>
            Enregistrer
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
