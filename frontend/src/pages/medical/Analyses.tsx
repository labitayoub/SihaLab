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

type AnalysisRequestViewProps = {
  analyse: Analyse;
};

const CaduceusLogo = () => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 5 L50 95 M46 92 L50 98 L54 92 M35 25 C45 25 50 15 50 10 C50 15 55 25 65 25 C80 25 85 30 85 35 C85 45 70 45 60 40 C55 37 45 37 40 40 C30 45 15 45 15 35 C15 30 20 25 35 25 Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M40 50 C30 50 30 40 40 40 C50 40 50 50 60 50 C70 50 70 60 60 60 C50 60 50 70 40 70 C30 70 30 80 40 80 M60 50 C70 50 70 40 60 40 C50 40 50 50 40 50 C30 50 30 60 40 60 C50 60 50 70 60 70 C70 70 70 80 60 80" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <circle cx="50" cy="10" r="4" fill="currentColor" />
  </svg>
);

function AnalysisRequestView({ analyse }: AnalysisRequestViewProps) {
  return (
    <>
      <style>{`
        .analyse-a4 {
          position: relative;
          width: 210mm;
          height: 297mm;
          background: #ffffff;
          margin: 0 auto;
          overflow: hidden;
          padding: 16mm 12mm 10mm;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          border-radius: 4px;
          font-family: 'Inter', sans-serif;
          color: #334155;
        }
        .content-layer { position: relative; z-index: 1; }
        .header-flex { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
        .dr-info { max-width: 50%; }
        .dr-name { font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.2; }
        .dr-spec { font-size: 13px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
        .contact-info { text-align: left; max-width: 250px; font-size: 11px; color: #475569; line-height: 1.5; }
        .minimal-divider { border-top: 1px solid #e2e8f0; margin: 16px 0 18px; }
        .doc-title { text-align: center; margin-bottom: 18px; }
        .doc-title h1 { font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 10px; }
        .meta-row { display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
        .patient-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; margin-bottom: 16px; }
        .patient-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
        .patient-val { font-size: 14px; font-weight: 600; color: #0f172a; }
        .analysis-content { padding-bottom: 192px; }
        .section-heading { font-size: 16px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
        .analysis-grid { display: grid; grid-template-columns: 180px 1fr; padding: 4px 0; margin-bottom: 8px; }
        .analysis-label { color: #64748b; font-size: 12px; font-weight: 500; }
        .analysis-val { color: #334155; font-size: 13px; }
        .analysis-list { margin-top: 12px; max-height: 600px; overflow: hidden; display: grid; grid-template-columns: 1fr 1fr; gap: 14px 16px; }
        .analysis-item { display: flex; align-items: flex-start; gap: 10px; }
        .check-square { width: 16px; height: 16px; flex-shrink: 0; border: 1.5px solid #64748b; border-radius: 2px; margin-top: 2px; }
        .check-text { color: #0f172a; font-size: 14px; font-weight: 500; line-height: 1.4; }
        .result-box { margin-top: 16px; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 12px 14px; background: #ffffff; }
        .result-title { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
        .result-text { font-size: 13px; color: #475569; line-height: 1.5; }
        .watermark-bg {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 420px;
          height: 420px;
          opacity: 0.05;
          color: #0f172a;
          pointer-events: none;
          z-index: 0;
        }
        .signature-area { position: absolute; bottom: 180px; right: 48px; display: flex; justify-content: flex-end; }
        .signature-box { text-align: center; width: 220px; }
        .signature-title { font-size: 13px; font-weight: 600; color: #0f172a; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px; }
        .doc-footer { position: absolute; bottom: 32px; left: 48px; right: 48px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; }
          .analyse-a4 {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="analyse-a4">
        <div className="watermark-bg">
          <CaduceusLogo />
        </div>

        <div className="content-layer">
          <div className="header-flex">
            <div className="dr-info">
              <div className="dr-name">
                Dr. {analyse.consultation?.doctor?.firstName} {analyse.consultation?.doctor?.lastName}
              </div>
              <div className="dr-spec">
                {analyse.consultation?.doctor?.specialite || 'MEDECIN GENERALISTE'}
              </div>
            </div>

            <div className="contact-info">
              {analyse.consultation?.doctor?.address && <div>{analyse.consultation.doctor.address}</div>}
              {analyse.consultation?.doctor?.ville && <div>{analyse.consultation.doctor.ville}</div>}
              {analyse.consultation?.doctor?.phone && <div>Tél : {analyse.consultation.doctor.phone}</div>}
            </div>
          </div>

          <div className="minimal-divider" />

          <div className="doc-title">
            <h1>Demande d'Analyse Médicale</h1>
            <div className="meta-row">
              <span>Référence : AN-{analyse.id.substring(0, 8).toUpperCase()}</span>
              <span>Date : {new Date(analyse.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>

          <div className="patient-box">
            <div className="patient-label">Nom Complet</div>
            <div className="patient-val">
              {analyse.consultation?.patient?.lastName?.toUpperCase()} {analyse.consultation?.patient?.firstName}
            </div>
          </div>

          <div className="analysis-content">
            <div className="section-heading">Détails de l'analyse</div>

            {analyse.laboratoire && (
              <div className="analysis-grid">
                <div className="analysis-label">Laboratoire Assigné</div>
                <div className="analysis-val">{analyse.laboratoire.firstName} {analyse.laboratoire.lastName}</div>
              </div>
            )}

            <div className="analysis-list">
              {analyse.description.split(/[\n,]+/).map((item, idx) => (
                item.trim() && (
                  <div key={idx} className="analysis-item">
                    <span className="check-square" />
                    <span className="check-text">{item.trim()}</span>
                  </div>
                )
              ))}
            </div>

            {analyse.resultat && (
              <div className="result-box">
                <div className="result-title">RÉSULTAT CLINIQUE</div>
                <div className="result-text">{analyse.resultat}</div>
                {analyse.dateResultat && (
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '10px' }}>
                    Saisi le {new Date(analyse.dateResultat).toLocaleDateString('fr-FR')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="signature-area">
          <div className="signature-box">
            <div className="signature-title">Signature et Cachet du Médecin</div>
          </div>
        </div>

        <div className="doc-footer">
          <div>
            {analyse.consultation?.doctor?.address} {analyse.consultation?.doctor?.address && analyse.consultation?.doctor?.ville ? '-' : ''} {analyse.consultation?.doctor?.ville}
          </div>
          <div style={{ fontSize: '9px', marginTop: '6px' }}>
            {analyse.consultation?.doctor?.phone ? `Tél : ${analyse.consultation.doctor.phone}` : ''}
          </div>
        </div>
      </div>
    </>
  );
}

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

  const [viewOpen, setViewOpen] = useState(false);
  const [viewAnalyse, setViewAnalyse] = useState<Analyse | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const [allLaboratoires, setAllLaboratoires] = useState<any[]>([]);
  const [countryIsoCode, setCountryIsoCode] = useState('');
  const [selectedCountryName, setSelectedCountryName] = useState('');
  const [selectedVille, setSelectedVille] = useState('');

  const allCountries = useMemo(() => Country.getAllCountries(), []);
  const citiesForCountry = useMemo(
    () => countryIsoCode ? (City.getCitiesOfCountry(countryIsoCode) ?? []) : [],
    [countryIsoCode]
  );

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
              background-color: #ffffff;
              color: #334155;
              margin: 0;
              padding: 0;
            }
            @media print {
              @page { size: A4; margin: 0; }
              body { margin: 0; padding: 0; }
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

      {user?.role === UserRole.LABORATOIRE && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight="bold">Analyses qui vous sont assignées</Typography>
          <Typography variant="caption">Vous pouvez voir et imprimer les analyses qui vous ont été attribuées par les médecins.</Typography>
        </Alert>
      )}

      <Card>
        <DataGrid rows={analyses} columns={columns} autoHeight pageSizeOptions={[10, 20]} />
      </Card>

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
              <AnalysisRequestView analyse={viewAnalyse} />
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

          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Biotech color="secondary" />
            <Typography variant="subtitle1" fontWeight={600}>Laboratoire (optionnel)</Typography>
          </Box>

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
