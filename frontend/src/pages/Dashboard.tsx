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
} from '@mui/icons-material';
import { OrdonnanceStatus } from '../types/ordonnance.types';
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
  const isPharmacien = user?.role === UserRole.PHARMACIEN;

  // Pharmacie dashboard state
  const [pharmaOrdonnances, setPharmaOrdonnances] = useState<any[]>([]);
  const [pharmaLoading, setPharmaLoading] = useState(false);

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
    } else {
      loadStats();
      if (isDoctorOrInfirmier) {
        loadDoctorData();
        loadMyPatients();
      }
    }
  }, []);

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
