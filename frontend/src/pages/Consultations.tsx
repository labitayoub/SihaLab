import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Typography, Dialog, DialogTitle, DialogContent, TextField,
  Paper, Chip, Divider, Avatar, IconButton, Tabs, Tab, Alert, CircularProgress, Collapse,
} from '@mui/material';
import {
  Add, PictureAsPdf, Visibility, EventAvailable, PersonAdd,
  AccessTime, CalendarToday, LocalPharmacy, Science, Delete,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user.types';
import { ConsultationWithDetails } from '../types/dossier.types';
import { OrdonnanceStatus } from '../types/ordonnance.types';
import { AnalyseStatus } from '../types/analyse.types';
import api from '../config/api';
import { toast } from '../utils/toast';

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
  });

  // Common consultation form
  const [formData, setFormData] = useState({ motif: '', diagnostic: '', notes: '' });

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
    } catch { toast.error('Erreur de chargement'); }
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
    setNewPatientData({ firstName: '', lastName: '', phone: '', email: '', password: 'SihaLab123!' });
    setFormData({ motif: '', diagnostic: '', notes: '' });
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
    if (!formData.motif.trim()) { toast.error('Le motif est obligatoire'); return; }
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
      if (!patientId) { toast.error('Aucun patient sélectionné'); return; }

      const payload: any = { patientId, ...formData };
      if (dialogTab === 0 && selectedAppointment) payload.appointmentId = selectedAppointment.id;

      const { data: newC } = await api.post('/consultations', payload);
      const consultationId = newC.id;

      if (addOrdonnance) {
        const validMeds = medicaments.filter(m => m.nom.trim());
        if (validMeds.length > 0) await api.post('/ordonnances', { consultationId, medicaments: validMeds });
      }
      if (addAnalyse) {
        for (const desc of analyseDescriptions.filter(d => d.trim())) {
          await api.post('/analyses', { consultationId, description: desc });
        }
      }

      toast.success('Consultation créée — Redirection vers les détails');
      setOpen(false);
      resetDialog();
      navigate(`/consultations/${consultationId}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la création');
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
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {c.ordonnances.map((o: any, idx: number) => (
                        <Chip
                          key={o.id}
                          label={`#${idx + 1} - ${getStatusLabel(o.status)}`}
                          size="small"
                          color={getOrdonnanceChipColor(o.status)}
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Analyses chips */}
                {c.analyses && c.analyses.length > 0 && (
                  <Box>
                    <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
                      Analyses:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {c.analyses.map((a: any, idx: number) => (
                        <Chip
                          key={a.id}
                          label={`#${idx + 1} - ${getStatusLabel(a.status)}`}
                          size="small"
                          color={getAnalyseChipColor(a.status)}
                        />
                      ))}
                    </Box>
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
        <DialogTitle sx={{ pb: 0 }}>
          <Typography variant="h6" fontWeight="bold">Nouvelle Consultation</Typography>
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
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <TextField
                      label="Prénom *"
                      value={newPatientData.firstName}
                      onChange={(e) => setNewPatientData(p => ({ ...p, firstName: e.target.value }))}
                      size="small"
                    />
                    <TextField
                      label="Nom *"
                      value={newPatientData.lastName}
                      onChange={(e) => setNewPatientData(p => ({ ...p, lastName: e.target.value }))}
                      size="small"
                    />
                    <TextField
                      label="Email *"
                      type="email"
                      value={newPatientData.email}
                      onChange={(e) => setNewPatientData(p => ({ ...p, email: e.target.value }))}
                      size="small"
                    />
                    <TextField
                      label="Téléphone"
                      value={newPatientData.phone}
                      onChange={(e) => setNewPatientData(p => ({ ...p, phone: e.target.value }))}
                      size="small"
                    />
                    <TextField
                      label="Mot de passe"
                      type="password"
                      value={newPatientData.password}
                      onChange={(e) => setNewPatientData(p => ({ ...p, password: e.target.value }))}
                      size="small"
                      sx={{ gridColumn: '1 / -1' }}
                      helperText="Mot de passe par défaut: SihaLab123!"
                    />
                  </Box>
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
