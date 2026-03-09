import { useEffect, useState, useMemo } from 'react';
import {
  Box, Button, Card, CardContent, Typography, Dialog, DialogContent, TextField,
  MenuItem, Chip, CircularProgress, Alert, Grid, Avatar, IconButton, Paper,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Add, ChevronLeft, ChevronRight, AccessTime, EventBusy, LocationOn,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user.types';
import { Appointment, AppointmentStatus } from '../types/appointment.types';
import { DoctorAvailability, DoctorSchedule } from '../types/schedule.types';
import api from '../config/api';
import { toast, confirm } from '../utils/toast';

const SHORT_DAY = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

/** Build array of 7 consecutive dates starting from `start` */
function buildWeek(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function fmt(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function Appointments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ doctorId: '', date: '', time: '', motif: '' });

  // Disponibilité
  const [availability, setAvailability] = useState<DoctorAvailability | null>(null);
  const [doctorSchedules, setDoctorSchedules] = useState<DoctorSchedule[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Week picker
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date(); // start from today
    return d;
  });
  const weekDays = useMemo(() => buildWeek(weekStart), [weekStart]);

  // Check existing active RDV
  const [hasActiveRdv, setHasActiveRdv] = useState(false);

  const selectedDoctor = doctors.find((d) => d.id === formData.doctorId);

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
      checkActiveRdv(formData.doctorId);
      setFormData((prev) => ({ ...prev, date: '', time: '' }));
      setAvailability(null);
      // Reset week to today
      setWeekStart(new Date());
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

  const checkActiveRdv = async (doctorId: string) => {
    try {
      const { data } = await api.get('/appointments');
      const active = (data as Appointment[]).some(
        (a) =>
          a.doctorId === doctorId &&
          (a.status === AppointmentStatus.EN_ATTENTE || a.status === AppointmentStatus.CONFIRME),
      );
      setHasActiveRdv(active);
    } catch {
      setHasActiveRdv(false);
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

  /** Check if a specific day-of-week has schedule */
  const isDayOfWeekAvailable = (dayOfWeek: number): boolean => {
    if (doctorSchedules.length === 0) return false;
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
      setHasActiveRdv(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  };

  const handleConfirm = async (id: string) => {
    const ok = await confirm({
      title: 'Confirmer ce rendez-vous ?',
      text: 'Un dossier médical sera automatiquement créé pour ce patient.',
      icon: 'question',
      confirmText: 'Oui, confirmer',
      confirmColor: '#4caf50',
    });
    if (!ok) return;
    try {
      const { data } = await api.post(`/appointments/${id}/confirm`);
      toast.success('Rendez-vous confirmé ! Dossier médical créé automatiquement.');
      loadAppointments();
      if (data?.consultation?.id) {
        setTimeout(async () => {
          const go = await confirm({
            title: 'Dossier médical créé',
            text: 'Voulez-vous consulter le dossier médical de ce patient maintenant ?',
            icon: 'info',
            confirmText: 'Voir le dossier',
            cancelText: 'Plus tard',
            confirmColor: '#00afcc',
          });
          if (go) navigate('/consultations');
        }, 400);
      }
    } catch (error) {
      toast.error('Erreur lors de la confirmation');
    }
  };

  const handleCancel = async (id: string) => {
    const ok = await confirm({
      title: 'Annuler ce rendez-vous ?',
      text: 'Cette action est irréversible.',
      icon: 'warning',
      confirmText: 'Oui, annuler',
      confirmColor: '#f44336',
    });
    if (!ok) return;
    try {
      await api.post(`/appointments/${id}/cancel`);
      toast.success('Rendez-vous annulé');
      loadAppointments();
    } catch (error) {
      toast.error('Erreur lors de l\'annulation');
    }
  };

  const getStatusColor = (status: string): "default" | "warning" | "success" | "info" | "error" => {
    switch (status) {
      case AppointmentStatus.EN_ATTENTE: return 'warning';
      case AppointmentStatus.CONFIRME: return 'success';
      case AppointmentStatus.TERMINE: return 'info';
      case AppointmentStatus.ANNULE: return 'error';
      default: return 'default';
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
    { field: 'motif', headerName: 'Motif', width: 180 },
    {
      field: 'status',
      headerName: 'Statut',
      width: 140,
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
      minWidth: 280,
      flex: 1,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', height: '100%' }}>
          {(user?.role === UserRole.MEDECIN || user?.role === UserRole.INFIRMIER) && params.row.status === AppointmentStatus.EN_ATTENTE && (
            <>
              <Button variant="contained" color="success" size="small" sx={{ fontSize: '0.75rem', px: 1.5, py: 0.5, minWidth: 'auto', whiteSpace: 'nowrap' }} onClick={() => handleConfirm(params.row.id)}>Confirmer</Button>
              <Button variant="outlined" color="error" size="small" sx={{ fontSize: '0.75rem', px: 1.5, py: 0.5, minWidth: 'auto', whiteSpace: 'nowrap' }} onClick={() => handleCancel(params.row.id)}>Annuler</Button>
            </>
          )}
          {(user?.role === UserRole.MEDECIN || user?.role === UserRole.INFIRMIER) && params.row.status === AppointmentStatus.CONFIRME && (
            <>
              <Button variant="contained" color="primary" size="small" sx={{ fontSize: '0.75rem', px: 1.5, py: 0.5, minWidth: 'auto', whiteSpace: 'nowrap' }} onClick={() => navigate(`/dossier-medical/${params.row.patientId}`)}>
                Dossier
              </Button>
              <Button variant="outlined" color="error" size="small" sx={{ fontSize: '0.75rem', px: 1.5, py: 0.5, minWidth: 'auto', whiteSpace: 'nowrap' }} onClick={() => handleCancel(params.row.id)}>Annuler</Button>
            </>
          )}
          {user?.role === UserRole.PATIENT && (params.row.status === AppointmentStatus.EN_ATTENTE || params.row.status === AppointmentStatus.CONFIRME) && (
            <Button variant="outlined" color="error" size="small" sx={{ fontSize: '0.75rem', px: 1.5, py: 0.5, minWidth: 'auto', whiteSpace: 'nowrap' }} onClick={() => handleCancel(params.row.id)}>Annuler</Button>
          )}
        </Box>
      ),
    },
  ];

  const today = fmt(new Date());

  return (
    <Box sx={{ animation: 'fadeInUp 0.6s ease-out' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight={900} color="text.primary">Rendez-vous</Typography>
        {user?.role === UserRole.PATIENT && (
          <Button variant="contained" color="primary" startIcon={<Add />} onClick={() => setOpen(true)} sx={{ borderRadius: 8, px: 3, py: 1 }}>
            Nouveau RDV
          </Button>
        )}
      </Box>

      <Box sx={{ width: '100%' }}>
        <DataGrid
          rows={appointments}
          columns={columns}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          pageSizeOptions={[10, 20, 50]}
          disableRowSelectionOnClick
          autoHeight
          rowHeight={60}
        />
      </Box>

      {/* ═══════ Dialog Nouveau RDV — Redesigned ═══════ */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '24px', overflow: 'hidden' } }}
      >
        <DialogContent sx={{ p: 0 }}>
          {/* ── Step 0 : Sélection du médecin (si pas encore choisi) ── */}
          {!formData.doctorId ? (
            <Box sx={{ p: 4, bgcolor: '#f4f7f9', minHeight: 400 }}>
              <Typography variant="h5" gutterBottom fontWeight="900" color="primary.main">
                Choisir un praticien
              </Typography>
              <Grid container spacing={3} sx={{ mt: 1 }}>
                {doctors.map((doc) => (
                  <Grid item xs={12} sm={6} key={doc.id}>
                    <Card
                      elevation={0}
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.3s ease-in-out',
                        border: '1px solid transparent',
                        borderRadius: '16px',
                        '&:hover': { 
                          borderColor: 'primary.main', 
                          transform: 'translateY(-4px)',
                          boxShadow: '0 12px 24px rgba(0, 175, 204, 0.15)'
                        },
                      }}
                      onClick={() => setFormData({ ...formData, doctorId: doc.id })}
                    >
                      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
                        <Avatar
                          src={doc.avatarUrl}
                          sx={{ width: 64, height: 64, bgcolor: 'primary.light', color: 'primary.main', fontWeight: 800 }}
                        >
                          {doc.firstName?.[0]}
                        </Avatar>
                        <Box>
                          <Typography fontWeight="800" color="text.primary" variant="subtitle1">
                            Dr {doc.firstName} {doc.lastName}
                          </Typography>
                          {doc.specialite && (
                            <Typography variant="body2" color="secondary.main" fontWeight={700}>
                              {doc.specialite}
                            </Typography>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                {doctors.length === 0 && (
                  <Grid item xs={12}>
                    <Alert severity="info" sx={{ borderRadius: '12px' }}>Aucun médecin disponible pour le moment.</Alert>
                  </Grid>
                )}
              </Grid>
            </Box>
          ) : (
            <>
              {/* ── Doctor info header (blue bar) ── */}
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #00afcc 0%, #0082c8 100%)',
                  color: 'white',
                  p: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <Avatar
                  src={selectedDoctor?.avatarUrl}
                  sx={{ width: 80, height: 80, border: '4px solid rgba(255,255,255,0.3)', bgcolor: 'rgba(255,255,255,0.2)' }}
                >
                  {selectedDoctor?.firstName?.[0]}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" fontWeight="900">
                    Dr {selectedDoctor?.firstName} {selectedDoctor?.lastName}
                  </Typography>
                  {selectedDoctor?.specialite && (
                    <Typography variant="subtitle1" sx={{ opacity: 0.9, fontWeight: 700 }}>
                      {selectedDoctor.specialite}
                    </Typography>
                  )}
                  {selectedDoctor?.address && (
                    <Typography variant="body2" sx={{ opacity: 0.8, display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                      <LocationOn fontSize="small" /> {selectedDoctor.address}
                    </Typography>
                  )}
                </Box>
                <Button
                  variant="outlined"
                  sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', borderRadius: 8, fontWeight: 700, '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
                  onClick={() => {
                    setFormData({ doctorId: '', date: '', time: '', motif: '' });
                    setDoctorSchedules([]);
                    setAvailability(null);
                    setHasActiveRdv(false);
                  }}
                >
                  Changer
                </Button>
              </Box>

              {/* ── Existing active RDV warning ── */}
              {hasActiveRdv && (
                <Alert severity="warning" sx={{ mx: 2.5, mt: 2 }}>
                  Vous avez déjà un rendez-vous en cours avec ce médecin. Vous ne pouvez pas en prendre un nouveau tant que le précédent n'est pas terminé ou annulé.
                </Alert>
              )}

              {/* ── No schedule warning ── */}
              {doctorSchedules.length === 0 && (
                <Alert severity="warning" sx={{ m: 2.5 }} icon={<EventBusy />}>
                  Ce médecin n'a pas encore défini ses disponibilités.
                </Alert>
              )}

              {/* ── Main content ── */}
              {doctorSchedules.length > 0 && !hasActiveRdv && (
                <Box sx={{ p: 2.5 }}>
                  {/* ═══ Date picker — horizontal week strip ═══ */}
                  <Typography variant="h6" align="center" gutterBottom fontWeight="bold">
                    Veuillez choisir la date du rendez-vous
                  </Typography>

                  {/* Month + arrows */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5 }}>
                    <IconButton
                      onClick={() => {
                        const d = new Date(weekStart);
                        d.setDate(d.getDate() - 7);
                        // Don't go before today
                        const t = new Date();
                        t.setHours(0, 0, 0, 0);
                        if (d < t) { setWeekStart(t); } else { setWeekStart(d); }
                      }}
                      disabled={fmt(weekStart) <= today}
                    >
                      <ChevronLeft />
                    </IconButton>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mx: 2 }}>
                      {MONTH_NAMES[weekDays[3].getMonth()]} {weekDays[3].getFullYear()}
                    </Typography>
                    <IconButton
                      onClick={() => {
                        const d = new Date(weekStart);
                        d.setDate(d.getDate() + 7);
                        setWeekStart(d);
                      }}
                    >
                      <ChevronRight />
                    </IconButton>
                  </Box>

                  {/* Day cards */}
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1,
                      justifyContent: 'center',
                      flexWrap: 'nowrap',
                      overflowX: 'auto',
                      pb: 1,
                    }}
                  >
                    {weekDays.map((d) => {
                      const dateStr = fmt(d);
                      const dayOfWeek = d.getDay();
                      const isAvailable = isDayOfWeekAvailable(dayOfWeek);
                      const isPast = dateStr < today;
                      const isSelected = formData.date === dateStr;
                      const disabled = isPast || !isAvailable;

                      return (
                        <Paper
                          key={dateStr}
                          elevation={isSelected ? 4 : 0}
                          onClick={() => !disabled && setFormData((prev) => ({ ...prev, date: dateStr }))}
                          sx={{
                            minWidth: 80,
                            py: 1.5,
                            px: 1,
                            textAlign: 'center',
                            cursor: disabled ? 'default' : 'pointer',
                            borderRadius: 2,
                            border: '2px solid',
                            borderColor: isSelected ? 'primary.main' : disabled ? 'grey.200' : 'grey.300',
                            bgcolor: isSelected ? 'primary.main' : disabled ? 'grey.50' : 'white',
                            color: isSelected ? 'white' : disabled ? 'grey.400' : 'text.primary',
                            opacity: disabled ? 0.5 : 1,
                            transition: 'all 0.2s',
                            '&:hover': disabled ? {} : {
                              borderColor: 'primary.main',
                              bgcolor: isSelected ? 'primary.main' : 'primary.50',
                            },
                          }}
                        >
                          <Typography variant="caption" sx={{ fontWeight: 500 }}>
                            {SHORT_DAY[dayOfWeek]}
                          </Typography>
                          <Typography variant="h5" fontWeight="bold">
                            {d.getDate().toString().padStart(2, '0')}
                          </Typography>
                          <Typography variant="caption">
                            {MONTH_NAMES[d.getMonth()].substring(0, 4)}
                          </Typography>
                        </Paper>
                      );
                    })}
                  </Box>

                  {/* ═══ Time slots grid ═══ */}
                  {formData.date && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="h6" align="center" gutterBottom fontWeight="bold">
                        Veuillez choisir l'heure du rendez-vous
                      </Typography>

                      {loadingSlots ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                          <CircularProgress size={36} />
                        </Box>
                      ) : availability?.hasSchedule === false ? (
                        <Alert severity="warning">Aucun horaire défini pour ce jour.</Alert>
                      ) : availability && availability.availableSlots.length === 0 && availability.bookedSlots.length === 0 ? (
                        <Alert severity="error" icon={<EventBusy />}>
                          Tous les créneaux sont pris pour cette date. Veuillez choisir une autre date.
                        </Alert>
                      ) : availability ? (
                        <>
                          {availability.availableSlots.length === 0 && availability.bookedSlots.length > 0 && (
                            <Alert severity="warning" sx={{ mb: 2 }} icon={<EventBusy />}>
                              Tous les créneaux disponibles sont déjà réservés pour cette date.
                            </Alert>
                          )}
                          <Grid container spacing={1.5}>
                            {[...availability.availableSlots, ...availability.bookedSlots]
                              .sort((a, b) => a.localeCompare(b))
                              .map((slot) => {
                                const isBooked = availability.bookedSlots.includes(slot);
                                const isSelected = formData.time === slot;
                                return (
                                  <Grid item xs={3} key={slot}>
                                    <Paper
                                      elevation={isSelected ? 4 : 0}
                                      onClick={() => !isBooked && setFormData((prev) => ({ ...prev, time: slot }))}
                                      sx={{
                                        py: 1.5,
                                        textAlign: 'center',
                                        cursor: isBooked ? 'not-allowed' : 'pointer',
                                        borderRadius: 2,
                                        border: '2px solid',
                                        borderColor: isBooked
                                          ? 'grey.200'
                                          : isSelected
                                            ? 'primary.main'
                                            : 'grey.200',
                                        bgcolor: isBooked
                                          ? '#f5f5f5'
                                          : isSelected
                                            ? 'primary.main'
                                            : 'grey.50',
                                        color: isBooked
                                          ? 'grey.400'
                                          : isSelected
                                            ? 'white'
                                            : 'text.primary',
                                        opacity: isBooked ? 0.5 : 1,
                                        pointerEvents: isBooked ? 'none' : 'auto',
                                        transition: 'all 0.15s',
                                        position: 'relative',
                                        '&:hover': isBooked ? {} : {
                                          borderColor: 'primary.main',
                                          bgcolor: isSelected ? 'primary.dark' : 'primary.50',
                                        },
                                      }}
                                    >
                                      <Typography
                                        variant="body1"
                                        fontWeight={isSelected ? 'bold' : 'medium'}
                                        sx={{
                                          textDecoration: isBooked ? 'line-through' : 'none',
                                        }}
                                      >
                                        {slot}
                                      </Typography>
                                      {isBooked && (
                                        <Typography
                                          variant="caption"
                                          sx={{ color: 'error.main', fontSize: '0.6rem', display: 'block', mt: 0.25 }}
                                        >
                                          Réservé
                                        </Typography>
                                      )}
                                    </Paper>
                                  </Grid>
                                );
                              })}
                          </Grid>
                        </>
                      ) : null}
                    </Box>
                  )}

                  {/* ═══ Selected slot recap + motif + confirm ═══ */}
                  {formData.time && (
                    <Box sx={{ mt: 3 }}>
                      <Alert severity="success" icon={<AccessTime />} sx={{ mb: 2 }}>
                        <strong>{formData.date}</strong> à <strong>{formData.time}</strong> — Dr {selectedDoctor?.firstName} {selectedDoctor?.lastName}
                      </Alert>

                      <TextField
                        fullWidth
                        label="Motif de consultation (optionnel)"
                        value={formData.motif}
                        onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
                        multiline
                        rows={2}
                        placeholder="Décrivez brièvement le motif de votre rendez-vous..."
                        size="small"
                      />

                      <Button
                        fullWidth
                        variant="contained"
                        onClick={handleCreate}
                        sx={{ mt: 2, py: 1.5, borderRadius: 2, fontWeight: 'bold', fontSize: '1rem' }}
                        disabled={!formData.time}
                      >
                        Confirmer le rendez-vous
                      </Button>
                    </Box>
                  )}
                </Box>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
