import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Typography, Dialog, DialogTitle, DialogContent, TextField,
  Paper, Chip, Divider, Avatar, IconButton, Tabs, Tab, Alert, CircularProgress, Collapse,
  Grid, InputAdornment, Autocomplete, MenuItem,
} from '@mui/material';
import {
  Add, PictureAsPdf, Visibility, EventAvailable, PersonAdd,
  AccessTime, CalendarToday, LocalPharmacy, Science, Delete,
  Email, Badge, Phone, LocationOn, Lock, VisibilityOff, Close,
} from '@mui/icons-material';
import { Country, City } from 'country-state-city';
import { isValidPhoneNumber, AsYouType } from 'libphonenumber-js';
import { useAuth } from '../../context/AuthContext';
import { useEffect as useEffectPharma, useState as useStatePharma } from 'react';
import { UserRole } from '../../types/user.types';
import { ConsultationWithDetails } from '../../types/dossier.types';
import { OrdonnanceStatus } from '../../types/ordonnance.types';
import { AnalyseStatus } from '../../types/analyse.types';
import api from '../../config/api';
import { toast } from '../../utils/toast';
import { ToastMessages } from '../../utils/toastMessages';

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getOrdonnanceChipColor(status: string): 'warning' | 'success' | 'error' | 'default' {
  switch (status) {
    case OrdonnanceStatus.EN_ATTENTE: return 'warning';
    case OrdonnanceStatus.DELIVREE: return 'success';
    case OrdonnanceStatus.ANNULEE: return 'error';
    default: return 'default';
  }
}

function getAnalyseChipColor(status: string): 'warning' | 'success' | 'info' | 'default' {
  switch (status) {
    case AnalyseStatus.EN_ATTENTE: return 'warning';
    case AnalyseStatus.EN_COURS: return 'info';
    case AnalyseStatus.TERMINEE: return 'success';
    default: return 'default';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'en_attente': return 'en attente';
    case 'delivree': return 'délivrée';
    case 'annulee': return 'annulée';
    case 'en_cours': return 'en cours';
    case 'terminee': return 'délivrée';
    default: return status;
  }
}

