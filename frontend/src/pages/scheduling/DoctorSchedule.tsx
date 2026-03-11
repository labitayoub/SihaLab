import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Switch, TextField, Button, Grid,
  FormControlLabel, Divider, Chip, Alert, CircularProgress, Stack,
} from '@mui/material';
import { Schedule, Save, WbSunny, NightsStay, Restaurant } from '@mui/icons-material';
import { DoctorSchedule as DoctorScheduleType, DayScheduleForm, DAY_LABELS } from '../../types/schedule.types';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/user.types';
import api from '../../config/api';
import { toast } from '../../utils/toast';

const DEFAULT_SCHEDULES: DayScheduleForm[] = [
  { dayOfWeek: 1, isActive: true, morningActive: true, morningStart: '08:00', morningEnd: '12:00', afternoonActive: true, afternoonStart: '14:00', afternoonEnd: '18:00', slotDuration: 30 },
  { dayOfWeek: 2, isActive: true, morningActive: true, morningStart: '08:00', morningEnd: '12:00', afternoonActive: true, afternoonStart: '14:00', afternoonEnd: '18:00', slotDuration: 30 },
  { dayOfWeek: 3, isActive: true, morningActive: true, morningStart: '08:00', morningEnd: '12:00', afternoonActive: true, afternoonStart: '14:00', afternoonEnd: '18:00', slotDuration: 30 },
  { dayOfWeek: 4, isActive: true, morningActive: true, morningStart: '08:00', morningEnd: '12:00', afternoonActive: true, afternoonStart: '14:00', afternoonEnd: '18:00', slotDuration: 30 },
  { dayOfWeek: 5, isActive: true, morningActive: true, morningStart: '08:00', morningEnd: '12:00', afternoonActive: true, afternoonStart: '14:00', afternoonEnd: '18:00', slotDuration: 30 },
  { dayOfWeek: 6, isActive: false, morningActive: true, morningStart: '09:00', morningEnd: '13:00', afternoonActive: false, afternoonStart: '14:00', afternoonEnd: '17:00', slotDuration: 30 },
  { dayOfWeek: 0, isActive: false, morningActive: false, morningStart: '09:00', morningEnd: '13:00', afternoonActive: false, afternoonStart: '14:00', afternoonEnd: '17:00', slotDuration: 30 },
];

