import { useEffect, useState } from 'react';
import { Box, Button, Card, Typography, Dialog, DialogTitle, DialogContent, TextField, MenuItem, Chip } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Add } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { Appointment, AppointmentStatus, UserRole } from '../types';
import api from '../config/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

export default function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    doctorId: '',
    date: '',
    time: '',
    motif: '',
  });

  useEffect(() => {
    loadAppointments();
    if (user?.role === UserRole.PATIENT) {
      loadDoctors();
    }
  }, []);

  const loadAppointments = async () => {
    try {
      const { data } = await api.get('/appointments');
      setAppointments(data);
    } catch (error) {
      toast.error('Erreur de chargement');
    }
  };

  const loadDoctors = async () => {
    try {
      const { data } = await api.get('/users/doctors');
      setDoctors(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreate = async () => {
    try {
      await api.post('/appointments', formData);
      toast.success('Rendez-vous créé');
      setOpen(false);
      loadAppointments();
      setFormData({ doctorId: '', date: '', time: '', motif: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      await api.post(`/appointments/${id}/confirm`);
      toast.success('Rendez-vous confirmé');
      loadAppointments();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.post(`/appointments/${id}/cancel`);
      toast.success('Rendez-vous annulé');
      loadAppointments();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const columns: GridColDef[] = [
    { field: 'date', headerName: 'Date', width: 120 },
    { field: 'time', headerName: 'Heure', width: 100 },
    { 
      field: 'patient', 
      headerName: 'Patient', 
      width: 200,
      valueGetter: (params) => `${params.row.patient?.firstName} ${params.row.patient?.lastName}`,
    },
    { 
      field: 'doctor', 
      headerName: 'Médecin', 
      width: 200,
      valueGetter: (params) => `Dr. ${params.row.doctor?.firstName} ${params.row.doctor?.lastName}`,
    },
    { field: 'motif', headerName: 'Motif', width: 200 },
    {
      field: 'status',
      headerName: 'Statut',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={
            params.value === AppointmentStatus.CONFIRME ? 'success' :
            params.value === AppointmentStatus.ANNULE ? 'error' : 'warning'
          }
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      renderCell: (params) => (
        <Box>
          {user?.role === UserRole.MEDECIN && params.row.status === AppointmentStatus.EN_ATTENTE && (
            <>
              <Button size="small" onClick={() => handleConfirm(params.row.id)}>Confirmer</Button>
              <Button size="small" color="error" onClick={() => handleCancel(params.row.id)}>Annuler</Button>
            </>
          )}
          {user?.role === UserRole.PATIENT && params.row.status === AppointmentStatus.EN_ATTENTE && (
            <Button size="small" color="error" onClick={() => handleCancel(params.row.id)}>Annuler</Button>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Rendez-vous</Typography>
        {user?.role === UserRole.PATIENT && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
            Nouveau RDV
          </Button>
        )}
      </Box>

      <Card>
        <DataGrid
          rows={appointments}
          columns={columns}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          pageSizeOptions={[10, 20, 50]}
          disableRowSelectionOnClick
          autoHeight
        />
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouveau Rendez-vous</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Médecin"
            value={formData.doctorId}
            onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
            margin="normal"
          >
            {doctors.map((doc) => (
              <MenuItem key={doc.id} value={doc.id}>
                Dr. {doc.firstName} {doc.lastName} - {doc.specialite}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            type="date"
            label="Date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            type="time"
            label="Heure"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="Motif"
            value={formData.motif}
            onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
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