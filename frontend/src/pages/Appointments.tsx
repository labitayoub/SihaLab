import { useEffect, useState } from 'react';
import {
  Box, Button, Card, Typography, Dialog, DialogTitle, DialogContent, TextField,
  MenuItem, Chip, CircularProgress, Alert, Grid, Stack, Tooltip,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Add, AccessTime, EventBusy, WbSunny, NightsStay } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user.types';
import { Appointment, AppointmentStatus } from '../types/appointment.types';
import { DoctorAvailability, DoctorSchedule, DAY_LABELS } from '../types/schedule.types';
import api from '../config/api';
import { toast } from 'react-toastify';

export default function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ doctorId: '', date: '', time: '', motif: '' });

  // Disponibilité
  const [availability, setAvailability] = useState<DoctorAvailability | null>(null);
  const [doctorSchedules, setDoctorSchedules] = useState<DoctorSchedule[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    loadAppointments();
    if (user?.role === UserRole.PATIENT) {
      loadDoctors();
    }
  }, []);

  // Charger les horaires du médecin quand on le sélectionne
  useEffect(() => {
    if (formData.doctorId) {
      loadDoctorSchedules(formData.doctorId);
      // Reset date et heure quand on change de médecin
      setFormData((prev) => ({ ...prev, date: '', time: '' }));
      setAvailability(null);
    }
  }, [formData.doctorId]);

  // Charger la disponibilité quand on sélectionne une date
  useEffect(() => {
    if (formData.doctorId && formData.date) {
      loadAvailability(formData.doctorId, formData.date);
      setFormData((prev) => ({ ...prev, time: '' }));
    }
  }, [formData.date]);

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

  const loadDoctorSchedules = async (doctorId: string) => {
    try {
      const { data } = await api.get<DoctorSchedule[]>(`/schedules/doctor/${doctorId}`);
      setDoctorSchedules(data);
    } catch (error) {
      setDoctorSchedules([]);
    }
  };

  const loadAvailability = async (doctorId: string, date: string) => {
    setLoadingSlots(true);
    try {
      const { data } = await api.get<DoctorAvailability>(
        `/appointments/doctor/${doctorId}/availability?date=${date}`,
      );
      setAvailability(data);
    } catch (error) {
      setAvailability(null);
    } finally {
      setLoadingSlots(false);
    }
  };

  /** Vérifie si un jour de la semaine a un horaire défini par le médecin */
  const isDayAvailable = (dateStr: string): boolean => {
    if (!dateStr || doctorSchedules.length === 0) return true;
    const dayOfWeek = new Date(dateStr).getDay();
    return doctorSchedules.some((s) => s.dayOfWeek === dayOfWeek && s.isActive);
  };

  const handleCreate = async () => {
    try {
      await api.post('/appointments', formData);
      toast.success('Rendez-vous créé avec succès !');
      setOpen(false);
      loadAppointments();
      setFormData({ doctorId: '', date: '', time: '', motif: '' });
      setAvailability(null);
      setDoctorSchedules([]);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case AppointmentStatus.CONFIRME: return 'success';
      case AppointmentStatus.ANNULE: return 'error';
      case AppointmentStatus.TERMINE: return 'info';
      default: return 'warning';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case AppointmentStatus.CONFIRME: return 'Confirmé';
      case AppointmentStatus.ANNULE: return 'Annulé';
      case AppointmentStatus.TERMINE: return 'Terminé';
      case AppointmentStatus.EN_ATTENTE: return 'En attente';
      default: return status;
    }
  };

  const columns: GridColDef[] = [
    { field: 'date', headerName: 'Date', width: 120 },
    { field: 'time', headerName: 'Heure', width: 100 },
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
    { field: 'motif', headerName: 'Motif', width: 200 },
    {
      field: 'status',
      headerName: 'Statut',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={getStatusLabel(params.value)}
          color={getStatusColor(params.value) as any}
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

  // Jours disponibles du médecin pour l'affichage dans le dialog
  const availableDays = [...new Set(
    doctorSchedules.filter((s) => s.isActive).map((s) => s.dayOfWeek),
  )]
    .sort()
    .map((d) => DAY_LABELS[d])
    .join(', ');

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

      {/* ── Dialog Nouveau RDV ────────────────────────────── */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouveau Rendez-vous</DialogTitle>
        <DialogContent>
          {/* 1. Sélection du médecin */}
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
                Dr. {doc.firstName} {doc.lastName} {doc.specialite ? `- ${doc.specialite}` : ''}
              </MenuItem>
            ))}
          </TextField>

          {/* Indication jours disponibles */}
          {formData.doctorId && doctorSchedules.length > 0 && (
            <Alert severity="info" sx={{ mt: 1, mb: 1 }} icon={<AccessTime />}>
              Jours de consultation : <strong>{availableDays}</strong>
            </Alert>
          )}
          {formData.doctorId && doctorSchedules.length === 0 && (
            <Alert severity="warning" sx={{ mt: 1, mb: 1 }} icon={<EventBusy />}>
              Ce médecin n'a pas encore défini ses disponibilités.
            </Alert>
          )}

          {/* 2. Sélection de la date */}
          {formData.doctorId && doctorSchedules.length > 0 && (
            <TextField
              fullWidth
              type="date"
              label="Date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              inputProps={{
                min: new Date().toISOString().split('T')[0], // Pas dans le passé
              }}
            />
          )}

          {/* Alerte si le jour sélectionné n'est pas disponible */}
          {formData.date && !isDayAvailable(formData.date) && (
            <Alert severity="error" sx={{ mt: 1 }}>
              Le médecin ne consulte pas le {DAY_LABELS[new Date(formData.date).getDay()]}.
              Veuillez choisir un autre jour.
            </Alert>
          )}

          {/* 3. Sélection du créneau — Slot Picker visuel */}
          {formData.date && isDayAvailable(formData.date) && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTime fontSize="small" />
                Créneaux disponibles
              </Typography>

              {loadingSlots ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={32} />
                </Box>
              ) : availability?.hasSchedule === false ? (
                <Alert severity="warning">
                  Aucun horaire défini pour ce jour.
                </Alert>
              ) : availability && availability.availableSlots.length === 0 ? (
                <Alert severity="error">
                  Tous les créneaux sont pris pour cette date. Veuillez choisir une autre date.
                </Alert>
              ) : availability ? (
                <Box>
                  {/* ── Matin ── */}
                  {availability.schedule?.morning && (
                    <Box sx={{ mb: 2 }}>
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, color: '#ed6c02' }}
                      >
                        <WbSunny fontSize="small" />
                        Matin
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                          ({availability.schedule.morning.startTime} — {availability.schedule.morning.endTime}, {availability.schedule.morning.slotDuration} min)
                        </Typography>
                      </Typography>
                      <Grid container spacing={1}>
                        {availability.morningSlots.map((slot) => {
                          const isBooked = availability.bookedSlots.includes(slot);
                          return (
                            <Grid item key={slot}>
                              {isBooked ? (
                                <Tooltip title="Créneau déjà réservé">
                                  <Chip label={slot} disabled variant="outlined" sx={{ textDecoration: 'line-through' }} />
                                </Tooltip>
                              ) : (
                                <Chip
                                  label={slot}
                                  onClick={() => setFormData((prev) => ({ ...prev, time: slot }))}
                                  color={formData.time === slot ? 'primary' : 'default'}
                                  variant={formData.time === slot ? 'filled' : 'outlined'}
                                  sx={{
                                    fontWeight: formData.time === slot ? 'bold' : 'normal',
                                    cursor: 'pointer',
                                    '&:hover': { backgroundColor: formData.time === slot ? undefined : 'action.hover' },
                                  }}
                                />
                              )}
                            </Grid>
                          );
                        })}
                        {availability.morningSlots.length === 0 && (
                          <Grid item>
                            <Typography variant="caption" color="text.secondary">Aucun créneau le matin</Typography>
                          </Grid>
                        )}
                      </Grid>
                    </Box>
                  )}

                  {/* ── Pause déjeuner ── */}
                  {availability.schedule?.morning && availability.schedule?.afternoon && (
                    <Chip
                      label={`🍽️ Pause déjeuner : ${availability.schedule.morning.endTime} — ${availability.schedule.afternoon.startTime}`}
                      size="small"
                      variant="outlined"
                      sx={{ mb: 2, color: 'text.secondary' }}
                    />
                  )}

                  {/* ── Après-midi ── */}
                  {availability.schedule?.afternoon && (
                    <Box sx={{ mb: 1 }}>
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, color: '#1565c0' }}
                      >
                        <NightsStay fontSize="small" />
                        Après-midi
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                          ({availability.schedule.afternoon.startTime} — {availability.schedule.afternoon.endTime}, {availability.schedule.afternoon.slotDuration} min)
                        </Typography>
                      </Typography>
                      <Grid container spacing={1}>
                        {availability.afternoonSlots.map((slot) => {
                          const isBooked = availability.bookedSlots.includes(slot);
                          return (
                            <Grid item key={slot}>
                              {isBooked ? (
                                <Tooltip title="Créneau déjà réservé">
                                  <Chip label={slot} disabled variant="outlined" sx={{ textDecoration: 'line-through' }} />
                                </Tooltip>
                              ) : (
                                <Chip
                                  label={slot}
                                  onClick={() => setFormData((prev) => ({ ...prev, time: slot }))}
                                  color={formData.time === slot ? 'primary' : 'default'}
                                  variant={formData.time === slot ? 'filled' : 'outlined'}
                                  sx={{
                                    fontWeight: formData.time === slot ? 'bold' : 'normal',
                                    cursor: 'pointer',
                                    '&:hover': { backgroundColor: formData.time === slot ? undefined : 'action.hover' },
                                  }}
                                />
                              )}
                            </Grid>
                          );
                        })}
                        {availability.afternoonSlots.length === 0 && (
                          <Grid item>
                            <Typography variant="caption" color="text.secondary">Aucun créneau l'après-midi</Typography>
                          </Grid>
                        )}
                      </Grid>
                    </Box>
                  )}
                </Box>
              ) : null}
            </Box>
          )}

          {/* Créneau sélectionné */}
          {formData.time && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Créneau sélectionné : <strong>{formData.time}</strong>
            </Alert>
          )}

          {/* 4. Motif */}
          <TextField
            fullWidth
            label="Motif de consultation"
            value={formData.motif}
            onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
            margin="normal"
            multiline
            rows={3}
            placeholder="Décrivez brièvement le motif de votre rendez-vous..."
          />

          <Button
            fullWidth
            variant="contained"
            onClick={handleCreate}
            sx={{ mt: 2 }}
            disabled={!formData.doctorId || !formData.date || !formData.time}
          >
            Confirmer le rendez-vous
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
