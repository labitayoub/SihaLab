import { useEffect, useState, useMemo, useRef } from 'react';
import { Box, Button, Card, Typography, Dialog, DialogTitle, DialogContent, TextField, Chip, IconButton, MenuItem, Divider, Alert, Autocomplete } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Add, Delete, Close, LocalPharmacy, CheckCircle, Visibility, Print } from '@mui/icons-material';
import { Country, City } from 'country-state-city';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/user.types';
import { Ordonnance, OrdonnanceStatus } from '../../types/ordonnance.types';
import api from '../../config/api';
import { toast } from '../../utils/toast';
import { ToastMessages } from '../../utils/toastMessages';

type OrdonnanceWithPdf = Ordonnance & { pdfUrl?: string };

type OrdonnanceViewProps = {
  ordonnance: Ordonnance;
};

const CaduceusLogo = () => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 5 L50 95 M46 92 L50 98 L54 92 M35 25 C45 25 50 15 50 10 C50 15 55 25 65 25 C80 25 85 30 85 35 C85 45 70 45 60 40 C55 37 45 37 40 40 C30 45 15 45 15 35 C15 30 20 25 35 25 Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M40 50 C30 50 30 40 40 40 C50 40 50 50 60 50 C70 50 70 60 60 60 C50 60 50 70 40 70 C30 70 30 80 40 80 M60 50 C70 50 70 40 60 40 C50 40 50 50 40 50 C30 50 30 60 40 60 C50 60 50 70 60 70 C70 70 70 80 60 80" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <circle cx="50" cy="10" r="4" fill="currentColor" />
  </svg>
);

