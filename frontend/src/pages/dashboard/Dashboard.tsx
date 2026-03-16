import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid, Card, CardContent, Typography, Box, Button, Alert, Chip, Divider, Stack, Paper,
  Tabs, Tab, Avatar, CircularProgress
} from '@mui/material';
import {
  CalendarMonth, MedicalServices, LocalPharmacy, Science, Schedule,
  AccessTime, CheckCircle, Warning, ArrowForward, WbSunny, NightsStay,
  FolderShared, People, Add, Person, Cancel, HourglassEmpty,
  AdminPanelSettings, LocalHospital, TrendingUp, Biotech, EventNote,
  PlayArrow, Assessment,
} from '@mui/icons-material';
import { OrdonnanceStatus } from '../../types/ordonnance.types';
import { useAuth } from '../../context/AuthContext';
import { UserRole, User } from '../../types/user.types';
import { DoctorSchedule, DAY_LABELS } from '../../types/schedule.types';
import { Appointment, AppointmentStatus } from '../../types/appointment.types';
import api from '../../config/api';
import { toast, confirm } from '../../utils/toast';

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
  const isPharmacien = user?.role === UserRole.PHARMACIEN;
  const isLaboratoire = user?.role === UserRole.LABORATOIRE;

  // Pharmacie dashboard state
  const [pharmaOrdonnances, setPharmaOrdonnances] = useState<any[]>([]);
  const [pharmaLoading, setPharmaLoading] = useState(false);

  // Laboratory dashboard state
  const [laboAnalyses, setLaboAnalyses] = useState<any[]>([]);
  const [laboLoading, setLaboLoading] = useState(false);

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
    } else if (isPharmacien) {
      loadPharmaOrdonnances();
    } else if (isLaboratoire) {
      loadLaboAnalyses();
    } else {
      loadStats();
      if (isDoctorOrInfirmier) {
        loadDoctorData();
        loadMyPatients();
      }
    }
  }, []);

  useEffect(() => {
    if (!isDoctorOrInfirmier || !user?.id) {
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      return;
    }

    const rawBase = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
    const base = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
    const streamUrl = `${base}/events/doctor-status?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed?.type === 'ordonnance.served') {
          loadStats();
        }
      } catch {
        // Ignore malformed stream events.
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [isDoctorOrInfirmier, user?.id]);

  const loadPharmaOrdonnances = async () => {
    setPharmaLoading(true);
    try {
      const { data } = await api.get('/ordonnances?pharmacienId=' + user?.id);
      setPharmaOrdonnances(data);
    } catch {
      setPharmaOrdonnances([]);
    } finally {
      setPharmaLoading(false);
    }
  };

  const loadLaboAnalyses = async () => {
    setLaboLoading(true);
    try {
      const { data } = await api.get('/analyses');
      setLaboAnalyses(data);
    } catch {
      setLaboAnalyses([]);
    } finally {
      setLaboLoading(false);
    }
  };

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

      {/* DOCTOR DASHBOARD */}
      {isDoctorOrInfirmier && (
        <Box sx={{ mb: 5 }}>
          <Typography variant="h5" fontWeight={800} sx={{ mb: 3, color: 'text.primary', letterSpacing: '-0.5px' }}>
            Tableau de bord medecin
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold">Rendez-vous du jour</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {pendingCount > 0 && <Chip label={`${pendingCount} en attente`} color="warning" size="small" />}
                    <Button size="small" onClick={() => navigate('/appointments')} endIcon={<ArrowForward />}>
                      Voir tout
                    </Button>
                  </Stack>
                </Box>
                {todayAppointments.length === 0 ? (
                  <Alert severity="info">Aucun rendez-vous aujourd'hui.</Alert>
                ) : (
                  <Stack spacing={1}>
                    {[...todayAppointments]
                      .sort((a, b) => a.time.localeCompare(b.time))
                      .map((apt) => (
                        <Paper
                          key={apt.id}
                          variant="outlined"
                          sx={{ p: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}
                        >
                          <Avatar sx={{ bgcolor: '#1976d2', width: 36, height: 36 }}>
                            {(apt.patient?.firstName?.[0] || '?').toUpperCase()}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {apt.patient?.firstName} {apt.patient?.lastName}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <AccessTime sx={{ fontSize: 13, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {apt.time?.substring(0, 5)} — {apt.motif || 'Sans motif'}
                              </Typography>
                            </Box>
                          </Box>
                          <Chip
                            label={
                              apt.status === AppointmentStatus.CONFIRME ? 'Confirme' :
                              apt.status === AppointmentStatus.EN_ATTENTE ? 'En attente' :
                              apt.status === AppointmentStatus.ANNULE ? 'Annule' :
                              apt.status === AppointmentStatus.TERMINE ? 'Termine' : apt.status
                            }
                            color={
                              apt.status === AppointmentStatus.CONFIRME ? 'success' :
                              apt.status === AppointmentStatus.ANNULE ? 'error' :
                              apt.status === AppointmentStatus.EN_ATTENTE ? 'warning' : 'default'
                            }
                            size="small"
                          />
                        </Paper>
                      ))}
                  </Stack>
                )}
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold">Creneaux de disponibilite</Typography>
                  <Button size="small" onClick={() => navigate('/schedule')} endIcon={<ArrowForward />}>
                    Gerer
                  </Button>
                </Box>
                {!hasSchedule ? (
                  <Alert severity="info">Aucun creneau actif. Configurez votre planning.</Alert>
                ) : (
                  <Stack spacing={1}>
                    {scheduledDayNumbers.map((day) => {
                      const daySchedule = schedulesByDay[day];
                      return (
                        <Box
                          key={day}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1,
                            p: 1,
                            border: '1px dashed',
                            borderColor: 'divider',
                            borderRadius: 1,
                          }}
                        >
                          <Typography variant="subtitle2" fontWeight="bold">{DAY_LABELS[day]}</Typography>
                          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                            {daySchedule.morning && (
                              <Chip
                                icon={<WbSunny />}
                                label={`Matin ${daySchedule.morning.startTime}-${daySchedule.morning.endTime}`}
                                size="small"
                                color="warning"
                                variant="outlined"
                              />
                            )}
                            {daySchedule.afternoon && (
                              <Chip
                                icon={<NightsStay />}
                                label={`Apres-midi ${daySchedule.afternoon.startTime}-${daySchedule.afternoon.endTime}`}
                                size="small"
                                color="info"
                                variant="outlined"
                              />
                            )}
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ═══════════════ ADMIN DASHBOARD ═══════════════ */}
      {isAdmin && (() => {
        const totalUsers = adminStats.patients + adminStats.medecins + adminStats.pharmaciens + adminStats.laboratoires + adminStats.infirmiers;
        const todayStr = new Date().toISOString().split('T')[0];
        const todayAdminAppts = adminAppointments.filter((a: any) => a.date === todayStr);
        const pendingAdminAppts = adminAppointments.filter((a: any) => a.status === AppointmentStatus.EN_ATTENTE);
        const confirmedAdminAppts = adminAppointments.filter((a: any) => a.status === AppointmentStatus.CONFIRME);

        const statCards = [
          { title: 'Médecins',    value: adminStats.medecins,     icon: <MedicalServices />, color: '#1976d2', bg: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)' },
          { title: 'Patients',    value: adminStats.patients,     icon: <People />,          color: '#2e7d32', bg: 'linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%)' },
          { title: 'Infirmiers',  value: adminStats.infirmiers,   icon: <LocalHospital />,   color: '#ed6c02', bg: 'linear-gradient(135deg, #ed6c02 0%, #ffa726 100%)' },
          { title: 'Pharmaciens', value: adminStats.pharmaciens,  icon: <LocalPharmacy />,   color: '#9c27b0', bg: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)' },
          { title: 'Laboratoires',value: adminStats.laboratoires, icon: <Biotech />,         color: '#d32f2f', bg: 'linear-gradient(135deg, #d32f2f 0%, #ef5350 100%)' },
          { title: 'Total RDV',   value: adminAppointments.length,icon: <CalendarMonth />,   color: '#0288d1', bg: 'linear-gradient(135deg, #0288d1 0%, #29b6f6 100%)' },
        ];

        return (
          <Box sx={{ animation: 'fadeIn 0.5s ease-out', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
              <Box>
                <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <AdminPanelSettings sx={{ fontSize: 36, color: '#1976d2' }} />
                  Tableau de bord Admin
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Vue d'ensemble de la plateforme SihatiLab — {totalUsers} utilisateurs inscrits
                </Typography>
              </Box>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={2.5} sx={{ mb: 4 }}>
              {statCards.map((card, index) => (
                <Grid item xs={6} sm={4} md={2} key={card.title}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 3,
                      background: card.bg,
                      color: '#fff',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      animation: `slideUp 0.4s ease-out ${index * 0.08}s backwards`,
                      '@keyframes slideUp': { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
                      '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 12px 24px ${card.color}40` },
                    }}
                  >
                    <Box sx={{ position: 'absolute', top: -10, right: -10, opacity: 0.15 }}>
                      {React.cloneElement(card.icon, { sx: { fontSize: 80 } })}
                    </Box>
                    <Box sx={{ position: 'relative', zIndex: 1 }}>
                      <Typography variant="h3" fontWeight={800} sx={{ lineHeight: 1.1 }}>{card.value}</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.9, fontWeight: 600 }}>{card.title}</Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            {/* Main Content: 2 columns */}
            <Grid container spacing={3}>
              {/* Left Column: Médecins */}
              <Grid item xs={12} md={7}>
                <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                  <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <MedicalServices sx={{ color: '#1976d2' }} />
                      <Typography variant="h6" fontWeight={700}>Médecins ({adminStats.medecins})</Typography>
                    </Box>
                    <Button size="small" onClick={() => navigate('/users')} endIcon={<ArrowForward />} sx={{ textTransform: 'none', fontWeight: 600 }}>
                      Voir tous
                    </Button>
                  </Box>
                  {medecinsList.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                      <Typography color="text.secondary">Aucun médecin inscrit.</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ maxHeight: 420, overflowY: 'auto' }}>
                      {medecinsList.map((doc: any, i: number) => {
                        const docPatients = adminAppointments.filter(
                          (a: any) => a.doctorId === doc.id && (a.status === AppointmentStatus.CONFIRME || a.status === AppointmentStatus.TERMINE)
                        );
                        const uniquePatientIds = new Set(docPatients.map((a: any) => a.patientId));
                        const docInfirmiers = allInfirmiers.filter((inf: any) => inf.createdBy === doc.id);

                        return (
                          <Box
                            key={doc.id}
                            sx={{
                              p: 2,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                              borderBottom: i < medecinsList.length - 1 ? '1px solid' : 'none',
                              borderColor: 'divider',
                              transition: 'background 0.2s',
                              '&:hover': { bgcolor: 'action.hover' },
                            }}
                          >
                            <Avatar sx={{ bgcolor: '#1976d2', width: 44, height: 44, fontWeight: 700, fontSize: 16 }}>
                              {(doc.firstName?.[0] || '').toUpperCase()}{(doc.lastName?.[0] || '').toUpperCase()}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="subtitle2" fontWeight={700} noWrap>
                                Dr. {doc.firstName} {doc.lastName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {doc.specialite || 'Généraliste'} — {doc.ville || 'Non spécifié'}
                              </Typography>
                            </Box>
                            <Stack direction="row" spacing={1}>
                              <Chip
                                icon={<People sx={{ fontSize: 14 }} />}
                                label={`${uniquePatientIds.size} patients`}
                                size="small"
                                sx={{ fontWeight: 600, bgcolor: '#e3f2fd', color: '#1565c0' }}
                              />
                              <Chip
                                icon={<LocalHospital sx={{ fontSize: 14 }} />}
                                label={`${docInfirmiers.length} inf.`}
                                size="small"
                                sx={{ fontWeight: 600, bgcolor: '#fff3e0', color: '#e65100' }}
                              />
                            </Stack>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Paper>
              </Grid>

              {/* Right Column: Today Appointments + Summary */}
              <Grid item xs={12} md={5}>
                <Stack spacing={3}>
                  {/* Summary mini-cards */}
                  <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TrendingUp sx={{ color: '#2e7d32' }} /> Résumé des rendez-vous
                    </Typography>
                    <Grid container spacing={1.5}>
                      <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, bgcolor: '#fff3e0' }}>
                          <Typography variant="h5" fontWeight={800} color="#e65100">{pendingAdminAppts.length}</Typography>
                          <Typography variant="caption" fontWeight={600} color="text.secondary">En attente</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, bgcolor: '#e8f5e9' }}>
                          <Typography variant="h5" fontWeight={800} color="#2e7d32">{confirmedAdminAppts.length}</Typography>
                          <Typography variant="caption" fontWeight={600} color="text.secondary">Confirmés</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, bgcolor: '#e3f2fd' }}>
                          <Typography variant="h5" fontWeight={800} color="#1565c0">{todayAdminAppts.length}</Typography>
                          <Typography variant="caption" fontWeight={600} color="text.secondary">Aujourd'hui</Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Recent Appointments */}
                  <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                    <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EventNote sx={{ color: '#e65100' }} />
                        <Typography variant="subtitle1" fontWeight={700}>Rendez-vous récents</Typography>
                      </Box>
                      <Button size="small" onClick={() => navigate('/appointments')} endIcon={<ArrowForward />} sx={{ textTransform: 'none', fontWeight: 600 }}>
                        Tout voir
                      </Button>
                    </Box>
                    {adminAppointments.length === 0 ? (
                      <Box sx={{ p: 4, textAlign: 'center' }}>
                        <Typography color="text.secondary">Aucun rendez-vous.</Typography>
                      </Box>
                    ) : (
                      <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                        {[...adminAppointments]
                          .sort((a: any, b: any) => (b.date + b.time).localeCompare(a.date + a.time))
                          .slice(0, 10)
                          .map((apt: any) => (
                            <Box
                              key={apt.id}
                              sx={{
                                p: 1.5,
                                px: 2,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                '&:last-child': { borderBottom: 'none' },
                                '&:hover': { bgcolor: 'action.hover' },
                              }}
                            >
                              <Avatar sx={{ bgcolor: '#e3f2fd', color: '#1976d2', width: 34, height: 34, fontSize: 13, fontWeight: 700 }}>
                                {(apt.patient?.firstName?.[0] || '?').toUpperCase()}
                              </Avatar>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" fontWeight={600} noWrap>
                                  {apt.patient?.firstName || 'Patient'} {apt.patient?.lastName || ''}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {apt.date} à {apt.time?.substring(0, 5)} — Dr. {apt.doctor?.lastName || '?'}
                                </Typography>
                              </Box>
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
                                sx={{ fontWeight: 600, fontSize: 11 }}
                              />
                            </Box>
                          ))}
                      </Box>
                    )}
                  </Paper>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        );
      })()}

      {/* ═══════════════ PHARMACIE DASHBOARD ═══════════════ */}
      {isPharmacien && (() => {
        const stats = {
          total: pharmaOrdonnances.length,
          enAttente: pharmaOrdonnances.filter((o) => o.status === OrdonnanceStatus.EN_ATTENTE).length,
          delivrees: pharmaOrdonnances.filter((o) => o.status === OrdonnanceStatus.DELIVREE).length,
        };
        return (
          <Box sx={{ maxWidth: 900, mx: 'auto', mt: 4 }}>
            <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
              <LocalPharmacy sx={{ mr: 1, verticalAlign: 'middle' }} /> Tableau de bord Pharmacie
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
              <Stack direction="row" spacing={4}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Total ordonnances</Typography>
                  <Typography variant="h5" fontWeight="bold">{stats.total}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">En attente</Typography>
                  <Typography variant="h5" color="warning.main" fontWeight="bold">{stats.enAttente}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Délivrées</Typography>
                  <Typography variant="h5" color="success.main" fontWeight="bold">{stats.delivrees}</Typography>
                </Box>
              </Stack>
            </Paper>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 2 }}>Ordonnances à traiter</Typography>
            {pharmaLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : pharmaOrdonnances.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                <Typography color="text.secondary">Aucune ordonnance assignée à votre pharmacie.</Typography>
              </Paper>
            ) : (
              pharmaOrdonnances.map((o) => (
                <Paper key={o.id} variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Typography fontWeight="bold">Patient :</Typography>
                    <Typography>{o.consultation?.patient?.firstName} {o.consultation?.patient?.lastName}</Typography>
                    <Chip label={o.status === OrdonnanceStatus.EN_ATTENTE ? 'En attente' : 'Délivrée'} color={o.status === OrdonnanceStatus.EN_ATTENTE ? 'warning' : 'success'} size="small" sx={{ ml: 2 }} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Date : {o.createdAt ? new Date(o.createdAt).toLocaleDateString('fr-FR') : '—'}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">Médicaments :</Typography>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {o.medicaments?.map((m: any, i: number) => (
                      <li key={i}>{m.nom} {m.dosage && `- ${m.dosage}`}</li>
                    ))}
                  </ul>
                  {/* Actions à ajouter ici (valider, PDF, etc.) */}
                </Paper>
              ))
            )}
          </Box>
        );
      })()}

      {/* ═══════════════ LABORATOIRE DASHBOARD ═══════════════ */}
      {isLaboratoire && (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const stats = {
          total: laboAnalyses.length,
          enAttente: laboAnalyses.filter((a) => a.status === 'EN_ATTENTE').length,
          enCours: laboAnalyses.filter((a) => a.status === 'EN_COURS').length,
          terminees: laboAnalyses.filter((a) => a.status === 'TERMINEE').length,
          termineesAujourdhui: laboAnalyses.filter((a) => {
            if (!a.dateResultat) return false;
            const resultDate = new Date(a.dateResultat);
            resultDate.setHours(0, 0, 0, 0);
            return resultDate.getTime() === today.getTime() && a.status === 'TERMINEE';
          }).length,
          patientsUniques: new Set(
            laboAnalyses
              .filter((a) => a.consultation?.patient?.id)
              .map((a) => a.consultation.patient.id)
          ).size,
        };

        // Calculate average processing time
        const completedWithDates = laboAnalyses.filter((a) => a.dateResultat && a.createdAt && a.status === 'TERMINEE');

        // Recent completed analyses
        const recentCompleted = [...laboAnalyses]
          .filter((a) => a.status === 'TERMINEE')
          .sort((a, b) => {
            const dateA = a.dateResultat ? new Date(a.dateResultat).getTime() : 0;
            const dateB = b.dateResultat ? new Date(b.dateResultat).getTime() : 0;
            return dateB - dateA;
          })
          .slice(0, 10);

        const statCards = [
          { title: 'Total Analyses', value: stats.total, icon: <Science />, color: '#0369a1', bg: 'linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)' },
          { title: 'En Attente', value: stats.enAttente, icon: <HourglassEmpty />, color: '#ea580c', bg: 'linear-gradient(135deg, #ea580c 0%, #fb923c 100%)' },
          { title: 'En Cours', value: stats.enCours, icon: <PlayArrow />, color: '#0284c7', bg: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)' },
          { title: 'Terminées', value: stats.terminees, icon: <CheckCircle />, color: '#16a34a', bg: 'linear-gradient(135deg, #16a34a 0%, #4ade80 100%)' },
          { title: 'Terminées Aujourd\'hui', value: stats.termineesAujourdhui, icon: <Assessment />, color: '#15803d', bg: 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)' },
          { title: 'Patients Uniques', value: stats.patientsUniques, icon: <People />, color: '#b45309', bg: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)' },
        ];

        return (
          <Box sx={{ animation: 'fadeIn 0.5s ease-out', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
              <Box>
                <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Science sx={{ fontSize: 36, color: '#0369a1' }} />
                  Tableau de bord Laboratoire
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Vue d'ensemble des analyses médicales — {stats.patientsUniques} patients
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<FolderShared />}
                onClick={() => navigate('/laboratory/dossiers')}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Dossiers Patients
              </Button>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={2.5} sx={{ mb: 4 }}>
              {statCards.map((card, index) => (
                <Grid item xs={6} sm={4} md={2} key={card.title}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 3,
                      background: card.bg,
                      color: '#fff',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      animation: `slideUp 0.4s ease-out ${index * 0.08}s backwards`,
                      '@keyframes slideUp': { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
                      '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 12px 24px ${card.color}40` },
                    }}
                  >
                    <Box sx={{ position: 'absolute', top: -10, right: -10, opacity: 0.15 }}>
                      {React.cloneElement(card.icon, { sx: { fontSize: 80 } })}
                    </Box>
                    <Box sx={{ position: 'relative', zIndex: 1 }}>
                      <Typography variant="h3" fontWeight={800} sx={{ lineHeight: 1.1 }}>{card.value}</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.9, fontWeight: 600, fontSize: '0.75rem' }}>{card.title}</Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            {/* Performance Metrics */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, textAlign: 'center', bgcolor: '#dbeafe', border: '1px solid #bfdbfe' }}>
                  <TrendingUp sx={{ fontSize: 48, color: '#0369a1', mb: 1 }} />
                  <Typography variant="h3" fontWeight={800} color="#0369a1">
                    {stats.terminees > 0 ? Math.round((stats.termineesAujourdhui / stats.terminees) * 100) : 0}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    Taux de Complétion Aujourd'hui
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, textAlign: 'center', bgcolor: '#fce7f3', border: '1px solid #fbcfe8' }}>
                  <Assessment sx={{ fontSize: 48, color: '#be185d', mb: 1 }} />
                  <Typography variant="h3" fontWeight={800} color="#be185d">
                    {stats.enAttente + stats.enCours}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    Analyses en Cours de Traitement
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Main Content: 2 columns */}
            <Grid container spacing={3}>
              {/* Left Column: Pending Analyses */}
              <Grid item xs={12} md={7}>
                <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                  <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <HourglassEmpty sx={{ color: '#ea580c' }} />
                      <Typography variant="h6" fontWeight={700}>Analyses en Attente ({stats.enAttente})</Typography>
                    </Box>
                    <Button size="small" onClick={() => navigate('/laboratory')} endIcon={<ArrowForward />} sx={{ textTransform: 'none', fontWeight: 600 }}>
                      Traiter
                    </Button>
                  </Box>
                  {laboLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                      <CircularProgress />
                    </Box>
                  ) : stats.enAttente === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                      <CheckCircle sx={{ fontSize: 48, color: '#22c55e', mb: 1 }} />
                      <Typography color="text.secondary">Aucune analyse en attente.</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ maxHeight: 500, overflowY: 'auto' }}>
                      {laboAnalyses
                        .filter((a) => a.status === 'EN_ATTENTE')
                        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                        .map((analyse, i) => (
                          <Box
                            key={analyse.id}
                            sx={{
                              p: 2,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                              borderBottom: '1px solid',
                              borderColor: 'divider',
                              transition: 'background 0.2s',
                              cursor: 'pointer',
                              '&:hover': { bgcolor: 'action.hover' },
                            }}
                            onClick={() => navigate('/laboratory')}
                          >
                            <Avatar sx={{ bgcolor: '#ea580c', width: 44, height: 44, fontWeight: 700, fontSize: 16 }}>
                              {(analyse.consultation?.patient?.firstName?.[0] || '?').toUpperCase()}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="subtitle2" fontWeight={700} noWrap>
                                {analyse.consultation?.patient?.firstName} {analyse.consultation?.patient?.lastName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {analyse.description || 'Analyse médicale'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Demandé le {new Date(analyse.createdAt).toLocaleDateString('fr-FR')}
                              </Typography>
                            </Box>
                            <Chip
                              label="En attente"
                              size="small"
                              sx={{ fontWeight: 600, bgcolor: '#fff3e0', color: '#ea580c' }}
                            />
                          </Box>
                        ))}
                    </Box>
                  )}
                </Paper>
              </Grid>

              {/* Right Column: Recent Completed */}
              <Grid item xs={12} md={5}>
                <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                  <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <CheckCircle sx={{ color: '#16a34a' }} />
                      <Typography variant="h6" fontWeight={700}>Récemment Terminées</Typography>
                    </Box>
                    <Button size="small" onClick={() => navigate('/laboratory/dossiers')} endIcon={<ArrowForward />} sx={{ textTransform: 'none', fontWeight: 600 }}>
                      Voir tout
                    </Button>
                  </Box>
                  {recentCompleted.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                      <Typography color="text.secondary">Aucune analyse terminée.</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ maxHeight: 500, overflowY: 'auto' }}>
                      {recentCompleted.map((analyse) => (
                        <Box
                          key={analyse.id}
                          sx={{
                            p: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            '&:last-child': { borderBottom: 'none' },
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                          onClick={() => navigate('/laboratory/dossiers')}
                        >
                          <Avatar sx={{ bgcolor: '#e8f5e9', color: '#16a34a', width: 44, height: 44, fontSize: 16, fontWeight: 700 }}>
                            {(analyse.consultation?.patient?.firstName?.[0] || '?').toUpperCase()}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2" fontWeight={700} noWrap>
                              {analyse.consultation?.patient?.firstName || 'Patient'} {analyse.consultation?.patient?.lastName || ''}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {analyse.description || 'Analyse'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {analyse.dateResultat ? new Date(analyse.dateResultat).toLocaleDateString('fr-FR') : '—'}
                            </Typography>
                          </Box>
                          <Chip
                            label="Terminée"
                            size="small"
                            sx={{ fontWeight: 600, bgcolor: '#e8f5e9', color: '#16a34a' }}
                          />
                        </Box>
                      ))}
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Box>
        );
      })()}

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
                <React.Fragment key={apt.id}>
                  <Paper variant="outlined" sx={{ p: 2.5, mb: 2, borderRadius: 2 }}>
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
                      {/* Additional appointment info here if needed */}
                    </Box>
                  </Paper>
                </React.Fragment>
              ))
            )}
          </Box>
        );
      })()}
    </Box>
  );
}
