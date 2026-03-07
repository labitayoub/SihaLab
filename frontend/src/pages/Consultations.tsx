import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, Typography, Dialog, DialogTitle, DialogContent, TextField,
  MenuItem, Paper, Chip, Divider,
} from '@mui/material';
import { Add, FolderShared } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user.types';
import { ConsultationWithDetails } from '../types/dossier.types';
import { OrdonnanceStatus } from '../types/ordonnance.types';
import { AnalyseStatus } from '../types/analyse.types';
import api from '../config/api';
import { toast } from 'react-toastify';

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
  const [patients, setPatients] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    patientId: '',
    motif: '',
    diagnostic: '',
    notes: '',
  });

  const isDoctorOrInfirmier = user?.role === UserRole.MEDECIN || user?.role === UserRole.INFIRMIER;

  useEffect(() => {
    loadConsultations();
    if (user?.role === UserRole.MEDECIN || user?.role === UserRole.INFIRMIER) {
      loadPatients();
    }
  }, []);

  const loadConsultations = async () => {
    try {
      const { data } = await api.get('/consultations');
      setConsultations(data);
    } catch (error) {
      toast.error('Erreur de chargement');
    }
  };

  const loadPatients = async () => {
    try {
      const { data } = await api.get('/users?role=patient');
      setPatients(data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreate = async () => {
    try {
      await api.post('/consultations', formData);
      toast.success('Consultation créée');
      setOpen(false);
      loadConsultations();
      setFormData({ patientId: '', motif: '', diagnostic: '', notes: '' });
    } catch (error) {
      toast.error('Erreur');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Mes Consultations</Typography>
        {(user?.role === UserRole.MEDECIN || user?.role === UserRole.INFIRMIER) && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
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
                {/* Date */}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {formatDate(c.date)}
                </Typography>

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
                  onClick={() => navigate(`/dossier-medical/${c.patientId}`)}
                  sx={{ ml: 2, whiteSpace: 'nowrap', textTransform: 'uppercase', fontWeight: 'bold' }}
                >
                  Détails
                </Button>
              )}
            </Box>
          </Paper>
        ))
      )}

      {/* ── Dialog Nouvelle Consultation ── */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nouvelle Consultation</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Patient"
            value={formData.patientId}
            onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
            margin="normal"
          >
            {patients.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.firstName} {p.lastName}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="Motif"
            value={formData.motif}
            onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
            margin="normal"
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            label="Diagnostic"
            value={formData.diagnostic}
            onChange={(e) => setFormData({ ...formData, diagnostic: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
          <TextField
            fullWidth
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
          <Button fullWidth variant="contained" onClick={handleCreate} sx={{ mt: 2 }}>
            Créer
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
