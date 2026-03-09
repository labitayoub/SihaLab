import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid, Card, CardContent, Typography, Box, Button, Alert, Chip, Divider, Stack, Paper,
  Tabs, Tab, Avatar,
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
import { toast, confirm } from '../utils/toast';

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
  const isAdmin = user?.role === UserRole.ADMIN;

  // Admin state
  const [adminStats, setAdminStats] = useState({ patients: 0, medecins: 0, pharmaciens: 0, laboratoires: 0, infirmiers: 0 });
  const [medecinsList, setMedecinsList] = useState<User[]>([]);
  const [allPatients, setAllPatients] = useState<User[]>([]);
  const [allInfirmiers, setAllInfirmiers] = useState<User[]>([]);
  const [adminAppointments, setAdminAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    } else if (isPatient) {
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
    const ok = await confirm({
      title: 'Annuler ce rendez-vous ?',
      text: 'Cette action est irréversible.',
      icon: 'warning',
      confirmText: 'Oui, annuler',
      confirmColor: '#f44336',
    });
    if (!ok) return;
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

  const loadAdminData = async () => {
    try {
      const [patients, medecins, pharmaciens, laboratoires, infirmiers, appointments] = await Promise.all([
        api.get('/users?role=patient&limit=200'),
        api.get('/users?role=medecin&limit=200'),
        api.get('/users?role=pharmacien&limit=200'),
        api.get('/users?role=laboratoire&limit=200'),
        api.get('/users?role=infirmier&limit=200'),
        api.get('/appointments'),
      ]);
      setAdminStats({
        patients: patients.data.total ?? (patients.data.data?.length || 0),
        medecins: medecins.data.total ?? (medecins.data.data?.length || 0),
        pharmaciens: pharmaciens.data.total ?? (pharmaciens.data.data?.length || 0),
        laboratoires: laboratoires.data.total ?? (laboratoires.data.data?.length || 0),
        infirmiers: infirmiers.data.total ?? (infirmiers.data.data?.length || 0),
      });
      setMedecinsList(medecins.data.data || []);
      setAllPatients(patients.data.data || []);
      setAllInfirmiers(infirmiers.data.data || []);
      setAdminAppointments(appointments.data || []);
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
  const doctorQuickLinks = [
    { title: 'Rendez-vous',   desc: 'Gérer les rendez-vous',    icon: <CalendarMonth sx={{ fontSize: 36 }} />,  path: '/appointments',  color: '#1565c0', bg: '#e3f2fd' },
    { title: 'Consultations', desc: 'Mes consultations',        icon: <MedicalServices sx={{ fontSize: 36 }} />, path: '/consultations', color: '#2e7d32', bg: '#e8f5e9' },
    { title: 'Mes Patients',  desc: 'Dossiers patients',        icon: <People sx={{ fontSize: 36 }} />,          path: '/mes-patients',  color: '#00695c', bg: '#e0f2f1' },
    { title: 'Mon Planning',  desc: 'Créneaux de consultation', icon: <Schedule sx={{ fontSize: 36 }} />,        path: '/schedule',      color: '#e65100', bg: '#fff3e0' },
    { title: 'Ordonnances',   desc: 'Gérer les ordonnances',    icon: <LocalPharmacy sx={{ fontSize: 36 }} />,   path: '/ordonnances',   color: '#6a1b9a', bg: '#f3e5f5' },
    { title: 'Analyses',      desc: 'Résultats d\'analyses',    icon: <Science sx={{ fontSize: 36 }} />,         path: '/analyses',      color: '#b71c1c', bg: '#ffebee' },
  ];

  const patientQuickLinks = [
    { title: 'Mes RDV',     desc: 'Prendre un rendez-vous', icon: <CalendarMonth sx={{ fontSize: 36 }} />,  path: '/appointments',    color: '#1565c0', bg: '#e3f2fd' },
    { title: 'Ordonnances', desc: 'Mes prescriptions',      icon: <LocalPharmacy sx={{ fontSize: 36 }} />,  path: '/ordonnances',     color: '#6a1b9a', bg: '#f3e5f5' },
    { title: 'Analyses',    desc: 'Mes résultats',          icon: <Science sx={{ fontSize: 36 }} />,        path: '/analyses',        color: '#b71c1c', bg: '#ffebee' },
    { title: 'Mon Dossier', desc: 'Dossier médical complet', icon: <FolderShared sx={{ fontSize: 36 }} />, path: '/dossier-medical', color: '#2e7d32', bg: '#e8f5e9' },
  ];

  const quickLinks = isPatient ? patientQuickLinks : isDoctorOrInfirmier ? doctorQuickLinks : [];
  return (
    <Box>
      {/* ═══════════════ ACCÈS RAPIDE ═══════════════ */}
      {quickLinks.length > 0 && (
        <Box 
          sx={{ 
            mb: 5,
            animation: 'fadeInDown 0.6s ease-out',
            '@keyframes fadeInDown': {
              from: { opacity: 0, transform: 'translateY(-15px)' },
              to: { opacity: 1, transform: 'translateY(0)' },
            }
          }}
        >
          <Typography variant="h5" fontWeight={800} sx={{ mb: 3, color: 'text.primary', letterSpacing: '-0.5px' }}>
            Accès rapide
          </Typography>
          <Grid container spacing={2}>
            {quickLinks.map((item, index) => (
              <Grid item xs={6} sm={4} md={Math.floor(12 / quickLinks.length)} key={item.title}>
                <Paper
                  elevation={0}
                  onClick={() => navigate(item.path)}
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: 'transparent',
                    backgroundColor: item.bg,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    animation: `fadeIn 0.5s ease-out ${index * 0.05}s backwards`,
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': { 
                      transform: 'translateY(-6px) scale(1.02)', 
                      boxShadow: `0 14px 28px ${item.color}25`,
                      borderColor: `${item.color}40`,
                      '& .hover-bg': { transform: 'scale(1.5)', opacity: 0.1 }
                    },
                  }}
                >
                  <Box className="hover-bg" sx={{ position: 'absolute', top: -20, left: -20, width: 80, height: 80, borderRadius: '50%', backgroundColor: item.color, opacity: 0.03, transition: 'all 0.5s ease', pointerEvents: 'none' }} />
                  
                  <Box sx={{ color: item.color, mb: 2, display: 'flex', justifyContent: 'center' }}>
                    {React.cloneElement(item.icon, { sx: { fontSize: 42, filter: `drop-shadow(0 4px 6px ${item.color}30)` } })}
                  </Box>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ color: item.color, mb: 0.5, letterSpacing: '0.3px' }}>
                    {item.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, opacity: 0.8 }} display="block">
                    {item.desc}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

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

      {/* ═══════════════ ADMIN DASHBOARD ═══════════════ */}
      {isAdmin && (
        <Box sx={{ animation: 'fadeIn 0.8s ease-out', '@keyframes fadeIn': { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } } }}>
          <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h3" fontWeight={800} sx={{ letterSpacing: '-1px', color: 'text.primary' }}>
              Tableau de bord Administrateur
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 500 }}>
              Bienvenue, {user?.firstName} {user?.lastName} — Supervisez et administrez la plateforme médicale.
            </Typography>
          </Box>

          {/* Statistiques globales */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {[
              { label: 'Patients',     value: adminStats.patients,     color: '#1976d2', bg: '#e3f2fd' },
              { label: 'Médecins',     value: adminStats.medecins,     color: '#2e7d32', bg: '#e8f5e9' },
              { label: 'Pharmaciens',  value: adminStats.pharmaciens,  color: '#e65100', bg: '#fff3e0' },
              { label: 'Laboratoires', value: adminStats.laboratoires, color: '#6a1b9a', bg: '#f3e5f5' },
              { label: 'Infirmiers',   value: adminStats.infirmiers,   color: '#00695c', bg: '#e0f2f1' },
            ].map((s) => (
              <Grid item xs={6} sm={4} md={12/5} key={s.label}>
                <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <Typography variant="h3" fontWeight={800} sx={{ color: s.color }}>{s.value}</Typography>
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', mt: 0.5 }}>{s.label}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Équipes Médicales */}
          <Typography variant="h5" fontWeight={800} sx={{ mb: 3, color: 'text.primary' }}>Équipes Médicales</Typography>
          {medecinsList.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
              <Typography color="text.secondary">Aucun médecin enregistré.</Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {medecinsList.map((medecin) => {
                const linkedPatientIds = new Set(
                  adminAppointments
                    .filter((a) => a.doctorId === medecin.id && a.status === AppointmentStatus.TERMINE)
                    .map((a) => a.patientId)
                );
                const linkedPatients = allPatients.filter((p) => linkedPatientIds.has(p.id));
                const linkedInfirmiers = allInfirmiers.filter((inf) => inf.createdBy === medecin.id);
                return (
                  <Grid item xs={12} md={6} lg={4} key={medecin.id}>
                    <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none', height: '100%' }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Avatar sx={{ bgcolor: '#1976d2', width: 48, height: 48, fontWeight: 700 }}>
                            {medecin.firstName?.[0]}{medecin.lastName?.[0]}
                          </Avatar>
                          <Box>
                            <Typography fontWeight={700}>Dr. {medecin.firstName} {medecin.lastName}</Typography>
                            <Typography variant="caption" color="text.secondary">{medecin.specialite || 'Médecin généraliste'}</Typography>
                          </Box>
                        </Box>
                        <Divider sx={{ mb: 2 }} />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Patients ({linkedPatients.length})
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1, mb: 2 }}>
                          {linkedPatients.length === 0 ? (
                            <Typography variant="body2" color="text.disabled">Aucun patient</Typography>
                          ) : linkedPatients.slice(0, 5).map((p) => (
                            <Chip key={p.id} size="small" label={`${p.firstName} ${p.lastName}`} />
                          ))}
                          {linkedPatients.length > 5 && <Chip size="small" label={`+${linkedPatients.length - 5}`} variant="outlined" />}
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Infirmiers ({linkedInfirmiers.length})
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                          {linkedInfirmiers.length === 0 ? (
                            <Typography variant="body2" color="text.disabled">Aucun infirmier</Typography>
                          ) : linkedInfirmiers.map((inf) => (
                            <Chip key={inf.id} size="small" label={`${inf.firstName} ${inf.lastName}`} color="info" variant="outlined" />
                          ))}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      )}

      {/* ═══════════════ DOCTOR / INFIRMIER DASHBOARD ═══════════════ */}
      {isDoctorOrInfirmier && (
        <Box
          sx={{
            animation: 'fadeIn 0.8s ease-out',
            '@keyframes fadeIn': {
              from: { opacity: 0, transform: 'translateY(20px)' },
              to: { opacity: 1, transform: 'translateY(0)' },
            },
          }}
        >
          <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h3" fontWeight={800} sx={{ letterSpacing: '-1px', color: 'text.primary' }}>
              Tableau de bord {isDoctor ? 'Médecin' : 'Infirmier(ère)'}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 500 }}>
              Bienvenue, {user?.firstName} {user?.lastName} — Gérez votre activité quotidienne avec efficacité.
            </Typography>
          </Box>

          {isDoctor && !hasSchedule && (
            <Alert
              severity="warning"
              icon={<Warning sx={{ fontSize: 28 }} />}
              action={
                <Button
                  color="warning"
                  size="small"
                  variant="contained"
                  onClick={() => navigate('/schedule')}
                  endIcon={<ArrowForward />}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
                >
                  Configurer
                </Button>
              }
              sx={{
                mb: 4,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'warning.light',
                backgroundColor: 'warning.50',
                '& .MuiAlert-message': { width: '100%' },
              }}
            >
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Aucune disponibilité définie
              </Typography>
              <Typography variant="body2">
                Vos patients ne peuvent pas encore prendre de rendez-vous. Configurez vos créneaux de consultation pour démarrer.
              </Typography>
            </Alert>
          )}

          {/* KPI CARDS */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {cards.map((card, index) => (
              <Grid item xs={12} sm={6} md={3} key={card.title}>
                <Card
                  sx={{
                    height: '100%',
                    borderRadius: 4,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                    animation: `slideUp 0.6s ease-out ${index * 0.1}s backwards`,
                    '@keyframes slideUp': {
                      from: { opacity: 0, transform: 'translateY(30px)' },
                      to: { opacity: 1, transform: 'translateY(0)' },
                    },
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      boxShadow: `0 12px 24px ${card.color}20`,
                      borderColor: card.color,
                      '& .bg-icon': {
                        transform: 'scale(1.1) rotate(-5deg)',
                        opacity: 0.1,
                      }
                    },
                  }}
                >
                  {/* Decorative background icon */}
                  <Box
                    className="bg-icon"
                    sx={{
                      position: 'absolute', right: -20, bottom: -20, color: card.color,
                      opacity: 0.05, transition: 'all 0.4s ease', zIndex: 0, pointerEvents: 'none',
                      '& > svg': { fontSize: 120 }
                    }}
                  >
                    {card.icon}
                  </Box>

                  <CardContent sx={{ position: 'relative', zIndex: 1, p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Box
                        sx={{
                          width: 48, height: 48, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          backgroundColor: `${card.color}15`, color: card.color,
                        }}
                      >
                        {card.icon}
                      </Box>
                      <Typography variant="h3" fontWeight={800} sx={{ color: 'text.primary' }}>
                        {card.value}
                      </Typography>
                    </Box>
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {card.title}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {isDoctorOrInfirmier && (
            <Grid container spacing={4} sx={{ mt: 1 }}>
              {/* PLANNING DU JOUR */}
              <Grid item xs={12} lg={7}>
                <Card
                  sx={{
                    height: '100%', borderRadius: 4, border: '1px solid', borderColor: 'divider',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.04)', overflow: 'visible',
                  }}
                >
                  <CardContent sx={{ p: '0 !important' }}>
                    <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ p: 1, borderRadius: 2, backgroundColor: 'primary.50', color: 'primary.main', display: 'flex' }}>
                          <CalendarMonth />
                        </Box>
                        <Box>
                          <Typography variant="h6" fontWeight={700}>Aujourd'hui</Typography>
                          <Typography variant="caption" color="text.secondary" fontWeight={500}>
                            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </Typography>
                        </Box>
                      </Box>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => navigate('/appointments')}
                        endIcon={<ArrowForward />}
                        sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none' }}
                      >
                        Voir l'agenda complet
                      </Button>
                    </Box>

                    {pendingCount > 0 && (
                      <Box sx={{ px: 3, pt: 2 }}>
                        <Alert
                          severity="info"
                          icon={<AccessTime sx={{ color: '#0288d1' }} />}
                          sx={{ borderRadius: 2, border: '1px solid #0288d130', backgroundColor: '#e1f5fe' }}
                        >
                          Vous avez <strong>{pendingCount} rendez-vous</strong> en attente de confirmation.
                        </Alert>
                      </Box>
                    )}

                    <Box sx={{ p: 2 }}>
                      {todayAppointments.length > 0 ? (
                        <Stack spacing={2}>
                          {todayAppointments.map((apt) => (
                            <Box
                              key={apt.id}
                              sx={{
                                display: 'flex', alignItems: 'center', p: 2, borderRadius: 3,
                                transition: 'all 0.2s ease', backgroundColor: 'background.paper',
                                border: '1px solid', borderColor: 'divider',
                                '&:hover': { backgroundColor: 'grey.50', borderColor: 'grey.300', transform: 'translateX(4px)' }
                              }}
                            >
                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 60, pr: 2, borderRight: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="subtitle2" fontWeight={800} color="primary.main">
                                  {apt.time}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                  Heure
                                </Typography>
                              </Box>
                              
                              <Box sx={{ flex: 1, pl: 2 }}>
                                <Typography variant="subtitle1" fontWeight={700}>
                                  {apt.patient?.firstName} {apt.patient?.lastName}
                                </Typography>
                                {apt.motif && (
                                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                    <MedicalServices sx={{ fontSize: 14 }} /> {apt.motif}
                                  </Typography>
                                )}
                              </Box>

                              <Chip
                                label={
                                  apt.status === AppointmentStatus.CONFIRME ? 'Confirmé' :
                                  apt.status === AppointmentStatus.EN_ATTENTE ? 'À valider' :
                                  apt.status === AppointmentStatus.TERMINE ? 'Terminé' : apt.status
                                }
                                color={
                                  apt.status === AppointmentStatus.CONFIRME ? 'success' :
                                  apt.status === AppointmentStatus.EN_ATTENTE ? 'warning' : 'default'
                                }
                                sx={{ fontWeight: 600, borderRadius: 2 }}
                              />
                            </Box>
                          ))}
                        </Stack>
                      ) : (
                        <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
                          <Box sx={{ display: 'inline-flex', p: 3, borderRadius: '50%', backgroundColor: 'grey.50', mb: 2 }}>
                            <Schedule sx={{ fontSize: 40, color: 'text.disabled' }} />
                          </Box>
                          <Typography variant="h6" fontWeight={700} color="text.secondary" gutterBottom>
                            Journée calme
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Aucun rendez-vous n'est prévu pour aujourd'hui.
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* DISPONIBILITÉS */}
              <Grid item xs={12} lg={5}>
                <Card
                  sx={{
                    height: '100%', borderRadius: 4, border: '1px solid', borderColor: 'divider',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
                    background: 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
                  }}
                >
                  <CardContent sx={{ p: '0 !important' }}>
                    <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ p: 1, borderRadius: 2, backgroundColor: 'secondary.50', color: 'secondary.main', display: 'flex' }}>
                          <HourglassEmpty />
                        </Box>
                        <Typography variant="h6" fontWeight={700}>
                          {isInfirmier ? 'Horaires du Cabinet' : 'Mes Horaires'}
                        </Typography>
                      </Box>
                      {isDoctor && (
                        <Button
                          size="small"
                          onClick={() => navigate('/schedule')}
                          sx={{ fontWeight: 600, textTransform: 'none', minWidth: 'auto', p: 1 }}
                        >
                          {hasSchedule ? 'Modifier' : 'Configurer'}
                        </Button>
                      )}
                    </Box>

                    <Box sx={{ p: 3 }}>
                      {hasSchedule ? (
                        <>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 4 }}>
                            {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                              const hasDay = schedulesByDay[day] !== undefined;
                              return (
                                <Box
                                  key={day}
                                  sx={{
                                    width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    borderRadius: '50%', fontSize: '0.75rem', fontWeight: 700,
                                    border: '1px solid',
                                    backgroundColor: hasDay ? 'primary.main' : 'transparent',
                                    color: hasDay ? 'primary.contrastText' : 'text.disabled',
                                    borderColor: hasDay ? 'primary.main' : 'divider',
                                    transition: 'all 0.2s',
                                    '&:hover': hasDay ? { transform: 'scale(1.1)' } : {},
                                  }}
                                >
                                  {DAY_LABELS[day].substring(0, 1)}
                                </Box>
                              );
                            })}
                          </Stack>
                          
                          <Stack spacing={2.5}>
                            {scheduledDayNumbers.map((day) => {
                              const periods = schedulesByDay[day];
                              return (
                                <Box key={day}>
                                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1, color: 'text.primary', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                    {DAY_LABELS[day]}
                                  </Typography>
                                  <Stack spacing={1}>
                                    {periods.morning && (
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: 2, backgroundColor: '#fff', border: '1px solid', borderColor: 'divider', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                                        <WbSunny sx={{ fontSize: 20, color: '#f57c00' }} />
                                        <Box>
                                          <Typography variant="body2" fontWeight={700}>
                                            {periods.morning.startTime.substring(0, 5)} — {periods.morning.endTime.substring(0, 5)}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            Créneaux de {periods.morning.slotDuration} min
                                          </Typography>
                                        </Box>
                                      </Box>
                                    )}
                                    {periods.afternoon && (
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: 2, backgroundColor: '#fff', border: '1px solid', borderColor: 'divider', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                                        <NightsStay sx={{ fontSize: 20, color: '#1976d2' }} />
                                        <Box>
                                          <Typography variant="body2" fontWeight={700}>
                                            {periods.afternoon.startTime.substring(0, 5)} — {periods.afternoon.endTime.substring(0, 5)}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            Créneaux de {periods.afternoon.slotDuration} min
                                          </Typography>
                                        </Box>
                                      </Box>
                                    )}
                                  </Stack>
                                </Box>
                              );
                            })}
                          </Stack>
                        </>
                      ) : (
                        <Box sx={{ textAlign: 'center', py: 4, px: 2, backgroundColor: 'grey.50', borderRadius: 3, border: '1px dashed', borderColor: 'divider' }}>
                          <Schedule sx={{ fontSize: 40, color: 'text.disabled', mb: 2 }} />
                          <Typography variant="subtitle1" fontWeight={700} color="text.secondary" gutterBottom>
                            Aucun horaire configuré
                          </Typography>
                          <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
                            Définissez vos jours et heures de consultation.
                          </Typography>
                          <Button variant="contained" onClick={() => navigate('/schedule')} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}>
                            Définir mes horaires
                          </Button>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

            </Grid>
          )}
        </Box>
      )}
    </Box>
  );
}
