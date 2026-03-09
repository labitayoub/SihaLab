import { useEffect, useState } from 'react';
import { Box, Button, Card, Typography, Dialog, DialogTitle, DialogContent, TextField, Chip, MenuItem, IconButton } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Add, Upload, Close } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user.types';
import { Analyse, AnalyseStatus } from '../types/analyse.types';
import api from '../config/api';
import { toast } from '../utils/toast';

export default function Analyses() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<Analyse[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedAnalyse, setSelectedAnalyse] = useState<string>('');
  const [formData, setFormData] = useState({
    consultationId: '',
    description: '',
  });
  const [resultat, setResultat] = useState('');

  useEffect(() => {
    loadAnalyses();
    if (user?.role === UserRole.MEDECIN) {
      loadConsultations();
    }
  }, []);

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
      const { data: newAnalyse } = await api.post('/analyses', formData);
      // Génération automatique du PDF dédié à cette analyse
      try {
        await api.post(`/consultations/${newAnalyse.consultationId}/generate-analyse-pdf/${newAnalyse.id}`);
        toast.success('Analyse demandée et PDF généré automatiquement');
      } catch {
        toast.success('Analyse demandée (PDF sera généré depuis la consultation)');
      }
      setOpen(false);
      loadAnalyses();
      setFormData({ consultationId: '', description: '' });
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
      width: 170,
      renderCell: (params) => (
        user?.role === UserRole.LABORATOIRE && params.row.status !== AnalyseStatus.TERMINEE && (
          <Button 
            size="small" 
            startIcon={<Upload />}
            onClick={() => { setSelectedAnalyse(params.row.id); setUploadOpen(true); }}
          >
            Upload Résultat
          </Button>
        )
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

      <Card>
        <DataGrid rows={analyses} columns={columns} autoHeight pageSizeOptions={[10, 20]} />
      </Card>

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
