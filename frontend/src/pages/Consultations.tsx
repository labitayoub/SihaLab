import { useEffect, useState } from 'react';
import { Box, Button, Card, Typography, Dialog, DialogTitle, DialogContent, TextField, MenuItem } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Add } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user.types';
import { Consultation } from '../types/consultation.types';
import api from '../config/api';
import { toast } from 'react-toastify';

export default function Consultations() {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [open, setOpen] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    patientId: '',
    motif: '',
    diagnostic: '',
    notes: '',
  });

  useEffect(() => {
    loadConsultations();
    if (user?.role === UserRole.MEDECIN) {
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

  const columns: GridColDef[] = [
    { field: 'date', headerName: 'Date', width: 180, valueFormatter: (params) => new Date(params).toLocaleString('fr-FR') },
    { 
      field: 'patient', 
      headerName: 'Patient', 
      width: 200,
      valueGetter: (_value: any, row: any) => `${row.patient?.firstName} ${row.patient?.lastName}`,
    },
    { 
      field: 'doctor', 
      headerName: 'Médecin', 
      width: 200,
      valueGetter: (_value: any, row: any) => `Dr. ${row.doctor?.firstName} ${row.doctor?.lastName}`,
    },
    { field: 'motif', headerName: 'Motif', width: 250 },
    { field: 'diagnostic', headerName: 'Diagnostic', width: 250 },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Consultations</Typography>
        {user?.role === UserRole.MEDECIN && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
            Nouvelle Consultation
          </Button>
        )}
      </Box>

      <Card>
        <DataGrid
          rows={consultations}
          columns={columns}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          pageSizeOptions={[10, 20, 50]}
          autoHeight
        />
      </Card>

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
