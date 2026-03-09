import { useEffect, useState } from 'react';
import { Box, Button, Card, Typography, Dialog, DialogTitle, DialogContent, TextField, Chip, IconButton, MenuItem } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Add, Delete, Close } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user.types';
import { Ordonnance, OrdonnanceStatus } from '../types/ordonnance.types';
import api from '../config/api';
import { toast } from '../utils/toast';

export default function Ordonnances() {
  const { user } = useAuth();
  const [ordonnances, setOrdonnances] = useState<Ordonnance[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    consultationId: '',
    medicaments: [{ nom: '', dosage: '', frequence: '', duree: '' }],
  });

  useEffect(() => {
    loadOrdonnances();
    if (user?.role === UserRole.MEDECIN) {
      loadConsultations();
    }
  }, []);

  const loadOrdonnances = async () => {
    try {
      const endpoint = user?.role === UserRole.PATIENT ? '/ordonnances/patient/me' : '/ordonnances';
      const { data } = await api.get(endpoint);
      setOrdonnances(data);
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
      const { data: newOrd } = await api.post('/ordonnances', formData);
      // Génération automatique du PDF dédié à cette ordonnance
      try {
        await api.post(`/consultations/${newOrd.consultationId}/generate-ordonnance-pdf/${newOrd.id}`);
        toast.success('Ordonnance créée et PDF généré automatiquement');
      } catch {
        toast.success('Ordonnance créée (PDF sera généré depuis la consultation)');
      }
      setOpen(false);
      loadOrdonnances();
      setFormData({ consultationId: '', medicaments: [{ nom: '', dosage: '', frequence: '', duree: '' }] });
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };

    const handleDelivrer = async (id: string) => {
    try {
      await api.post(`/ordonnances/${id}/delivrer`);
      toast.success('Ordonnance délivrée');
      loadOrdonnances();
    } catch (error) {
      toast.error('Erreur');
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
      width: 120,
      renderCell: (params) => (
        user?.role === UserRole.PHARMACIEN && params.row.status === OrdonnanceStatus.EN_ATTENTE && (
          <Button size="small" onClick={() => handleDelivrer(params.row.id)}>Délivrer</Button>
        )
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

      <Card>
        <DataGrid rows={ordonnances} columns={columns} autoHeight pageSizeOptions={[10, 20]} />
      </Card>

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

          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Médicaments</Typography>
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
