import { useEffect, useState } from 'react';
import { Box, Button, Card, Typography, Dialog, DialogTitle, DialogContent, TextField, Chip, MenuItem, Stepper, Step, StepLabel } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Add } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user.types';
import { Livraison, LivraisonStatus } from '../types/livraison.types';
import api from '../config/api';
import { toast } from 'react-toastify';

export default function Livraisons() {
  const { user } = useAuth();
  const [livraisons, setLivraisons] = useState<Livraison[]>([]);
  const [ordonnances, setOrdonnances] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [selectedLivraison, setSelectedLivraison] = useState<Livraison | null>(null);
  const [formData, setFormData] = useState({
    ordonnanceId: '',
    patientId: '',
    adresseLivraison: '',
    fraisLivraison: 20,
  });

  useEffect(() => {
    loadLivraisons();
    if (user?.role === UserRole.PHARMACIEN) {
      loadOrdonnances();
    }
  }, []);

  const loadLivraisons = async () => {
    try {
      const endpoint = user?.role === UserRole.PATIENT ? '/livraisons/patient' : '/livraisons/pharmacie';
      const { data } = await api.get(endpoint);
      setLivraisons(data);
    } catch (error) {
      toast.error('Erreur de chargement');
    }
  };

  const loadOrdonnances = async () => {
    try {
      const { data } = await api.get('/ordonnances?status=delivree');
      setOrdonnances(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreate = async () => {
    try {
      await api.post('/livraisons', formData);
      toast.success('Livraison créée');
      setOpen(false);
      loadLivraisons();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleUpdateStatut = async (id: string, statut: LivraisonStatus) => {
    try {
      await api.patch(`/livraisons/${id}/statut`, { statut, description: `Statut changé en ${statut}` });
      toast.success('Statut mis à jour');
      loadLivraisons();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const getStepIndex = (statut: LivraisonStatus) => {
    const steps = [LivraisonStatus.EN_PREPARATION, LivraisonStatus.PRETE, LivraisonStatus.EN_COURS, LivraisonStatus.LIVREE];
    return steps.indexOf(statut);
  };

  const columns: GridColDef[] = [
    { field: 'codeSuivi', headerName: 'Code Suivi', width: 180 },
    { 
      field: 'patient', 
      headerName: 'Patient', 
      width: 200,
      valueGetter: (_value: any, row: any) => `${row.patient?.firstName} ${row.patient?.lastName}`,
    },
    { field: 'adresseLivraison', headerName: 'Adresse', width: 250 },
    { field: 'fraisLivraison', headerName: 'Frais', width: 100, valueFormatter: (params) => `${params} DH` },
    {
      field: 'statut',
      headerName: 'Statut',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={
            params.value === LivraisonStatus.LIVREE ? 'success' :
            params.value === LivraisonStatus.EN_COURS ? 'primary' :
            params.value === LivraisonStatus.ANNULEE ? 'error' : 'warning'
          }
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 250,
      renderCell: (params) => (
        <Box>
          <Button size="small" onClick={() => { setSelectedLivraison(params.row); setTrackingOpen(true); }}>
            Suivre
          </Button>
          {user?.role === UserRole.PHARMACIEN && (
            <>
              {params.row.statut === LivraisonStatus.EN_PREPARATION && (
                <Button size="small" onClick={() => handleUpdateStatut(params.row.id, LivraisonStatus.PRETE)}>
                  Prête
                </Button>
              )}
              {params.row.statut === LivraisonStatus.PRETE && (
                <Button size="small" onClick={() => handleUpdateStatut(params.row.id, LivraisonStatus.EN_COURS)}>
                  En cours
                </Button>
              )}
              {params.row.statut === LivraisonStatus.EN_COURS && (
                <Button size="small" color="success" onClick={() => handleUpdateStatut(params.row.id, LivraisonStatus.LIVREE)}>
                  Livrée
                </Button>
              )}
            </>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Livraisons</Typography>
        {user?.role === UserRole.PHARMACIEN && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
            Nouvelle Livraison
          </Button>
        )}
      </Box>

      <Card>
        <DataGrid rows={livraisons} columns={columns} autoHeight pageSizeOptions={[10, 20]} />
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouvelle Livraison</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Ordonnance"
            value={formData.ordonnanceId}
            onChange={(e) => setFormData({ ...formData, ordonnanceId: e.target.value })}
            margin="normal"
          >
            {ordonnances.map((o) => (
              <MenuItem key={o.id} value={o.id}>
                {o.consultation?.patient?.firstName} - {new Date(o.createdAt).toLocaleDateString()}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="ID Patient"
            value={formData.patientId}
            onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Adresse de livraison"
            value={formData.adresseLivraison}
            onChange={(e) => setFormData({ ...formData, adresseLivraison: e.target.value })}
            margin="normal"
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            type="number"
            label="Frais de livraison (DH)"
            value={formData.fraisLivraison}
            onChange={(e) => setFormData({ ...formData, fraisLivraison: Number(e.target.value) })}
            margin="normal"
          />
          <Button fullWidth variant="contained" onClick={handleCreate} sx={{ mt: 2 }}>
            Créer Livraison
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={trackingOpen} onClose={() => setTrackingOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Suivi de Livraison</DialogTitle>
        <DialogContent>
          {selectedLivraison && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6">Code: {selectedLivraison.codeSuivi}</Typography>
              <Typography>Adresse: {selectedLivraison.adresseLivraison}</Typography>
              <Typography>Frais: {selectedLivraison.fraisLivraison} DH</Typography>
              
              <Stepper activeStep={getStepIndex(selectedLivraison.statut)} sx={{ mt: 3 }}>
                <Step><StepLabel>En préparation</StepLabel></Step>
                <Step><StepLabel>Prête</StepLabel></Step>
                <Step><StepLabel>En cours</StepLabel></Step>
                <Step><StepLabel>Livrée</StepLabel></Step>
              </Stepper>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}