export default function Consultations() {
  // Pharmaciens pour affichage pharmacie assignée
  const [pharmaciens, setPharmaciens] = useStatePharma<any[]>([]);
  // Laboratoires pour affichage labo assigné
  const [laboratoires, setLaboratoires] = useStatePharma<any[]>([]);
  useEffectPharma(() => {
    api.get('/users/pharmaciens').then(({ data }) => setPharmaciens(data.data || data || [])).catch(() => setPharmaciens([]));
    api.get('/users/laboratoires').then(({ data }) => setLaboratoires(data.data || data || [])).catch(() => setLaboratoires([]));
  }, []);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState<ConsultationWithDetails[]>([]);
  const [open, setOpen] = useState(false);
  const [myPatients, setMyPatients] = useState<any[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [dialogTab, setDialogTab] = useState(0);
  const [creating, setCreating] = useState(false);

  // Tab 0 (RDV)
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

  // Tab 1 (Walk-in)
  const [selectedWalkInPatient, setSelectedWalkInPatient] = useState<any>(null);
  const [walkInMode, setWalkInMode] = useState<'select' | 'new'>('select');
  const [newPatientData, setNewPatientData] = useState({
    firstName: '', lastName: '', phone: '', email: '', password: 'SihaLab123!',
    address: '', ville: '', pays: '',
  });
  const [newPatCountryIso, setNewPatCountryIso] = useState('');
  const [newPatPhoneError, setNewPatPhoneError] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);

  const allCountries = useMemo(() => Country.getAllCountries(), []);
  const newPatCities = useMemo(
    () => newPatCountryIso ? (City.getCitiesOfCountry(newPatCountryIso) ?? []) : [],
    [newPatCountryIso]
  );
  const newPatSelectedCountry = useMemo(
    () => allCountries.find(c => c.isoCode === newPatCountryIso) ?? null,
    [allCountries, newPatCountryIso]
  );

  // Common consultation form
  const [formData, setFormData] = useState({ motif: '', diagnostic: '', notes: '' });

  // Location selection for pharmacy/lab
  const [pharmaciePays, setPharmaciePays] = useState('');
  const [pharmacieVille, setPharmacieVille] = useState('');
  const [selectedPharmacieId, setSelectedPharmacieId] = useState('');
  
  const [laboPays, setLaboPays] = useState('');
  const [laboVille, setLaboVille] = useState('');
  const [selectedLaboId, setSelectedLaboId] = useState('');

  // Country/City data using country-state-city library
  const [pharmacieCountryIso, setPharmacieCountryIso] = useState('');
  const [laboCountryIso, setLaboCountryIso] = useState('');

  const pharmacieCities = useMemo(
    () => pharmacieCountryIso ? (City.getCitiesOfCountry(pharmacieCountryIso) ?? []) : [],
    [pharmacieCountryIso]
  );

  const laboCities = useMemo(
    () => laboCountryIso ? (City.getCitiesOfCountry(laboCountryIso) ?? []) : [],
    [laboCountryIso]
  );

  // Filtered pharmacies and labs based on location
  const filteredPharmacies = useMemo(() => {
    if (!pharmaciePays || !pharmacieVille) return [];
    return pharmaciens.filter(p => p.pays === pharmaciePays && p.ville === pharmacieVille);
  }, [pharmaciens, pharmaciePays, pharmacieVille]);

  const filteredLaboratoires = useMemo(() => {
    if (!laboPays || !laboVille) return [];
    return laboratoires.filter(l => l.pays === laboPays && l.ville === laboVille);
  }, [laboratoires, laboPays, laboVille]);

  // Ordonnance
  const [addOrdonnance, setAddOrdonnance] = useState(false);
  const [medicaments, setMedicaments] = useState([{ nom: '', dosage: '', frequence: '', duree: '' }]);

  // Analyse
  const [addAnalyse, setAddAnalyse] = useState(false);
  const [analyseDescriptions, setAnalyseDescriptions] = useState(['']);

  const isDoctorOrInfirmier = user?.role === UserRole.MEDECIN || user?.role === UserRole.INFIRMIER;

  useEffect(() => {
    loadConsultations();
    if (isDoctorOrInfirmier) {
      loadMyPatients();
      loadTodayAppointments();
    }
  }, []);

  const loadConsultations = async () => {
    try {
      const { data } = await api.get('/consultations');
      setConsultations(data);
    } catch { toast.error(ToastMessages.consultations.loadError); }
  };

  const loadMyPatients = async () => {
    try {
      const { data } = await api.get('/consultations/my-patients');
      setMyPatients(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const loadTodayAppointments = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await api.get(`/appointments?date=${today}`);
      const pending = (Array.isArray(data) ? data : []).filter(
        (apt: any) => apt.status === 'en_attente' || apt.status === 'confirme'
      );
      setTodayAppointments(pending);
    } catch (e) { console.error(e); }
  };

  const resetDialog = () => {
    setSelectedAppointment(null);
    setSelectedWalkInPatient(null);
    setWalkInMode('select');
    setNewPatientData({ firstName: '', lastName: '', phone: '', email: '', password: 'SihaLab123!', address: '', ville: '', pays: '' });
    setNewPatCountryIso('');
    setNewPatPhoneError('');
    setShowNewPwd(false);
    setFormData({ motif: '', diagnostic: '', notes: '' });
    setPharmaciePays('');
    setPharmacieVille('');
    setPharmacieCountryIso('');
    setSelectedPharmacieId('');
    setLaboPays('');
    setLaboVille('');
    setLaboCountryIso('');
    setSelectedLaboId('');
    setAddOrdonnance(false);
    setMedicaments([{ nom: '', dosage: '', frequence: '', duree: '' }]);
    setAddAnalyse(false);
    setAnalyseDescriptions(['']);
  };

  const isPatientSelected = () => {
    if (dialogTab === 0) return !!selectedAppointment;
    if (walkInMode === 'select') return !!selectedWalkInPatient;
    return !!(newPatientData.firstName && newPatientData.lastName && newPatientData.email);
  };

  const getPatientLabel = () => {
    if (dialogTab === 0 && selectedAppointment)
      return `${selectedAppointment.patient?.firstName} ${selectedAppointment.patient?.lastName}`;
    if (walkInMode === 'select' && selectedWalkInPatient)
      return `${selectedWalkInPatient.firstName} ${selectedWalkInPatient.lastName}`;
    if (walkInMode === 'new' && newPatientData.firstName)
      return `${newPatientData.firstName} ${newPatientData.lastName} (nouveau)`;
    return '';
  };

  const updateMed = (idx: number, field: string, value: string) =>
    setMedicaments(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));

  const handleCreate = async () => {
    if (!formData.motif.trim()) { toast.error(ToastMessages.consultations.motifRequired); return; }
    setCreating(true);
    try {
      let patientId = '';
      if (dialogTab === 0) {
        patientId = selectedAppointment?.patientId || selectedAppointment?.patient?.id || '';
      } else if (walkInMode === 'select') {
        patientId = selectedWalkInPatient?.id || '';
      } else {
        const { data: newPat } = await api.post('/users/create-patient', { ...newPatientData, role: 'patient' });
        patientId = newPat.id;
      }
      if (!patientId) { toast.error(ToastMessages.consultations.noPatientSelected); return; }

      const payload: any = { patientId, ...formData };
      if (dialogTab === 0 && selectedAppointment) payload.appointmentId = selectedAppointment.id;

      const { data: newC } = await api.post('/consultations', payload);
      const consultationId = newC.id;

      if (addOrdonnance) {
        const validMeds = medicaments.filter(m => m.nom.trim());
        if (validMeds.length > 0) {
          const ordPayload: any = { consultationId, medicaments: validMeds };
          if (selectedPharmacieId) ordPayload.pharmacienId = selectedPharmacieId;
          await api.post('/ordonnances', ordPayload);
        }
      }
      if (addAnalyse) {
        for (const desc of analyseDescriptions.filter(d => d.trim())) {
          const analysePayload: any = { consultationId, description: desc };
          if (selectedLaboId) analysePayload.labId = selectedLaboId;
          await api.post('/analyses', analysePayload);
        }
      }

      toast.success(ToastMessages.consultations.createSuccess);
      setOpen(false);
      resetDialog();
      navigate(`/consultations/${consultationId}`);
    } catch (error: any) {
      toast.error(ToastMessages.consultations.createError(error.response?.data?.message));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Mes Consultations</Typography>
        {(user?.role === UserRole.MEDECIN || user?.role === UserRole.INFIRMIER) && (
          <Button variant="contained" startIcon={<Add />} onClick={() => { resetDialog(); setDialogTab(0); setOpen(true); loadTodayAppointments(); }}>
            Nouvelle Consultation
          </Button>
        )}
      </Box>

      {consultations.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <Typography color="text.secondary">Aucune consultation enregistrée.</Typography>
        </Paper>
      ) : (
        consultations.map((c) => (
          <Paper
            key={c.id}
            variant="outlined"
            sx={{ p: 3, mb: 2, borderRadius: 2 }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              {/* Left content */}
              <Box sx={{ flex: 1 }}>
                {/* Patient name */}
                <Typography variant="subtitle1" fontWeight="bold">
                  {c.patient?.firstName} {c.patient?.lastName}
                </Typography>
                {/* Date + Status */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(c.date)}
                  </Typography>
                  <Chip
                    label={(c as any).status === 'terminee' ? 'Terminée' : (c as any).status === 'annulee' ? 'Annulée' : 'En cours'}
                    size="small"
                    color={(c as any).status === 'terminee' ? 'success' : (c as any).status === 'annulee' ? 'error' : 'warning'}
                    sx={{ fontWeight: 'bold', fontSize: '0.7rem', height: 22 }}
                  />
                </Box>

                {/* Diagnostic */}
                {c.diagnostic && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" component="span" fontWeight="bold" color="error.main">
                      Diagnostic:{' '}
                    </Typography>
                    <Typography variant="body2" component="span">
                      {c.diagnostic}
                    </Typography>
                  </Box>
                )}

                {/* Notes */}
                {c.notes && (
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="body2" component="span" fontWeight="bold">
                      Notes:{' '}
                    </Typography>
                    <Typography variant="body2" component="span">
                      {c.notes}
                    </Typography>
                  </Box>
                )}

                {/* Ordonnances chips */}
                {c.ordonnances && c.ordonnances.length > 0 && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
                      Ordonnances:
                    </Typography>
                    {c.ordonnances.map((o: any, idx: number) => (
                      <Box key={o.id} sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Chip
                            label={`#${idx + 1} - ${getStatusLabel(o.status)}`}
                            size="small"
                            color={getOrdonnanceChipColor(o.status)}
                          />
                          {/* Affichage pharmacie assignée */}
                          {o.pharmacienId && (() => {
                            const ph = o.pharmacien || pharmaciens.find((p) => p.id === o.pharmacienId);
                            if (!ph) return null;
                            return (
                              <Box sx={{
                                bgcolor: '#f0f9ff',
                                border: '1px solid #3b82f6',
                                p: 1.5,
                                borderRadius: 1.5,
                                ml: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5
                              }}>
                                <LocalPharmacy sx={{ color: '#3b82f6', fontSize: 20 }} />
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="caption" sx={{ color: '#3b82f6', fontWeight: 700, display: 'block', mb: 0.3 }}>
                                    Pharmacie assignée
                                  </Typography>
                                  <Typography variant="body2" fontWeight={600} sx={{ color: '#1e293b' }}>
                                    {ph.firstName} {ph.lastName}
                                  </Typography>
                                  {ph.phone && (
                                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                      📞 {ph.phone}
                                    </Typography>
                                  )}
                                  {ph.address && (
                                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                      📍 {ph.address}
                                      {ph.ville && `, ${ph.ville}`}
                                      {ph.pays && `, ${ph.pays}`}
                                    </Typography>
                                  )}
                                </Box>
                                {/* PDF preview button inside pharmacy box */}
                                {o.pdfUrl && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    startIcon={<Visibility />}
                                    href={o.pdfUrl}
                                    target="_blank"
                                    sx={{ textTransform: 'none', fontSize: '0.7rem', whiteSpace: 'nowrap' }}
                                  >
                                    Voir PDF
                                  </Button>
                                )}
                              </Box>
                            );
                          })()}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* Analyses chips */}
                {c.analyses && c.analyses.length > 0 && (
                  <Box>
                    <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
                      Analyses:
                    </Typography>
                    {c.analyses.map((a: any, idx: number) => (
                      <Box key={a.id} sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Chip
                            label={`#${idx + 1} - ${getStatusLabel(a.status)}`}
                            size="small"
                            color={getAnalyseChipColor(a.status)}
                          />
                          {/* Affichage laboratoire assigné */}
                          {a.labId && (() => {
                            const lab = a.laboratoire || laboratoires.find((l) => l.id === a.labId);
                            if (!lab) return null;
                            return (
                              <Box sx={{
                                bgcolor: '#f0fdf4',
                                border: '1px solid #22c55e',
                                p: 1.5,
                                borderRadius: 1.5,
                                ml: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5
                              }}>
                                <Science sx={{ color: '#22c55e', fontSize: 20 }} />
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="caption" sx={{ color: '#22c55e', fontWeight: 700, display: 'block', mb: 0.3 }}>
                                    Laboratoire assigné
                                  </Typography>
                                  <Typography variant="body2" fontWeight={600} sx={{ color: '#1e293b' }}>
                                    {lab.firstName} {lab.lastName}
                                  </Typography>
                                  {lab.phone && (
                                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                      📞 {lab.phone}
                                    </Typography>
                                  )}
                                  {lab.address && (
                                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                      📍 {lab.address}
                                      {lab.ville && `, ${lab.ville}`}
                                      {lab.pays && `, ${lab.pays}`}
                                    </Typography>
                                  )}
                                </Box>
                                {/* PDF preview button inside lab box */}
                                {a.pdfUrl && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="success"
                                    startIcon={<Visibility />}
                                    href={a.pdfUrl}
                                    target="_blank"
                                    sx={{ textTransform: 'none', fontSize: '0.7rem', whiteSpace: 'nowrap' }}
                                  >
                                    Voir PDF
                                  </Button>
                                )}
                              </Box>
                            );
                          })()}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>

              {/* Right: DÉTAILS button */}
              {isDoctorOrInfirmier && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate(`/consultations/${c.id}`)}
                  sx={{ ml: 2, whiteSpace: 'nowrap', textTransform: 'uppercase', fontWeight: 'bold' }}
                >
                  Détails
                </Button>
              )}
            </Box>

            {/* PDF links */}
            {((c as any).ordonnancePdfUrl || (c as any).analysePdfUrl) && (
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5, pt: 1.5, borderTop: '1px dashed #e0e0e0', flexWrap: 'wrap' }}>
                <PictureAsPdf sx={{ color: '#d32f2f', fontSize: 20, mt: 0.25 }} />
                <Typography variant="body2" fontWeight="bold" sx={{ mr: 1, lineHeight: '28px' }}>PDF :</Typography>
                {(c as any).ordonnancePdfUrl && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Visibility />}
                    href={(c as any).ordonnancePdfUrl}
                    target="_blank"
                    sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                  >
                    Ordonnance
                  </Button>
                )}
                {(c as any).analysePdfUrl && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="info"
                    startIcon={<Visibility />}
                    href={(c as any).analysePdfUrl}
                    target="_blank"
                    sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                  >
                    Analyses
                  </Button>
                )}
              </Box>
            )}
          </Paper>
        ))
      )}

      {/* ── Dialog Nouvelle Consultation ── */}
      <Dialog open={open} onClose={() => { if (!creating) setOpen(false); }} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight="bold">Nouvelle Consultation</Typography>
          <IconButton onClick={() => { if (!creating) setOpen(false); }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Tabs
            value={dialogTab}
            onChange={(_, v) => { resetDialog(); setDialogTab(v); }}
            sx={{ mb: 2, mt: 1 }}
          >
            <Tab icon={<EventAvailable />} iconPosition="start" label="Patients avec RDV" sx={{ textTransform: 'none', fontWeight: 'bold' }} />
            <Tab icon={<PersonAdd />} iconPosition="start" label="Sans RDV / Urgente" sx={{ textTransform: 'none', fontWeight: 'bold' }} />
          </Tabs>

          {/* ── Tab 0: today's appointments ── */}
          {dialogTab === 0 && (
            <>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                <CalendarToday sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                Rendez-vous du jour — cliquez pour sélectionner le patient
              </Typography>
              {todayAppointments.length === 0 ? (
                <Alert severity="info" sx={{ mb: 2 }}>Aucun rendez-vous pour aujourd'hui. Utilisez l'onglet "Sans RDV" pour les consultations urgentes.</Alert>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2, maxHeight: 240, overflowY: 'auto' }}>
                  {todayAppointments.map((apt) => (
                    <Paper
                      key={apt.id}
                      variant="outlined"
                      onClick={() => { setSelectedAppointment(apt); setFormData(f => ({ ...f, motif: apt.motif || '' })); }}
                      sx={{
                        p: 1.5, borderRadius: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2,
                        border: selectedAppointment?.id === apt.id ? '2px solid #1976d2' : '1px solid #e0e0e0',
                        bgcolor: selectedAppointment?.id === apt.id ? '#e3f2fd' : 'transparent',
                        transition: 'all 0.15s', '&:hover': { bgcolor: '#f5f5f5', borderColor: '#90caf9' },
                      }}
                    >
                      <Avatar sx={{ bgcolor: selectedAppointment?.id === apt.id ? '#1976d2' : '#9e9e9e', width: 38, height: 38 }}>
                        {(apt.patient?.firstName?.[0] || '?').toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" fontWeight="bold">{apt.patient?.firstName} {apt.patient?.lastName}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AccessTime sx={{ fontSize: 13, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">{apt.time?.substring(0, 5)} — {apt.motif || 'Pas de motif'}</Typography>
                        </Box>
                      </Box>
                      <Chip label={apt.status === 'confirme' ? 'Confirmé' : 'En attente'} size="small" color={apt.status === 'confirme' ? 'success' : 'warning'} sx={{ fontWeight: 'bold' }} />
                    </Paper>
                  ))}
                </Box>
              )}
            </>
          )}

          {/* ── Tab 1: Walk-in / Urgent ── */}
          {dialogTab === 1 && (
            <>
              {/* Toggle: existing patient OR new patient */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button
                  size="small"
                  variant={walkInMode === 'select' ? 'contained' : 'outlined'}
                  onClick={() => { setWalkInMode('select'); setSelectedWalkInPatient(null); }}
                  sx={{ textTransform: 'none', fontWeight: 'bold' }}
                >
                  Patient déjà suivi
                </Button>
                <Button
                  size="small"
                  variant={walkInMode === 'new' ? 'contained' : 'outlined'}
                  color="success"
                  onClick={() => { setWalkInMode('new'); setSelectedWalkInPatient(null); }}
                  sx={{ textTransform: 'none', fontWeight: 'bold' }}
                >
                  Nouveau patient
                </Button>
              </Box>

              {/* Select from doctor's existing patients */}
              {walkInMode === 'select' && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Patients déjà suivis par ce médecin</Typography>
                  {myPatients.length === 0 ? (
                    <Alert severity="info" sx={{ mb: 1.5 }}>Aucun patient enregistré. Cliquez sur "Nouveau patient" pour en ajouter un.</Alert>
                  ) : (
                    <Box sx={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1, mb: 1.5 }}>
                      {myPatients.map((p) => (
                        <Paper
                          key={p.id}
                          variant="outlined"
                          onClick={() => setSelectedWalkInPatient(selectedWalkInPatient?.id === p.id ? null : p)}
                          sx={{
                            p: 1.5, borderRadius: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2,
                            border: selectedWalkInPatient?.id === p.id ? '2px solid #1976d2' : '1px solid #e0e0e0',
                            bgcolor: selectedWalkInPatient?.id === p.id ? '#e3f2fd' : 'transparent',
                            transition: 'all 0.15s', '&:hover': { bgcolor: '#f5f5f5' },
                          }}
                        >
                          <Avatar sx={{ bgcolor: selectedWalkInPatient?.id === p.id ? '#1976d2' : '#9e9e9e', width: 36, height: 36 }}>
                            {(p.firstName?.[0] || '?').toUpperCase()}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold">{p.firstName} {p.lastName}</Typography>
                            {p.phone && <Typography variant="caption" color="text.secondary">{p.phone}</Typography>}
                          </Box>
                          {selectedWalkInPatient?.id === p.id && <Chip label="Sélectionné" size="small" color="primary" sx={{ fontWeight: 'bold' }} />}
                        </Paper>
                      ))}
                    </Box>
                  )}
                  <Divider sx={{ my: 1 }}>
                    <Typography variant="caption" color="text.secondary">Patient non trouvé ?</Typography>
                  </Divider>
                  <Button size="small" variant="text" color="success" startIcon={<PersonAdd />} onClick={() => setWalkInMode('new')}>
                    Enregistrer un nouveau patient
                  </Button>
                </>
              )}

              {/* New patient form */}
              {walkInMode === 'new' && (
                <>
                  <Alert severity="success" sx={{ mb: 2 }}>Remplissez les informations du nouveau patient</Alert>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Prénom" required size="small"
                        value={newPatientData.firstName}
                        onChange={(e) => setNewPatientData(p => ({ ...p, firstName: e.target.value }))}
                        InputProps={{ startAdornment: <InputAdornment position="start"><Badge fontSize="small" color="action" /></InputAdornment> }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Nom" required size="small"
                        value={newPatientData.lastName}
                        onChange={(e) => setNewPatientData(p => ({ ...p, lastName: e.target.value }))}
                        InputProps={{ startAdornment: <InputAdornment position="start"><Badge fontSize="small" color="action" /></InputAdornment> }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth label="Adresse Email" type="email" required size="small"
                        value={newPatientData.email}
                        onChange={(e) => setNewPatientData(p => ({ ...p, email: e.target.value }))}
                        InputProps={{ startAdornment: <InputAdornment position="start"><Email fontSize="small" color="action" /></InputAdornment> }}
                      />
                    </Grid>
                    {/* Pays */}
                    <Grid item xs={12} sm={6}>
                      <Autocomplete
                        options={allCountries}
                        getOptionLabel={(opt) => `${opt.flag ?? ''} ${opt.name}`}
                        isOptionEqualToValue={(opt, val) => opt.isoCode === val.isoCode}
                        value={allCountries.find(c => c.isoCode === newPatCountryIso) ?? null}
                        onChange={(_, country) => {
                          const iso = country?.isoCode ?? '';
                          const name = country?.name ?? '';
                          setNewPatCountryIso(iso);
                          setNewPatientData(p => ({ ...p, pays: name, ville: '', phone: '' }));
                          setNewPatPhoneError('');
                        }}
                        renderInput={(params) => <TextField {...params} label="Pays" required size="small" />}
                      />
                    </Grid>
                    {/* Ville */}
                    <Grid item xs={12} sm={6}>
                      {newPatCities.length > 0 ? (
                        <TextField select fullWidth label="Ville" required size="small"
                          value={newPatientData.ville}
                          onChange={(e) => setNewPatientData(p => ({ ...p, ville: e.target.value }))}
                          InputProps={{ startAdornment: <InputAdornment position="start"><LocationOn fontSize="small" color="action" /></InputAdornment> }}
                        >
                          {newPatCities.map((c) => (
                            <MenuItem key={`${c.name}-${(c as any).stateCode ?? ''}`} value={c.name}>{c.name}</MenuItem>
                          ))}
                        </TextField>
                      ) : (
                        <TextField fullWidth label="Ville" required size="small"
                          value={newPatientData.ville}
                          onChange={(e) => setNewPatientData(p => ({ ...p, ville: e.target.value }))}
                          helperText={!newPatCountryIso ? "Sélectionnez d'abord un pays" : ''}
                          InputProps={{ startAdornment: <InputAdornment position="start"><LocationOn fontSize="small" color="action" /></InputAdornment> }}
                        />
                      )}
                    </Grid>
                    {/* Téléphone */}
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Téléphone" required size="small"
                        value={newPatientData.phone}
                        onChange={(e) => {
                          const formatted = newPatCountryIso ? new AsYouType(newPatCountryIso as any).input(e.target.value) : e.target.value;
                          setNewPatientData(p => ({ ...p, phone: formatted }));
                          if (!formatted) { setNewPatPhoneError(''); return; }
                          if (newPatCountryIso) {
                            setNewPatPhoneError(isValidPhoneNumber(formatted, newPatCountryIso as any) ? '' : `Numéro invalide pour ${newPatSelectedCountry?.name ?? 'ce pays'}`);
                          }
                        }}
                        error={!!newPatPhoneError}
                        helperText={newPatPhoneError || (newPatSelectedCountry?.phonecode ? `Indicatif : +${newPatSelectedCountry.phonecode}` : 'Sélectionnez un pays')}
                        placeholder={newPatSelectedCountry ? `+${newPatSelectedCountry.phonecode} ...` : '+...'}
                        InputProps={{ startAdornment: <InputAdornment position="start"><Phone fontSize="small" color={newPatPhoneError ? 'error' : 'action'} /></InputAdornment> }}
                      />
                    </Grid>
                    {/* Mot de passe */}
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Mot de passe" required size="small"
                        type={showNewPwd ? 'text' : 'password'}
                        value={newPatientData.password}
                        onChange={(e) => setNewPatientData(p => ({ ...p, password: e.target.value }))}
                        InputProps={{
                          startAdornment: <InputAdornment position="start"><Lock fontSize="small" color="action" /></InputAdornment>,
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton size="small" onClick={() => setShowNewPwd(v => !v)} edge="end">
                                {showNewPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        helperText="Défaut : SihaLab123!"
                      />
                    </Grid>
                    {/* Adresse */}
                    <Grid item xs={12}>
                      <TextField fullWidth label="Adresse postale complète" required size="small"
                        value={newPatientData.address}
                        onChange={(e) => setNewPatientData(p => ({ ...p, address: e.target.value }))}
                        InputProps={{ startAdornment: <InputAdornment position="start"><LocationOn fontSize="small" color="action" /></InputAdornment> }}
                      />
                    </Grid>
                  </Grid>
                  <Button size="small" variant="text" onClick={() => setWalkInMode('select')} sx={{ mt: 1 }}>
                    ← Retour à la liste
                  </Button>
                </>
              )}
            </>
          )}

          {/* ── Common fields after patient is selected ── */}
          {isPatientSelected() && (
            <>
              <Divider sx={{ my: 2 }} />
              <Alert severity="success" sx={{ mb: 2 }}>
                Patient : <strong>{getPatientLabel()}</strong>
              </Alert>

              <TextField fullWidth label="Motif *" value={formData.motif} onChange={(e) => setFormData(f => ({ ...f, motif: e.target.value }))} margin="dense" multiline rows={2} />
              <TextField fullWidth label="Diagnostic" value={formData.diagnostic} onChange={(e) => setFormData(f => ({ ...f, diagnostic: e.target.value }))} margin="dense" multiline rows={2} />
              <TextField fullWidth label="Notes" value={formData.notes} onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))} margin="dense" multiline rows={2} />

              {/* ── Ordonnance section ── */}
              <Paper variant="outlined" sx={{ p: 2, mt: 2, borderRadius: 2, bgcolor: '#fffde7', border: '1px solid #ffe082' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocalPharmacy color="warning" />
                    <Typography fontWeight="bold" color="warning.dark">Ordonnance</Typography>
                  </Box>
                  <Button
                    size="small"
                    variant={addOrdonnance ? 'contained' : 'outlined'}
                    color="warning"
                    onClick={() => setAddOrdonnance(!addOrdonnance)}
                    sx={{ textTransform: 'none', fontWeight: 'bold' }}
                  >
                    {addOrdonnance ? 'Retirer' : 'Ajouter une ordonnance'}
                  </Button>
                </Box>
                <Collapse in={addOrdonnance}>
                  <Divider sx={{ my: 1.5 }} />
                  {medicaments.map((med, idx) => (
                    <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 1, mb: 1, alignItems: 'center' }}>
                      <TextField label="Médicament" value={med.nom} onChange={(e) => updateMed(idx, 'nom', e.target.value)} size="small" placeholder="ex: Paracetamol" />
                      <TextField label="Dosage" value={med.dosage} onChange={(e) => updateMed(idx, 'dosage', e.target.value)} size="small" placeholder="500mg" />
                      <TextField label="Fréquence" value={med.frequence} onChange={(e) => updateMed(idx, 'frequence', e.target.value)} size="small" placeholder="3x/jour" />
                      <TextField label="Durée" value={med.duree} onChange={(e) => updateMed(idx, 'duree', e.target.value)} size="small" placeholder="7 jours" />
                      <IconButton size="small" color="error" onClick={() => setMedicaments(prev => prev.filter((_, i) => i !== idx))} disabled={medicaments.length === 1}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                  <Button size="small" startIcon={<Add />} onClick={() => setMedicaments(prev => [...prev, { nom: '', dosage: '', frequence: '', duree: '' }])} sx={{ mt: 0.5 }}>
                    Ajouter un médicament
                  </Button>
                </Collapse>
              </Paper>

              {/* ── Analyse section ── */}
              <Paper variant="outlined" sx={{ p: 2, mt: 1.5, borderRadius: 2, bgcolor: '#e3f2fd', border: '1px solid #90caf9' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Science color="info" />
                    <Typography fontWeight="bold" color="info.dark">Analyses</Typography>
                  </Box>
                  <Button
                    size="small"
                    variant={addAnalyse ? 'contained' : 'outlined'}
                    color="info"
                    onClick={() => setAddAnalyse(!addAnalyse)}
                    sx={{ textTransform: 'none', fontWeight: 'bold' }}
                  >
                    {addAnalyse ? 'Retirer' : 'Ajouter des analyses'}
                  </Button>
                </Box>
                <Collapse in={addAnalyse}>
                  <Divider sx={{ my: 1.5 }} />
                  {analyseDescriptions.map((desc, idx) => (
                    <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                      <TextField
                        fullWidth
                        label={`Analyse ${idx + 1}`}
                        value={desc}
                        onChange={(e) => setAnalyseDescriptions(prev => prev.map((d, i) => i === idx ? e.target.value : d))}
                        size="small"
                        placeholder="ex: Numération formule sanguine"
                      />
                      <IconButton size="small" color="error" onClick={() => setAnalyseDescriptions(prev => prev.filter((_, i) => i !== idx))} disabled={analyseDescriptions.length === 1}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                  <Button size="small" startIcon={<Add />} onClick={() => setAnalyseDescriptions(prev => [...prev, ''])} sx={{ mt: 0.5 }}>
                    Ajouter une analyse
                  </Button>
                </Collapse>
              </Paper>

              {/* ── Location & Assignment section ── */}
              {(addOrdonnance || addAnalyse) && (
                <Paper variant="outlined" sx={{ p: 2, mt: 1.5, borderRadius: 2, bgcolor: '#fef3c7', border: '1px solid #fbbf24' }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <LocationOn fontSize="small" color="warning" />
                    Localisation et Attribution
                  </Typography>
                  
                  {/* Pharmacie Section */}
                  {addOrdonnance && (
                    <>
                      <Divider sx={{ mb: 2 }}>
                        <Chip icon={<LocalPharmacy />} label="Pharmacie" color="primary" size="small" />
                      </Divider>
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        {/* Pays Pharmacie */}
                        <Grid item xs={12} sm={6}>
                          <Autocomplete
                            options={allCountries}
                            getOptionLabel={(opt) => `${opt.flag ?? ''} ${opt.name}`}
                            isOptionEqualToValue={(opt, val) => opt.isoCode === val.isoCode}
                            value={allCountries.find(c => c.isoCode === pharmacieCountryIso) ?? null}
                            onChange={(_, country) => {
                              const iso = country?.isoCode ?? '';
                              const name = country?.name ?? '';
                              setPharmacieCountryIso(iso);
                              setPharmaciePays(name);
                              setPharmacieVille('');
                              setSelectedPharmacieId('');
                            }}
                            renderInput={(params) => <TextField {...params} label="Pays" size="small" />}
                          />
                        </Grid>

                        {/* Ville Pharmacie */}
                        <Grid item xs={12} sm={6}>
                          {pharmacieCities.length > 0 ? (
                            <TextField
                              select
                              fullWidth
                              label="Ville"
                              size="small"
                              value={pharmacieVille}
                              onChange={(e) => {
                                setPharmacieVille(e.target.value);
                                setSelectedPharmacieId('');
                              }}
                              disabled={!pharmacieCountryIso}
                              InputProps={{
                                startAdornment: <InputAdornment position="start"><LocationOn fontSize="small" color="action" /></InputAdornment>
                              }}
                            >
                              <MenuItem value="">-- Sélectionner --</MenuItem>
                              {pharmacieCities.map((c) => (
                                <MenuItem key={`${c.name}-${(c as any).stateCode ?? ''}`} value={c.name}>{c.name}</MenuItem>
                              ))}
                            </TextField>
                          ) : (
                            <TextField
                              fullWidth
                              label="Ville"
                              size="small"
                              value={pharmacieVille}
                              onChange={(e) => {
                                setPharmacieVille(e.target.value);
                                setSelectedPharmacieId('');
                              }}
                              disabled={!pharmacieCountryIso}
                              helperText={!pharmacieCountryIso ? "Sélectionnez d'abord un pays" : ''}
                              InputProps={{
                                startAdornment: <InputAdornment position="start"><LocationOn fontSize="small" color="action" /></InputAdornment>
                              }}
                            />
                          )}
                        </Grid>

                        {/* Pharmacie Selection */}
                        <Grid item xs={12}>
                          <TextField
                            select
                            fullWidth
                            label="Pharmacie assignée"
                            size="small"
                            value={selectedPharmacieId}
                            onChange={(e) => setSelectedPharmacieId(e.target.value)}
                            disabled={!pharmacieVille}
                            helperText={!pharmacieVille ? "Sélectionnez d'abord une ville" : `${filteredPharmacies.length} pharmacie(s) disponible(s)`}
                            InputProps={{
                              startAdornment: <InputAdornment position="start"><LocalPharmacy fontSize="small" color="primary" /></InputAdornment>
                            }}
                          >
                            <MenuItem value="">-- Aucune (optionnel) --</MenuItem>
                            {filteredPharmacies.map((ph) => (
                              <MenuItem key={ph.id} value={ph.id}>
                                {ph.firstName} {ph.lastName} — {ph.address}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                      </Grid>
                    </>
                  )}

                  {/* Laboratoire Section */}
                  {addAnalyse && (
                    <>
                      <Divider sx={{ mb: 2 }}>
                        <Chip icon={<Science />} label="Laboratoire" color="success" size="small" />
                      </Divider>
                      <Grid container spacing={2}>
                        {/* Pays Laboratoire */}
                        <Grid item xs={12} sm={6}>
                          <Autocomplete
                            options={allCountries}
                            getOptionLabel={(opt) => `${opt.flag ?? ''} ${opt.name}`}
                            isOptionEqualToValue={(opt, val) => opt.isoCode === val.isoCode}
                            value={allCountries.find(c => c.isoCode === laboCountryIso) ?? null}
                            onChange={(_, country) => {
                              const iso = country?.isoCode ?? '';
                              const name = country?.name ?? '';
                              setLaboCountryIso(iso);
                              setLaboPays(name);
                              setLaboVille('');
                              setSelectedLaboId('');
                            }}
                            renderInput={(params) => <TextField {...params} label="Pays" size="small" />}
                          />
                        </Grid>

                        {/* Ville Laboratoire */}
                        <Grid item xs={12} sm={6}>
                          {laboCities.length > 0 ? (
                            <TextField
                              select
                              fullWidth
                              label="Ville"
                              size="small"
                              value={laboVille}
                              onChange={(e) => {
                                setLaboVille(e.target.value);
                                setSelectedLaboId('');
                              }}
                              disabled={!laboCountryIso}
                              InputProps={{
                                startAdornment: <InputAdornment position="start"><LocationOn fontSize="small" color="action" /></InputAdornment>
                              }}
                            >
                              <MenuItem value="">-- Sélectionner --</MenuItem>
                              {laboCities.map((c) => (
                                <MenuItem key={`${c.name}-${(c as any).stateCode ?? ''}`} value={c.name}>{c.name}</MenuItem>
                              ))}
                            </TextField>
                          ) : (
                            <TextField
                              fullWidth
                              label="Ville"
                              size="small"
                              value={laboVille}
                              onChange={(e) => {
                                setLaboVille(e.target.value);
                                setSelectedLaboId('');
                              }}
                              disabled={!laboCountryIso}
                              helperText={!laboCountryIso ? "Sélectionnez d'abord un pays" : ''}
                              InputProps={{
                                startAdornment: <InputAdornment position="start"><LocationOn fontSize="small" color="action" /></InputAdornment>
                              }}
                            />
                          )}
                        </Grid>

                        {/* Laboratoire Selection */}
                        <Grid item xs={12}>
                          <TextField
                            select
                            fullWidth
                            label="Laboratoire assigné"
                            size="small"
                            value={selectedLaboId}
                            onChange={(e) => setSelectedLaboId(e.target.value)}
                            disabled={!laboVille}
                            helperText={!laboVille ? "Sélectionnez d'abord une ville" : `${filteredLaboratoires.length} laboratoire(s) disponible(s)`}
                            InputProps={{
                              startAdornment: <InputAdornment position="start"><Science fontSize="small" color="success" /></InputAdornment>
                            }}
                          >
                            <MenuItem value="">-- Aucun (optionnel) --</MenuItem>
                            {filteredLaboratoires.map((lab) => (
                              <MenuItem key={lab.id} value={lab.id}>
                                {lab.firstName} {lab.lastName} — {lab.address}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                      </Grid>
                    </>
                  )}
                </Paper>
              )}

              <Button
                fullWidth
                variant="contained"
                onClick={handleCreate}
                disabled={creating || !formData.motif.trim()}
                startIcon={creating ? <CircularProgress size={18} color="inherit" /> : <Add />}
                sx={{ mt: 2, py: 1.2, fontWeight: 'bold', textTransform: 'uppercase' }}
              >
                {creating ? 'Création...' : dialogTab === 0 ? 'Créer la consultation (RDV)' : 'Créer la consultation (Urgente)'}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
