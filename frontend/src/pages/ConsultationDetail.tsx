import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, TextField, Button, Divider, MenuItem,
  IconButton, CircularProgress, Alert,
} from '@mui/material';
import { Delete, Add, Save, CheckCircle } from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../config/api';

interface Medicament {
  nom: string;
  dosage: string;
  frequence: string;
  duree: string;
}

export default function ConsultationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [consultation, setConsultation] = useState<any>(null);

  // Consultation fields
  const [diagnostic, setDiagnostic] = useState('');
  const [notes, setNotes] = useState('');

  // Pharmacists & labs
  const [pharmaciens, setPharmaciens] = useState<any[]>([]);
  const [laboratoires, setLaboratoires] = useState<any[]>([]);

  // Ordonnance form
  const [pharmacienId, setPharmacienId] = useState('');
  const [medicaments, setMedicaments] = useState<Medicament[]>([
    { nom: '', dosage: '', frequence: '', duree: '' },
  ]);

  // Analyse form
  const [labId, setLabId] = useState('');
  const [descriptionAnalyse, setDescriptionAnalyse] = useState('');

  useEffect(() => {
    Promise.all([
      loadConsultation(),
      loadPharmaciens(),
      loadLaboratoires(),
    ]);
  }, []);

  const loadConsultation = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/consultations/${id}`);
      setConsultation(data);
      setDiagnostic(data.diagnostic || '');
      setNotes(data.notes || '');
    } catch {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadPharmaciens = async () => {
    try {
      const { data } = await api.get('/users?role=pharmacien');
      setPharmaciens(data.data || data || []);
    } catch {
      setPharmaciens([]);
    }
  };

  const loadLaboratoires = async () => {
    try {
      const { data } = await api.get('/users?role=laboratoire');
      setLaboratoires(data.data || data || []);
    } catch {
      setLaboratoires([]);
    }
  };

  const handleSaveConsultation = async () => {
    try {
      await api.patch(`/consultations/${id}`, { diagnostic, notes });
      toast.success('Consultation enregistrée');
      setConsultation((prev: any) => ({ ...prev, diagnostic, notes }));
    } catch {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const handleAddMedicament = () => {
    setMedicaments([...medicaments, { nom: '', dosage: '', frequence: '', duree: '' }]);
  };

  const handleRemoveMedicament = (idx: number) => {
    setMedicaments(medicaments.filter((_, i) => i !== idx));
  };

  const handleMedicamentChange = (idx: number, field: keyof Medicament, value: string) => {
    const updated = [...medicaments];
    updated[idx][field] = value;
    setMedicaments(updated);
  };

  const handleCreateOrdonnance = async () => {
    const filled = medicaments.filter((m) => m.nom.trim());
    if (filled.length === 0) {
      toast.warning('Ajoutez au moins un médicament');
      return;
    }
    try {
      await api.post('/ordonnances', {
        consultationId: id,
        pharmacienId: pharmacienId || undefined,
        medicaments: filled,
      });
      toast.success('Ordonnance créée');
      setMedicaments([{ nom: '', dosage: '', frequence: '', duree: '' }]);
      setPharmacienId('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const handleCreateAnalyse = async () => {
    if (!descriptionAnalyse.trim()) {
      toast.warning('Entrez une description');
      return;
    }
    try {
      await api.post('/analyses', {
        consultationId: id,
        labId: labId || undefined,
        description: descriptionAnalyse,
      });
      toast.success('Analyse prescrite');
      setDescriptionAnalyse('');
      setLabId('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const handleConfirmConsultation = async () => {
    try {
      await api.patch(`/consultations/${id}`, { diagnostic, notes });
      await api.post(`/consultations/${id}/confirm`);
      toast.success('Consultation confirmée — Rendez-vous marqué comme terminé');
      setTimeout(() => navigate('/consultations'), 1500);
    } catch {
      toast.error('Erreur lors de la confirmation');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!consultation) {
    return <Alert severity="error">Consultation introuvable.</Alert>;
  }

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto' }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        Détails de la consultation
      </Typography>

      {/* ── Informations générales ── */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
          Informations générales
        </Typography>

        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Date:</strong>{' '}
            {new Date(consultation.date).toLocaleDateString('fr-FR', {
              day: '2-digit', month: '2-digit', year: 'numeric',
            })}
          </Typography>
          <Typography variant="body2">
            <strong>Patient:</strong> {consultation.patient?.firstName} {consultation.patient?.lastName}
          </Typography>
        </Alert>

        <TextField
          fullWidth
          label="Diagnostic *"
          value={diagnostic}
          onChange={(e) => setDiagnostic(e.target.value)}
          multiline
          rows={2}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          rows={3}
          sx={{ mb: 2 }}
        />

        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSaveConsultation}
          sx={{ textTransform: 'uppercase' }}
        >
          Enregistrer
        </Button>
      </Paper>

      {/* ── Ordonnance ── */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
          Ordonnance
        </Typography>

        <TextField
          select
          fullWidth
          label="Pharmacien"
          value={pharmacienId}
          onChange={(e) => setPharmacienId(e.target.value)}
          sx={{ mb: 2 }}
        >
          <MenuItem value="">— Aucun pharmacien —</MenuItem>
          {pharmaciens.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.firstName} {p.lastName}
            </MenuItem>
          ))}
        </TextField>

        {medicaments.map((med, idx) => (
          <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
            <TextField
              label="Médicament"
              value={med.nom}
              onChange={(e) => handleMedicamentChange(idx, 'nom', e.target.value)}
              size="small"
              sx={{ flex: 2 }}
            />
            <TextField
              label="Dosage"
              value={med.dosage}
              onChange={(e) => handleMedicamentChange(idx, 'dosage', e.target.value)}
              size="small"
              sx={{ flex: 1.5 }}
            />
            <TextField
              label="Fréquence"
              value={med.frequence}
              onChange={(e) => handleMedicamentChange(idx, 'frequence', e.target.value)}
              size="small"
              sx={{ flex: 1.5 }}
            />
            <TextField
              label="Durée"
              value={med.duree}
              onChange={(e) => handleMedicamentChange(idx, 'duree', e.target.value)}
              size="small"
              sx={{ flex: 1.5 }}
            />
            <IconButton color="error" onClick={() => handleRemoveMedicament(idx)} disabled={medicaments.length === 1}>
              <Delete />
            </IconButton>
          </Box>
        ))}

        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Button startIcon={<Add />} onClick={handleAddMedicament} size="small">
            Ajouter
          </Button>
          <Button variant="contained" onClick={handleCreateOrdonnance} size="small">
            Créer ordonnance
          </Button>
        </Box>
      </Paper>

      {/* ── Analyse de laboratoire ── */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
          Analyse de laboratoire
        </Typography>

        <TextField
          select
          fullWidth
          label="Laboratoire"
          value={labId}
          onChange={(e) => setLabId(e.target.value)}
          sx={{ mb: 2 }}
        >
          <MenuItem value="">— Aucun laboratoire —</MenuItem>
          {laboratoires.map((l) => (
            <MenuItem key={l.id} value={l.id}>
              {l.firstName} {l.lastName}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          fullWidth
          label="Description de l'analyse"
          value={descriptionAnalyse}
          onChange={(e) => setDescriptionAnalyse(e.target.value)}
          multiline
          rows={3}
          sx={{ mb: 2 }}
        />

        <Button
          fullWidth
          variant="contained"
          onClick={handleCreateAnalyse}
          sx={{ textTransform: 'uppercase' }}
        >
          Prescrire analyse
        </Button>
      </Paper>

      {/* ── Footer buttons ── */}
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          onClick={() => navigate('/consultations')}
          sx={{ textTransform: 'uppercase' }}
        >
          Retour
        </Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<CheckCircle />}
          onClick={handleConfirmConsultation}
          sx={{ textTransform: 'uppercase' }}
        >
          Confirmer la consultation
        </Button>
      </Box>
    </Box>
  );
}
