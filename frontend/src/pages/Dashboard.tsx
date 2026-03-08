import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid, Card, CardContent, Typography, Box, Button, Alert, Chip, Divider, Stack, Paper,
  Tabs, Tab,
} from '@mui/material';
import {
  CalendarMonth, MedicalServices, LocalPharmacy, Science, Schedule,
  AccessTime, CheckCircle, Warning, ArrowForward, WbSunny, NightsStay,
  FolderShared, People, Add, Person, Cancel, HourglassEmpty,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { UserRole, User } from '../types/user.types';
import { DoctorSchedule, DAY_LABELS } from '../types/schedule.types';
import { Appointment, AppointmentStatus } from '../types/appointment.types';
import api from '../config/api';
import { toast } from 'react-toastify';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ appointments: 0, consultations: 0, ordonnances: 0, analyses: 0 });
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [myPatients, setMyPatients] = useState<User[]>([]);

  // Patient-specific state
  const [patientStats, setPatientStats] = useState({ total: 0, confirmes: 0, enAttente: 0, annules: 0 });
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [aptTab, setAptTab] = useState(0);

  const isDoctor = user?.role === UserRole.MEDECIN;
  const isInfirmier = user?.role === UserRole.INFIRMIER;
  const isPatient = user?.role === UserRole.PATIENT;
  const isDoctorOrInfirmier = isDoctor || isInfirmier;

  useEffect(() => {
    if (isPatient) {
      loadPatientData();
    } else {
      loadStats();
      if (isDoctorOrInfirmier) {
        loadDoctorData();
        loadMyPatients();
      }
    }
  }, []);

  const loadPatientData = async () => {
    try {
      const { data } = await api.get<Appointment[]>('/appointments');
      const all: Appointment[] = data;
      const today = new Date().toISOString().split('T')[0];
      setPatientStats({
        total: all.length,
        confirmes: all.filter((a) => a.status === AppointmentStatus.CONFIRME).length,
        enAttente: all.filter((a) => a.status === AppointmentStatus.EN_ATTENTE).length,
        annules: all.filter((a) => a.status === AppointmentStatus.ANNULE).length,
      });
      // sort all by date desc
      const sorted = [...all].sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
      setAllAppointments(sorted);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCancelAppointment = async (id: string) => {
    try {
      await api.patch(`/appointments/${id}/cancel`);
      toast.success('Rendez-vous annulé');
      loadPatientData();
    } catch {
      toast.error('Erreur lors de l\'annulation');
    }
  };

  const loadStats = async () => {
    try {
      const [appointments, consultations, ordonnances, analyses] = await Promise.all([
        api.get('/appointments'),
        api.get('/consultations'),
        api.get('/ordonnances'),
        api.get('/analyses'),
      ]);
      setStats({
        appointments: appointments.data.length,
        consultations: consultations.data.length,
        ordonnances: ordonnances.data.length,
        analyses: analyses.data.length,
      });

      if (isDoctorOrInfirmier) {
        const today = new Date().toISOString().split('T')[0];
        const allAppts: Appointment[] = appointments.data;
        setTodayAppointments(allAppts.filter((a) => a.date === today && a.status !== AppointmentStatus.ANNULE));
        setPendingCount(allAppts.filter((a) => a.status === AppointmentStatus.EN_ATTENTE).length);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadDoctorData = async () => {
    try {
      const { data } = await api.get<DoctorSchedule[]>('/schedules/me');
      setSchedules(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadMyPatients = async () => {
    try {
      const { data } = await api.get('/appointments/my-patients');
      setMyPatients(data);
    } catch (error) {
      console.error(error);
    }
  };

  const activeDays = schedules.filter((s) => s.isActive);
  const hasSchedule = activeDays.length > 0;

  const schedulesByDay = activeDays.reduce<Record<number, { morning?: DoctorSchedule; afternoon?: DoctorSchedule }>>((acc, s) => {
    if (!acc[s.dayOfWeek]) acc[s.dayOfWeek] = {};
    acc[s.dayOfWeek][s.period] = s;
    return acc;
  }, {});
  const scheduledDayNumbers = Object.keys(schedulesByDay).map(Number).sort();

  const cards = [
    { title: 'Rendez-vous', value: stats.appointments, icon: <CalendarMonth />, color: '#1976d2' },
    { title: 'Consultations', value: stats.consultations, icon: <MedicalServices />, color: '#4caf50' },
    { title: 'Ordonnances', value: stats.ordonnances, icon: <LocalPharmacy />, color: '#ff9800' },
    { title: 'Analyses', value: stats.analyses, icon: <Science />, color: '#9c27b0' },
  ];

  return (
    <Box>
      {/* ═══════════════ PATIENT DASHBOARD ═══════════════ */}
      {isPatient && (() => {
        const today = new Date().toISOString().split('T')[0];
        const tabFiltered = [
          // 0: À VENIR — not cancelled, date >= today
          allAppointments.filter((a) => a.status !== AppointmentStatus.ANNULE && a.date >= today),
          // 1: CONFIRMÉS
          allAppointments.filter((a) => a.status === AppointmentStatus.CONFIRME),
          // 2: EN ATTENTE
          allAppointments.filter((a) => a.status === AppointmentStatus.EN_ATTENTE),
          // 3: ANNULÉS
          allAppointments.filter((a) => a.status === AppointmentStatus.ANNULE),
        ];
        const displayed = tabFiltered[aptTab];

        return (
          <Box>
            {/* Title */}
            <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>Mes Rendez-vous</Typography>

            {/* Tabs */}
            <Tabs
              value={aptTab}
              onChange={(_, v) => setAptTab(v)}
              sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="À venir" />
              <Tab label="Confirmés" />
              <Tab label="En attente" />
              <Tab label="Annulés" />
            </Tabs>

            {/* Appointment cards */}
            {displayed.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                <CalendarMonth sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">Aucun rendez-vous dans cette catégorie.</Typography>
              </Paper>
            ) : (
              displayed.map((apt) => (
                <Paper key={apt.id} variant="outlined" sx={{ p: 2.5, mb: 2, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="subtitle1" fontWeight="bold">Rendez-vous</Typography>
                    <Chip
                      label={
                        apt.status === AppointmentStatus.CONFIRME ? 'Confirmé' :
                        apt.status === AppointmentStatus.EN_ATTENTE ? 'En attente' :
                        apt.status === AppointmentStatus.ANNULE ? 'Annulé' :
                        apt.status === AppointmentStatus.TERMINE ? 'Terminé' : apt.status
                      }
                      color={
                        apt.status === AppointmentStatus.CONFIRME ? 'success' :
                        apt.status === AppointmentStatus.ANNULE ? 'error' :
                        apt.status === AppointmentStatus.EN_ATTENTE ? 'warning' : 'default'
                      }
                      size="small"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Person sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      Dr. {apt.doctor?.firstName} {apt.doctor?.lastName}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <CalendarMonth sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      {new Date(apt.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccessTime sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2">{apt.time}</Typography>
                  </Box>
                  {apt.motif && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Motif: {apt.motif}
                    </Typography>
                  )}
                  {apt.status === AppointmentStatus.EN_ATTENTE && (
                    <>
                      <Divider sx={{ my: 1.5 }} />
                      <Button
                        fullWidth
                        variant="outlined"
                        color="error"
                        onClick={() => handleCancelAppointment(apt.id)}
                        sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}
                      >
                        Annuler
                      </Button>
                    </>
                  )}
                </Paper>
              ))
            )}
          </Box>
        );
      })()}

      {/* ═══════════════ DOCTOR / INFIRMIER / OTHER DASHBOARD ═══════════════ */}
      {!isPatient && (
        <Box>
          <Typography variant="h4" gutterBottom>
            Bienvenue, {user?.firstName} {user?.lastName}
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Rôle: {user?.role}
          </Typography>

          {isDoctor && !hasSchedule && (
            <Alert
              severity="warning"
              icon={<Warning />}
              action={
                <Button
                  color="warning"
                  size="small"
                  variant="outlined"
                  onClick={() => navigate('/schedule')}
                  endIcon={<ArrowForward />}
                >
                  Configurer
                </Button>
              }
              sx={{ mb: 3, mt: 2 }}
            >
              <strong>Aucune disponibilité définie !</strong> Vos patients ne peuvent pas encore prendre
              de rendez-vous. Configurez vos créneaux de consultation.
            </Alert>
          )}

          <Grid container spacing={3} sx={{ mt: 1 }}>
            {cards.map((card) => (
              <Grid item xs={12} sm={6} md={3} key={card.title}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography color="text.secondary" gutterBottom>
                          {card.title}
                        </Typography>
                        <Typography variant="h4">{card.value}</Typography>
                      </Box>
                      <Box sx={{ color: card.color, fontSize: 48 }}>
                        {card.icon}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {isDoctorOrInfirmier && (
            <>
              <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Schedule color="primary" />
                          <Typography variant="h6">{isInfirmier ? 'Disponibilités du Médecin' : 'Mes Disponibilités'}</Typography>
                        </Box>
                        {isDoctor && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => navigate('/schedule')}
                            endIcon={<ArrowForward />}
                          >
                            {hasSchedule ? 'Modifier' : 'Configurer'}
                          </Button>
                        )}
                      </Box>

                      {hasSchedule ? (
                        <>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                            {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                              const hasDay = schedulesByDay[day] !== undefined;
                              return (
                                <Chip
                                  key={day}
                                  label={DAY_LABELS[day].substring(0, 3)}
                                  size="small"
                                  color={hasDay ? 'primary' : 'default'}
                                  variant={hasDay ? 'filled' : 'outlined'}
                                  icon={hasDay ? <CheckCircle /> : undefined}
                                />
                              );
                            })}
                          </Stack>
                          <Divider sx={{ mb: 1.5 }} />
                          {scheduledDayNumbers.map((day) => {
                            const periods = schedulesByDay[day];
                            return (
                              <Box key={day} sx={{ mb: 1.5 }}>
                                <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
                                  {DAY_LABELS[day]}
                                </Typography>
                                {periods.morning && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 1, py: 0.2 }}>
                                    <WbSunny sx={{ fontSize: 16, color: '#ed6c02' }} />
                                    <Typography variant="body2" color="text.secondary">
                                      Matin : {periods.morning.startTime.substring(0, 5)} — {periods.morning.endTime.substring(0, 5)} • {periods.morning.slotDuration} min
                                    </Typography>
                                  </Box>
                                )}
                                {periods.afternoon && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 1, py: 0.2 }}>
                                    <NightsStay sx={{ fontSize: 16, color: '#1565c0' }} />
                                    <Typography variant="body2" color="text.secondary">
                                      Après-midi : {periods.afternoon.startTime.substring(0, 5)} — {periods.afternoon.endTime.substring(0, 5)} • {periods.afternoon.slotDuration} min
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            );
                          })}
                        </>
                      ) : (
                        <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
                          <Schedule sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                          <Typography variant="body2">Aucun horaire configuré.</Typography>
                          <Typography variant="caption">Cliquez sur « Configurer » pour définir vos créneaux.</Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarMonth color="primary" />
                          <Typography variant="h6">Aujourd'hui</Typography>
                        </Box>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => navigate('/appointments')}
                          endIcon={<ArrowForward />}
                        >
                          Voir tout
                        </Button>
                      </Box>

                      {pendingCount > 0 && (
                        <Alert severity="info" sx={{ mb: 2 }} icon={<AccessTime />}>
                          <strong>{pendingCount}</strong> rendez-vous en attente de confirmation
                        </Alert>
                      )}

                      {todayAppointments.length > 0 ? (
                        todayAppointments.map((apt) => (
                          <Box
                            key={apt.id}
                            sx={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              py: 1, borderBottom: '1px solid', borderColor: 'divider',
                            }}
                          >
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {apt.time} — {apt.patient?.firstName} {apt.patient?.lastName}
                              </Typography>
                              {apt.motif && (
                                <Typography variant="caption" color="text.secondary">
                                  {apt.motif}
                                </Typography>
                              )}
                            </Box>
                            <Chip
                              size="small"
                              label={
                                apt.status === AppointmentStatus.CONFIRME ? 'Confirmé' :
                                apt.status === AppointmentStatus.EN_ATTENTE ? 'En attente' :
                                apt.status === AppointmentStatus.TERMINE ? 'Terminé' : apt.status
                              }
                              color={
                                apt.status === AppointmentStatus.CONFIRME ? 'success' :
                                apt.status === AppointmentStatus.EN_ATTENTE ? 'warning' : 'info'
                              }
                            />
                          </Box>
                        ))
                      ) : (
                        <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
                          <CalendarMonth sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                          <Typography variant="body2">Aucun rendez-vous aujourd'hui.</Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Box sx={{ mt: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <People sx={{ fontSize: 28 }} />
                  <Typography variant="h5" fontWeight="bold">Mes Patients</Typography>
                </Box>

                {myPatients.length === 0 ? (
                  <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                    <People sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">
                      Aucun patient pour le moment. Les patients apparaîtront ici après leur première consultation.
                    </Typography>
                  </Paper>
                ) : (
                  myPatients.map((patient) => (
                    <Paper
                      key={patient.id}
                      variant="outlined"
                      sx={{ p: 2.5, mb: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
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
            </>
          )}
        </Box>
      )}
    </Box>
  );
}
