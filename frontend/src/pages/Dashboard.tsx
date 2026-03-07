import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid, Card, CardContent, Typography, Box, Button, Alert, Chip, Divider, Stack,
} from '@mui/material';
import {
  CalendarMonth, MedicalServices, LocalPharmacy, Science, Schedule,
  AccessTime, CheckCircle, Warning, ArrowForward, WbSunny, NightsStay,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user.types';
import { DoctorSchedule, DAY_LABELS } from '../types/schedule.types';
import { Appointment, AppointmentStatus } from '../types/appointment.types';
import api from '../config/api';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ appointments: 0, consultations: 0, ordonnances: 0, analyses: 0 });
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  const isDoctor = user?.role === UserRole.MEDECIN;
  const isInfirmier = user?.role === UserRole.INFIRMIER;
  const isDoctorOrInfirmier = isDoctor || isInfirmier;

  useEffect(() => {
    loadStats();
    if (isDoctorOrInfirmier) {
      loadDoctorData();
    }
  }, []);

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

      // Compter les RDV en attente et ceux d'aujourd'hui
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

  const activeDays = schedules.filter((s) => s.isActive);
  const hasSchedule = activeDays.length > 0;

  // Group schedules by day for display
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
      <Typography variant="h4" gutterBottom>
        Bienvenue, {user?.firstName} {user?.lastName}
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Rôle: {user?.role}
      </Typography>

      {/* ── Alerte médecin sans disponibilités ────────── */}
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

      {/* ── Stats cards ─────────────────────────────────── */}
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

      {/* ── Section médecin / infirmier : Disponibilités + RDV du jour ── */}
      {isDoctorOrInfirmier && (
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Carte Mes Disponibilités */}
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
                    <Typography variant="body2">
                      Aucun horaire configuré.
                    </Typography>
                    <Typography variant="caption">
                      Cliquez sur « Configurer » pour définir vos créneaux.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Carte RDV du jour + en attente */}
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
      )}
    </Box>
  );
}
