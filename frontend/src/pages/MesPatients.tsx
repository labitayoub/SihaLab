import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Button, CircularProgress, Alert } from '@mui/material';
import { People, FolderShared } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { User } from '../types/user.types';
import api from '../config/api';
import { toast } from 'react-toastify';

export default function MesPatients() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/consultations/my-patients');
      setPatients(data);
    } catch {
      toast.error('Erreur lors du chargement des patients');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 8 }}>
        <CircularProgress size={48} />
        <Typography sx={{ mt: 2 }} color="text.secondary">Chargement...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <People sx={{ fontSize: 32 }} />
        <Typography variant="h4" fontWeight="bold">Mes Patients</Typography>
      </Box>

      {patients.length === 0 ? (
        <Alert severity="info">
          Aucun patient pour le moment. Les patients apparaîtront ici après leur première consultation.
        </Alert>
      ) : (
        patients.map((patient) => (
          <Paper
            key={patient.id}
            variant="outlined"
            sx={{
              p: 2.5,
              mb: 1.5,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                {patient.firstName} {patient.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {patient.email}
              </Typography>
              {patient.phone && (
                <Typography variant="body2" color="text.secondary">
                  {patient.phone}
                </Typography>
              )}
            </Box>
            <Button
              variant="contained"
              startIcon={<FolderShared />}
              onClick={() => navigate(`/dossier-medical/${patient.id}`)}
              sx={{ textTransform: 'uppercase', fontWeight: 'bold', borderRadius: 2 }}
            >
              Dossier Médical
            </Button>
          </Paper>
        ))
      )}
    </Box>
  );
}