function OrdonnanceView({ ordonnance }: OrdonnanceViewProps) {
  return (
    <>
      <style>{`
        .ordonnance-wrapper {
          height: 297mm;
          min-height: 297mm;
          max-height: 297mm;
          overflow: hidden;
        }
        .ordonnance-a4 {
          position: relative;
          width: 210mm;
          height: 297mm;
          min-height: 297mm;
          max-height: 297mm;
          background: #ffffff;
          margin: 0 auto;
          overflow: hidden;
          padding: 16mm 12mm 10mm;
          font-family: 'Inter', sans-serif;
          color: #334155;
          border-radius: 4px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
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
        .content-layer { position: relative; z-index: 1; }
        .header-flex { display: flex !important; justify-content: space-between !important; align-items: flex-start; margin-bottom: 16px; }
        .dr-name { font-size: 26px; font-weight: 700; color: #0f172a; line-height: 1.2; }
        .dr-spec { font-size: 13px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
        .contact-info { text-align: left; max-width: 260px; font-size: 11px; color: #475569; line-height: 1.6; }
        .minimal-divider { border-top: 1px solid #e2e8f0; margin: 16px 0 18px; }
        .doc-title { text-align: center; margin-bottom: 18px; }
        .doc-title h1 { font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 10px; }
        .meta-row { display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
        .patient-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; margin-bottom: 16px; }
        .patient-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
        .patient-val { font-size: 14px; font-weight: 600; color: #0f172a; }
        .section-heading { font-size: 16px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
        .analysis-grid { display: grid; grid-template-columns: 180px 1fr; padding: 4px 0; margin-bottom: 8px; }
        .analysis-label { color: #64748b; font-size: 12px; font-weight: 500; }
        .analysis-val { color: #334155; font-size: 13px; }
        .med-content { max-height: 650px; overflow: hidden; }
        .med-list { display: grid; gap: 8px; }
        .med-item { border: 1px dashed #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #ffffff; }
        .med-name { font-weight: 700; color: #0f172a; margin-bottom: 3px; font-size: 15px; }
        .med-meta { font-size: 12px; color: #475569; line-height: 1.5; }
        .signature-area { position: absolute; bottom: 150px; right: 48px; display: flex; justify-content: flex-end; }
        .signature-box { text-align: center; width: 240px; }
        .signature-title { font-size: 13px; font-weight: 600; color: #0f172a; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px; }
        .doc-footer { position: absolute; bottom: 40px; left: 48px; right: 48px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; background: #ffffff; }
          .ordonnance-wrapper { height: 297mm; min-height: 297mm; max-height: 297mm; page-break-after: avoid; page-break-inside: avoid; }
          .ordonnance-a4 { box-shadow: none; border-radius: 0; page-break-after: avoid; page-break-inside: avoid; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="ordonnance-wrapper">
        <div className="ordonnance-a4">
        <div className="watermark-bg">
          <CaduceusLogo />
        </div>

        <div className="content-layer">
          <div className="header-flex">
            <div>
              <div className="dr-name">
                Dr. {ordonnance.consultation?.doctor?.firstName} {ordonnance.consultation?.doctor?.lastName}
              </div>
              <div className="dr-spec">
                {ordonnance.consultation?.doctor?.specialite || 'MEDECIN GENERALISTE'}
              </div>
            </div>

            <div className="contact-info">
              {ordonnance.consultation?.doctor?.address && (
                <div style={{ marginBottom: '4px' }}>{ordonnance.consultation.doctor.address}</div>
              )}
              {ordonnance.consultation?.doctor?.ville && (
                <div style={{ marginBottom: '4px' }}>{ordonnance.consultation.doctor.ville}</div>
              )}
              {ordonnance.consultation?.doctor?.phone && (
                <div>Tel : {ordonnance.consultation.doctor.phone}</div>
              )}
            </div>
          </div>

          <div className="minimal-divider" />

          <div className="doc-title">
            <h1>Ordonnance Medicale</h1>
            <div className="meta-row">
              <span>Reference : OR-{ordonnance.id.substring(0, 8).toUpperCase()}</span>
              <span>Date : {new Date(ordonnance.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>

          <div className="patient-box">
            <div className="patient-label">Nom Complet</div>
            <div className="patient-val">
              {ordonnance.consultation?.patient?.lastName?.toUpperCase()} {ordonnance.consultation?.patient?.firstName}
            </div>
          </div>

          <div className="med-content">
            <div className="section-heading">Prescription</div>

            {ordonnance.pharmacien && (
              <div className="analysis-grid">
                <div className="analysis-label">Pharmacie assignee</div>
                <div className="analysis-val">{ordonnance.pharmacien.firstName} {ordonnance.pharmacien.lastName}</div>
              </div>
            )}

            <div className="med-list">
              {ordonnance.medicaments?.map((med: any, idx: number) => (
                <div className="med-item" key={`${med.nom}-${idx}`}>
                  <div className="med-name">{idx + 1}. {med.nom || 'Medicament'}</div>
                  <div className="med-meta">
                    Dosage : {med.dosage || '-'} | Frequence : {med.frequence || '-'} | Duree : {med.duree || '-'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="signature-area">
          <div className="signature-box">
            <div className="signature-title">Signature et Cachet du Medecin</div>
          </div>
        </div>

        <div className="doc-footer">
          <div>
            {ordonnance.consultation?.doctor?.address} {ordonnance.consultation?.doctor?.address && ordonnance.consultation?.doctor?.ville ? '-' : ''} {ordonnance.consultation?.doctor?.ville}
          </div>
          <div style={{ fontSize: '9px', marginTop: '6px' }}>
            {ordonnance.consultation?.doctor?.phone ? `Tel : ${ordonnance.consultation.doctor.phone}` : ''}
          </div>
        </div>
      </div>
      </div>
    </>
  );
}

export default function Ordonnances() {
  const { user } = useAuth();
  const [ordonnances, setOrdonnances] = useState<Ordonnance[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    consultationId: '',
    pharmacienId: '',
    medicaments: [{ nom: '', dosage: '', frequence: '', duree: '' }],
  });

  // Pharmacie selector state
  const [allPharmaciens, setAllPharmaciens] = useState<any[]>([]);
  const [countryIsoCode, setCountryIsoCode] = useState('');
  const [selectedCountryName, setSelectedCountryName] = useState('');
  const [selectedVille, setSelectedVille] = useState('');

  // View / Print sheet dialog
  const [viewOpen, setViewOpen] = useState(false);
  const [viewOrdonnance, setViewOrdonnance] = useState<Ordonnance | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // country-state-city data
  const allCountries = useMemo(() => Country.getAllCountries(), []);
  const citiesForCountry = useMemo(
    () => countryIsoCode ? (City.getCitiesOfCountry(countryIsoCode) ?? []) : [],
    [countryIsoCode]
  );

  // Pharmaciens inscrits sur la plateforme correspondant au pays + ville
  const filteredPharmaciens = useMemo(() =>
    allPharmaciens.filter((p) =>
      (!selectedCountryName || p.pays === selectedCountryName) &&
      (!selectedVille || p.ville === selectedVille)
    ),
  [allPharmaciens, selectedCountryName, selectedVille]);

  useEffect(() => {
    loadOrdonnances();
    if (user?.role === UserRole.MEDECIN) {
      loadConsultations();
    }
  }, []);

  // Load ALL pharmaciens once when dialog opens
  useEffect(() => {
    if (user?.role === UserRole.MEDECIN && open) {
      api.get('/users/pharmaciens')
        .then(({ data }) => setAllPharmaciens(data))
        .catch((e) => console.error('Erreur chargement pharmaciens', e));
    }
  }, [open]);

  const loadOrdonnances = async () => {
    try {
      const endpoint = user?.role === UserRole.PATIENT ? '/ordonnances/patient/me' : '/ordonnances';
      const { data } = await api.get(endpoint);
      setOrdonnances(data);
    } catch (error) {
      toast.error(ToastMessages.ordonnances.loadError);
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
        medicaments: formData.medicaments,
      };
      if (formData.pharmacienId) payload.pharmacienId = formData.pharmacienId;
      const { data: newOrd } = await api.post('/ordonnances', payload);
      // Génération automatique du PDF dédié à cette ordonnance
      try {
        await api.post(`/consultations/${newOrd.consultationId}/generate-ordonnance-pdf/${newOrd.id}`);
        toast.success(ToastMessages.ordonnances.pdfGenerateSuccess);
      } catch {
        toast.success(ToastMessages.ordonnances.pdfGenerateFallback);
      }
      setOpen(false);
      loadOrdonnances();
      setFormData({ consultationId: '', pharmacienId: '', medicaments: [{ nom: '', dosage: '', frequence: '', duree: '' }] });
      setCountryIsoCode('');
      setSelectedCountryName('');
      setSelectedVille('');
    } catch (error) {
      toast.error(ToastMessages.ordonnances.createError());
    }
  };

  const handleDelivrer = async (id: string) => {
    try {
      await api.post(`/ordonnances/${id}/delivrer`);
      toast.success(ToastMessages.ordonnances.deliverSuccess);
      loadOrdonnances();
    } catch (error) {
      toast.error(ToastMessages.ordonnances.deliverError);
    }
  };

  const addMedicament = () => {
    setFormData({
      ...formData,
      medicaments: [...formData.medicaments, { nom: '', dosage: '', frequence: '', duree: '' }],
    });
  };

  const removeMedicament = (index: number) => {
    const newMeds = formData.medicaments.filter((_, i) => i !== index);
    setFormData({ ...formData, medicaments: newMeds });
  };

  const updateMedicament = (index: number, field: string, value: string) => {
    const newMeds = [...formData.medicaments];
    newMeds[index] = { ...newMeds[index], [field]: value };
    setFormData({ ...formData, medicaments: newMeds });
  };

  const handleOpenView = (ordonnance: Ordonnance) => {
    setViewOrdonnance(ordonnance);
    setViewOpen(true);
  };

  const handlePrintSheet = () => {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=210mm,height=297mm');
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Feuille d'Ordonnance</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body {
              font-family: 'Inter', sans-serif;
              background-color: #ffffff;
              color: #334155;
              padding: 0;
              margin: 0;
              width: 210mm;
              height: 297mm;
              overflow: hidden;
            }
            .no-print {
              display: none !important;
            }
            @page { 
              size: 210mm 297mm;
              margin: 0;
            }
            @media print {
              html, body {
                width: 210mm;
                height: 297mm;
                margin: 0;
                padding: 0;
                overflow: hidden;
              }
              .ordonnance-wrapper {
                height: 297mm !important;
                min-height: 297mm !important;
                max-height: 297mm !important;
                page-break-after: avoid !important;
                page-break-inside: avoid !important;
              }
              .ordonnance-a4 {
                page-break-after: avoid !important;
                page-break-inside: avoid !important;
              }
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

  const getPdfUrl = (ordonnance: Ordonnance | null) => (ordonnance as OrdonnanceWithPdf | null)?.pdfUrl;
  const selectedPdfUrl = getPdfUrl(viewOrdonnance);

  const columns: GridColDef[] = [
    { field: 'createdAt', headerName: 'Date', width: 155, valueFormatter: (params) => new Date(params).toLocaleString('fr-FR') },
    { 
      field: 'patient', 
      headerName: 'Patient', 
      flex: 1,
      minWidth: 130,
      valueGetter: (_value: any, row: any) => `${row.consultation?.patient?.firstName} ${row.consultation?.patient?.lastName}`,
    },
    { 
      field: 'doctor', 
      headerName: 'Médecin', 
      flex: 1,
      minWidth: 130,
      valueGetter: (_value: any, row: any) => `Dr. ${row.consultation?.doctor?.firstName} ${row.consultation?.doctor?.lastName}`,
    },
    { 
      field: 'medicaments', 
      headerName: 'Médicaments', 
      flex: 1.5,
      minWidth: 160,
      valueGetter: (_value: any, row: any) => row.medicaments?.map((m: any) => m.nom).join(', '),
    },
    {
      field: 'pharmacien',
      headerName: 'Pharmacie',
      flex: 1,
      minWidth: 130,
      valueGetter: (_value: any, row: any) =>
        row.pharmacien ? `${row.pharmacien.firstName} ${row.pharmacien.lastName}` : '—',
    },
    {
      field: 'status',
      headerName: 'Statut',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={params.value === OrdonnanceStatus.DELIVREE ? 'success' : 'warning'}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton size="small" color="primary" onClick={() => handleOpenView(params.row)} title="Voir la feuille d'ordonnance">
            <Visibility fontSize="small" />
          </IconButton>
          <IconButton size="small" color="secondary" onClick={() => { handleOpenView(params.row); setTimeout(handlePrintSheet, 500); }} title="Imprimer">
            <Print fontSize="small" />
          </IconButton>
          {user?.role === UserRole.PHARMACIEN && params.row.status === OrdonnanceStatus.EN_ATTENTE && (
            <Button size="small" onClick={() => handleDelivrer(params.row.id)}>Délivrer</Button>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Ordonnances</Typography>
        {user?.role === UserRole.MEDECIN && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
            Nouvelle Ordonnance
          </Button>
        )}
      </Box>

      {/* Affichage pour pharmacien: ordonnances assignées */}
      {user?.role === UserRole.PHARMACIEN && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight="bold">Ordonnances qui vous sont assignées</Typography>
          <Typography variant="caption">Vous pouvez voir et imprimer les ordonnances qui vous ont été attribuées par les médecins.</Typography>
        </Alert>
      )}

      <Card>
        <DataGrid rows={ordonnances} columns={columns} autoHeight pageSizeOptions={[10, 20, 50]} />
      </Card>

      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalPharmacy color="primary" />
            Feuille d'Ordonnance
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {selectedPdfUrl && (
              <IconButton size="small" color="primary" href={selectedPdfUrl} target="_blank" title="Voir PDF backend">
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
          {viewOrdonnance && (
            <Box ref={printRef}>
              <OrdonnanceView ordonnance={viewOrdonnance} />
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Nouvelle Ordonnance
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

          {/* ── Pharmacie selection ── */}
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <LocalPharmacy color="primary" />
            <Typography variant="subtitle1" fontWeight={600}>Pharmacie (optionnel)</Typography>
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
              setFormData((f) => ({ ...f, pharmacienId: '' }));
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
              onChange={(e) => { setSelectedVille(e.target.value); setFormData((f) => ({ ...f, pharmacienId: '' })); }}
              margin="dense"
            >
              <MenuItem value=""><em>— Toutes les villes —</em></MenuItem>
              {citiesForCountry.map((c) => (
                <MenuItem key={`${c.name}-${(c as any).stateCode ?? ''}`} value={c.name}>{c.name}</MenuItem>
              ))}
            </TextField>
          )}

          {/* Étape 3 — Pharmaciens inscrits sur la plateforme */}
          {selectedCountryName && (
            <Box sx={{ mt: 1.5 }}>
              {filteredPharmaciens.length === 0 ? (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Aucune pharmacie inscrite pour {[selectedVille, selectedCountryName].filter(Boolean).join(', ')}
                </Alert>
              ) : (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    {filteredPharmaciens.length} pharmacie(s) inscrite(s) sur la plateforme
                  </Typography>
                  {filteredPharmaciens.map((p) => (
                    <Box
                      key={p.id}
                      onClick={() => setFormData((f) => ({ ...f, pharmacienId: f.pharmacienId === p.id ? '' : p.id }))}
                      sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        p: 1.5, mb: 1, borderRadius: 2, cursor: 'pointer', border: '2px solid',
                        borderColor: formData.pharmacienId === p.id ? 'primary.main' : 'divider',
                        bgcolor: formData.pharmacienId === p.id ? 'primary.50' : 'background.paper',
                        '&:hover': { borderColor: 'primary.light', bgcolor: 'action.hover' },
                        transition: 'all .15s',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <LocalPharmacy color={formData.pharmacienId === p.id ? 'primary' : 'disabled'} />
                        <Box>
                          <Typography variant="body2" fontWeight={700}>
                            {p.firstName} {p.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            📍 {[p.address, p.ville, p.pays].filter(Boolean).join(', ') || 'Adresse non renseignée'}
                          </Typography>
                          {p.phone && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              📞 {p.phone}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      {formData.pharmacienId === p.id && <CheckCircle color="primary" fontSize="small" />}
                    </Box>
                  ))}
                </>
              )}
            </Box>
          )}

          {formData.pharmacienId && (
            <Button
              size="small" color="inherit"
              sx={{ mt: 0.5, mb: 1, color: 'text.secondary', textTransform: 'none' }}
              onClick={() => setFormData((f) => ({ ...f, pharmacienId: '' }))}
            >
              ✕ Retirer la sélection de pharmacie
            </Button>
          )}
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>Médicaments</Typography>
          {formData.medicaments.map((med, index) => (
            <Card key={index} sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">Médicament {index + 1}</Typography>
                {formData.medicaments.length > 1 && (
                  <IconButton size="small" onClick={() => removeMedicament(index)}>
                    <Delete />
                  </IconButton>
                )}
              </Box>
              <TextField
                fullWidth
                label="Nom"
                value={med.nom}
                onChange={(e) => updateMedicament(index, 'nom', e.target.value)}
                margin="dense"
              />
              <TextField
                fullWidth
                label="Dosage"
                value={med.dosage}
                onChange={(e) => updateMedicament(index, 'dosage', e.target.value)}
                margin="dense"
              />
              <TextField
                fullWidth
                label="Fréquence"
                value={med.frequence}
                onChange={(e) => updateMedicament(index, 'frequence', e.target.value)}
                margin="dense"
              />
              <TextField
                fullWidth
                label="Durée"
                value={med.duree}
                onChange={(e) => updateMedicament(index, 'duree', e.target.value)}
                margin="dense"
              />
            </Card>
          ))}
          <Button onClick={addMedicament} sx={{ mb: 2 }}>+ Ajouter médicament</Button>
          <Button fullWidth variant="contained" onClick={handleCreate}>
            Créer Ordonnance
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}