const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function DoctorSchedulePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<DayScheduleForm[]>(DEFAULT_SCHEDULES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const { data } = await api.get<DoctorScheduleType[]>('/schedules/me');
      if (data.length > 0) {
        const merged = DEFAULT_SCHEDULES.map((def) => {
          const morning = data.find((s) => s.dayOfWeek === def.dayOfWeek && s.period === 'morning');
          const afternoon = data.find((s) => s.dayOfWeek === def.dayOfWeek && s.period === 'afternoon');
          const hasAny = morning || afternoon;
          return {
            ...def,
            isActive: !!hasAny,
            morningActive: !!morning,
            morningStart: morning ? morning.startTime.substring(0, 5) : def.morningStart,
            morningEnd: morning ? morning.endTime.substring(0, 5) : def.morningEnd,
            afternoonActive: !!afternoon,
            afternoonStart: afternoon ? afternoon.startTime.substring(0, 5) : def.afternoonStart,
            afternoonEnd: afternoon ? afternoon.endTime.substring(0, 5) : def.afternoonEnd,
            slotDuration: morning?.slotDuration || afternoon?.slotDuration || def.slotDuration,
          };
        });
        setSchedules(merged);
      }
    } catch (error) {
      console.error('Erreur chargement horaires:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSchedule = (dayOfWeek: number, field: keyof DayScheduleForm, value: any) => {
    setSchedules((prev) =>
      prev.map((s) => {
        if (s.dayOfWeek !== dayOfWeek) return s;
        const updated = { ...s, [field]: value };
        // Si on désactive le jour, désactiver matin et après-midi
        if (field === 'isActive' && !value) {
          updated.morningActive = false;
          updated.afternoonActive = false;
        }
        // Si on active le jour, activer au moins le matin
        if (field === 'isActive' && value && !updated.morningActive && !updated.afternoonActive) {
          updated.morningActive = true;
        }
        return updated;
      }),
    );
  };

  const handleSave = async () => {
    const bulkSchedules: any[] = [];

    for (const s of schedules) {
      if (!s.isActive) continue;
      if (s.morningActive) {
        if (s.morningStart >= s.morningEnd) {
          toast.error(`${DAY_LABELS[s.dayOfWeek]} Matin : l'heure de fin doit être après le début`);
          return;
        }
        bulkSchedules.push({
          dayOfWeek: s.dayOfWeek,
          period: 'morning',
          startTime: s.morningStart,
          endTime: s.morningEnd,
          slotDuration: s.slotDuration,
          isActive: true,
        });
      }
      if (s.afternoonActive) {
        if (s.afternoonStart >= s.afternoonEnd) {
          toast.error(`${DAY_LABELS[s.dayOfWeek]} Après-midi : l'heure de fin doit être après le début`);
          return;
        }
        if (s.morningActive && s.afternoonStart <= s.morningEnd) {
          toast.error(`${DAY_LABELS[s.dayOfWeek]} : l'après-midi doit commencer après la fin du matin (pause déjeuner)`);
          return;
        }
        bulkSchedules.push({
          dayOfWeek: s.dayOfWeek,
          period: 'afternoon',
          startTime: s.afternoonStart,
          endTime: s.afternoonEnd,
          slotDuration: s.slotDuration,
          isActive: true,
        });
      }
    }

    setSaving(true);
    try {
      await api.post('/schedules/bulk', { schedules: bulkSchedules });
      toast.success('Horaires sauvegardés avec succès');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const getSlotCount = (start: string, end: string, duration: number, active: boolean): number => {
    if (!active) return 0;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const total = (eh * 60 + em) - (sh * 60 + sm);
    return Math.max(0, Math.floor(total / duration));
  };

  const getLunchBreak = (entry: DayScheduleForm): string => {
    if (!entry.morningActive || !entry.afternoonActive) return '';
    return `${entry.morningEnd} — ${entry.afternoonStart}`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Schedule color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4">Disponibilités</Typography>
        </Box>
        <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
            onClick={handleSave}
            disabled={saving}
            size="large"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Définissez vos horaires de consultation pour chaque jour. Chaque jour est divisé en
        <strong> Matin</strong> et <strong> Après-midi</strong> avec une pause déjeuner entre les deux.
      </Alert>

      <Grid container spacing={2}>
        {DISPLAY_ORDER.map((day) => {
          const entry = schedules.find((s) => s.dayOfWeek === day)!;
          const mSlots = getSlotCount(entry.morningStart, entry.morningEnd, entry.slotDuration, entry.morningActive);
          const aSlots = getSlotCount(entry.afternoonStart, entry.afternoonEnd, entry.slotDuration, entry.afternoonActive);
          const lunch = getLunchBreak(entry);

          return (
            <Grid item xs={12} key={day}>
              <Card
                variant="outlined"
                sx={{
                  opacity: entry.isActive ? 1 : 0.5,
                  borderColor: entry.isActive ? 'primary.main' : 'grey.300',
                  borderWidth: entry.isActive ? 2 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                <CardContent sx={{ pb: 2 }}>
                  {/* Header: Jour + Toggle + Durée créneau */}
                  <Grid container spacing={2} alignItems="center" sx={{ mb: entry.isActive ? 2 : 0 }}>
                    <Grid item xs={12} sm={4}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={entry.isActive}
                            onChange={(e) => updateSchedule(day, 'isActive', e.target.checked)}
                            color="primary"
                          />
                        }
                        label={
                          <Typography variant="subtitle1" fontWeight="bold">
                            {DAY_LABELS[day]}
                          </Typography>
                        }
                      />
                    </Grid>
                    {entry.isActive && (
                      <>
                        <Grid item xs={6} sm={2}>
                          <TextField
                            select
                            label="Durée créneau"
                            value={entry.slotDuration}
                            onChange={(e) => updateSchedule(day, 'slotDuration', Number(e.target.value))}
                            fullWidth
                            size="small"
                            SelectProps={{ native: true }}
                          >
                            <option value={15}>15 min</option>
                            <option value={20}>20 min</option>
                            <option value={30}>30 min</option>
                            <option value={45}>45 min</option>
                            <option value={60}>60 min</option>
                          </TextField>
                        </Grid>
                        <Grid item xs={6} sm={6}>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            {entry.morningActive && <Chip icon={<WbSunny />} label={`Matin: ${mSlots} créneaux`} color="warning" size="small" variant="outlined" />}
                            {lunch && <Chip icon={<Restaurant />} label={`Pause: ${lunch}`} size="small" variant="outlined" />}
                            {entry.afternoonActive && <Chip icon={<NightsStay />} label={`Après-midi: ${aSlots} créneaux`} color="info" size="small" variant="outlined" />}
                            {!entry.morningActive && !entry.afternoonActive && <Chip label="Aucune période active" color="error" size="small" />}
                          </Stack>
                        </Grid>
                      </>
                    )}
                    {!entry.isActive && (
                      <Grid item xs={8}>
                        <Chip label="Jour non travaillé" size="small" />
                      </Grid>
                    )}
                  </Grid>

                  {/* Matin + Après-midi */}
                  {entry.isActive && (
                    <Grid container spacing={2}>
                      {/* ── MATIN ── */}
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined" sx={{ bgcolor: entry.morningActive ? 'rgba(255,167,38,0.05)' : 'transparent' }}>
                          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={entry.morningActive}
                                  onChange={(e) => updateSchedule(day, 'morningActive', e.target.checked)}
                                  color="warning"
                                  size="small"
                                />
                              }
                              label={
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <WbSunny fontSize="small" color="warning" />
                                  <Typography variant="body2" fontWeight="bold">Matin</Typography>
                                </Stack>
                              }
                            />
                            {entry.morningActive && (
                              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                <TextField
                                  type="time"
                                  label="Début"
                                  value={entry.morningStart}
                                  onChange={(e) => updateSchedule(day, 'morningStart', e.target.value)}
                                  size="small"
                                  InputLabelProps={{ shrink: true }}
                                  fullWidth
                                />
                                <TextField
                                  type="time"
                                  label="Fin"
                                  value={entry.morningEnd}
                                  onChange={(e) => updateSchedule(day, 'morningEnd', e.target.value)}
                                  size="small"
                                  InputLabelProps={{ shrink: true }}
                                  fullWidth
                                />
                              </Stack>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* ── APRÈS-MIDI ── */}
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined" sx={{ bgcolor: entry.afternoonActive ? 'rgba(33,150,243,0.05)' : 'transparent' }}>
                          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={entry.afternoonActive}
                                  onChange={(e) => updateSchedule(day, 'afternoonActive', e.target.checked)}
                                  color="info"
                                  size="small"
                                />
                              }
                              label={
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <NightsStay fontSize="small" color="info" />
                                  <Typography variant="body2" fontWeight="bold">Après-midi</Typography>
                                </Stack>
                              }
                            />
                            {entry.afternoonActive && (
                              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                <TextField
                                  type="time"
                                  label="Début"
                                  value={entry.afternoonStart}
                                  onChange={(e) => updateSchedule(day, 'afternoonStart', e.target.value)}
                                  size="small"
                                  InputLabelProps={{ shrink: true }}
                                  fullWidth
                                />
                                <TextField
                                  type="time"
                                  label="Fin"
                                  value={entry.afternoonEnd}
                                  onChange={(e) => updateSchedule(day, 'afternoonEnd', e.target.value)}
                                  size="small"
                                  InputLabelProps={{ shrink: true }}
                                  fullWidth
                                />
                              </Stack>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Résumé */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Résumé de la semaine
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Typography variant="body2" color="text.secondary">Jours travaillés</Typography>
              <Typography variant="h5">
                {schedules.filter((s) => s.isActive).length}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color="text.secondary">Créneaux total/semaine</Typography>
              <Typography variant="h5">
                {schedules.reduce((acc, s) => {
                  if (!s.isActive) return acc;
                  return acc
                    + getSlotCount(s.morningStart, s.morningEnd, s.slotDuration, s.morningActive)
                    + getSlotCount(s.afternoonStart, s.afternoonEnd, s.slotDuration, s.afternoonActive);
                }, 0)}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color="text.secondary">Heures/semaine</Typography>
              <Typography variant="h5">
                {schedules
                  .filter((s) => s.isActive)
                  .reduce((acc, s) => {
                    let total = 0;
                    if (s.morningActive) {
                      const [sh, sm] = s.morningStart.split(':').map(Number);
                      const [eh, em] = s.morningEnd.split(':').map(Number);
                      total += (eh * 60 + em - sh * 60 - sm) / 60;
                    }
                    if (s.afternoonActive) {
                      const [sh, sm] = s.afternoonStart.split(':').map(Number);
                      const [eh, em] = s.afternoonEnd.split(':').map(Number);
                      total += (eh * 60 + em - sh * 60 - sm) / 60;
                    }
                    return acc + total;
                  }, 0)
                  .toFixed(1)}h
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
