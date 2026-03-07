import { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Switch, TextField, Button, Grid,
  FormControlLabel, Divider, Chip, Alert, CircularProgress, Stack,
} from '@mui/material';
import { Schedule, Save, AccessTime } from '@mui/icons-material';
import { DoctorSchedule as DoctorScheduleType, ScheduleFormEntry, DAY_LABELS } from '../types/schedule.types';
import api from '../config/api';
import { toast } from 'react-toastify';

const DEFAULT_SCHEDULES: ScheduleFormEntry[] = [
  { dayOfWeek: 1, startTime: '08:00', endTime: '12:00', slotDuration: 30, isActive: true },
  { dayOfWeek: 2, startTime: '08:00', endTime: '12:00', slotDuration: 30, isActive: true },
  { dayOfWeek: 3, startTime: '08:00', endTime: '12:00', slotDuration: 30, isActive: true },
  { dayOfWeek: 4, startTime: '08:00', endTime: '12:00', slotDuration: 30, isActive: true },
  { dayOfWeek: 5, startTime: '08:00', endTime: '12:00', slotDuration: 30, isActive: true },
  { dayOfWeek: 6, startTime: '09:00', endTime: '13:00', slotDuration: 30, isActive: false },
  { dayOfWeek: 0, startTime: '09:00', endTime: '13:00', slotDuration: 30, isActive: false },
];

// Ordre d'affichage : Lundi → Dimanche
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function DoctorSchedulePage() {
  const [schedules, setSchedules] = useState<ScheduleFormEntry[]>(DEFAULT_SCHEDULES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const { data } = await api.get<DoctorScheduleType[]>('/schedules/me');
      if (data.length > 0) {
        // Fusionner avec les valeurs par défaut pour les jours manquants
        const merged = DEFAULT_SCHEDULES.map((def) => {
          const existing = data.find((s) => s.dayOfWeek === def.dayOfWeek);
          if (existing) {
            return {
              dayOfWeek: existing.dayOfWeek,
              startTime: existing.startTime.substring(0, 5), // "HH:mm:ss" → "HH:mm"
              endTime: existing.endTime.substring(0, 5),
              slotDuration: existing.slotDuration,
              isActive: existing.isActive,
            };
          }
          return { ...def, isActive: false };
        });
        setSchedules(merged);
      }
    } catch (error) {
      console.error('Erreur chargement horaires:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSchedule = (dayOfWeek: number, field: keyof ScheduleFormEntry, value: any) => {
    setSchedules((prev) =>
      prev.map((s) => (s.dayOfWeek === dayOfWeek ? { ...s, [field]: value } : s)),
    );
  };

  const handleSave = async () => {
    const activeSchedules = schedules.filter((s) => s.isActive);

    // Validation
    for (const s of activeSchedules) {
      if (s.startTime >= s.endTime) {
        toast.error(`${DAY_LABELS[s.dayOfWeek]} : l'heure de fin doit être après l'heure de début`);
        return;
      }
    }

    setSaving(true);
    try {
      await api.post('/schedules/bulk', { schedules: activeSchedules });
      toast.success('Horaires sauvegardés avec succès');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const getSlotCount = (entry: ScheduleFormEntry): number => {
    if (!entry.isActive) return 0;
    const [startH, startM] = entry.startTime.split(':').map(Number);
    const [endH, endM] = entry.endTime.split(':').map(Number);
    const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    return Math.max(0, Math.floor(totalMinutes / entry.slotDuration));
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
          <Typography variant="h4">Mes Disponibilités</Typography>
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
        Définissez vos horaires de consultation pour chaque jour de la semaine. Les patients pourront
        voir vos disponibilités et réserver uniquement sur les créneaux que vous avez définis.
      </Alert>

      <Grid container spacing={2}>
        {DISPLAY_ORDER.map((day) => {
          const entry = schedules.find((s) => s.dayOfWeek === day)!;
          const slotCount = getSlotCount(entry);

          return (
            <Grid item xs={12} key={day}>
              <Card
                variant="outlined"
                sx={{
                  opacity: entry.isActive ? 1 : 0.6,
                  borderColor: entry.isActive ? 'primary.main' : 'grey.300',
                  borderWidth: entry.isActive ? 2 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                <CardContent>
                  <Grid container spacing={2} alignItems="center">
                    {/* Jour + Toggle */}
                    <Grid item xs={12} sm={2}>
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

                    {/* Heure début */}
                    <Grid item xs={6} sm={2}>
                      <TextField
                        type="time"
                        label="Début"
                        value={entry.startTime}
                        onChange={(e) => updateSchedule(day, 'startTime', e.target.value)}
                        disabled={!entry.isActive}
                        fullWidth
                        size="small"
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>

                    {/* Heure fin */}
                    <Grid item xs={6} sm={2}>
                      <TextField
                        type="time"
                        label="Fin"
                        value={entry.endTime}
                        onChange={(e) => updateSchedule(day, 'endTime', e.target.value)}
                        disabled={!entry.isActive}
                        fullWidth
                        size="small"
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>

                    {/* Durée créneau */}
                    <Grid item xs={6} sm={2}>
                      <TextField
                        select
                        label="Durée créneau"
                        value={entry.slotDuration}
                        onChange={(e) => updateSchedule(day, 'slotDuration', Number(e.target.value))}
                        disabled={!entry.isActive}
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

                    {/* Résumé créneaux */}
                    <Grid item xs={6} sm={4}>
                      {entry.isActive ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <AccessTime fontSize="small" color="action" />
                          <Chip
                            label={`${slotCount} créneaux`}
                            color="primary"
                            variant="outlined"
                            size="small"
                          />
                          <Typography variant="caption" color="text.secondary">
                            {entry.startTime} → {entry.endTime}
                          </Typography>
                        </Stack>
                      ) : (
                        <Chip label="Jour non travaillé" size="small" />
                      )}
                    </Grid>
                  </Grid>
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
            📊 Résumé de la semaine
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Typography variant="body2" color="text.secondary">
                Jours travaillés
              </Typography>
              <Typography variant="h5">
                {schedules.filter((s) => s.isActive).length}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color="text.secondary">
                Créneaux total/semaine
              </Typography>
              <Typography variant="h5">
                {schedules.reduce((acc, s) => acc + getSlotCount(s), 0)}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color="text.secondary">
                Heures/semaine
              </Typography>
              <Typography variant="h5">
                {schedules
                  .filter((s) => s.isActive)
                  .reduce((acc, s) => {
                    const [sh, sm] = s.startTime.split(':').map(Number);
                    const [eh, em] = s.endTime.split(':').map(Number);
                    return acc + (eh * 60 + em - sh * 60 - sm) / 60;
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
