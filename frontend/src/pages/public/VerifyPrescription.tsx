import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { CheckCircle, ErrorOutline, Security, VerifiedUser } from '@mui/icons-material';
import { motion } from 'framer-motion';
import api from '../../config/api';
import type { Ordonnance } from '../../types/ordonnance.types';

type VerifyState = 'AVAILABLE' | 'SERVED' | 'ALREADY_SERVED' | 'INVALID';

type VerifyResponse = {
  state: VerifyState;
  message: string;
  servedAt?: string;
  ordonnance?: Ordonnance;
};

type PharmacistForm = {
  servedBy: string;
  servedByPhone: string;
  pharmacyNote: string;
};

const STORAGE_KEY = 'sihatihub.verify.pharmacist.v1';

const MotionCard = motion(Card);
const MotionBox = motion(Box);

const formatDateTime = (iso?: string) => {
  if (!iso) return '-';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('fr-FR');
};

const securityVars = {
  '--verify-bg-1': '#020617',
  '--verify-bg-2': '#0f172a',
  '--verify-bg-3': '#0f3b2f',
  '--verify-text': '#e2e8f0',
  '--verify-subtext': '#94a3b8',
  '--verify-success': '#166534',
  '--verify-success-soft': 'rgba(34, 197, 94, 0.18)',
  '--verify-danger': '#b91c1c',
  '--verify-danger-soft': 'rgba(248, 113, 113, 0.18)',
  '--verify-glass': 'rgba(15, 23, 42, 0.58)',
} as const;

export default function VerifyPrescription() {
  const { hash } = useParams<{ hash: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [response, setResponse] = useState<VerifyResponse | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showSuccessTakeover, setShowSuccessTakeover] = useState(false);
  const [form, setForm] = useState<PharmacistForm>({ servedBy: '', servedByPhone: '', pharmacyNote: '' });

  const isServed = response?.state === 'ALREADY_SERVED';
  const isInvalid = response?.state === 'INVALID';
  const isAvailable = response?.state === 'AVAILABLE';

  const medList = useMemo(() => response?.ordonnance?.medicaments ?? [], [response?.ordonnance]);

  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as Partial<PharmacistForm>;
        setForm((prev) => ({
          ...prev,
          servedBy: parsed.servedBy ?? '',
          servedByPhone: parsed.servedByPhone ?? '',
        }));
      } catch {
        // Ignore malformed localStorage data.
      }
    }
  }, []);

  useEffect(() => {
    if (!hash) {
      setResponse({ state: 'INVALID', message: 'Document Non-Existant / Fraude Détectée' });
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get<VerifyResponse>(`/ordonnances/verify/${hash}`);
        setResponse(data);
      } catch {
        setResponse({ state: 'INVALID', message: 'Document Non-Existant / Fraude Détectée' });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [hash]);

  const handleFormChange = (field: keyof PharmacistForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const confirmDelivery = async () => {
    if (!hash || !form.servedBy.trim() || !form.servedByPhone.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        servedBy: form.servedBy.trim(),
        servedByPhone: form.servedByPhone.trim(),
        pharmacyNote: form.pharmacyNote.trim() || undefined,
      };
      const { data } = await api.post<VerifyResponse>(`/ordonnances/verify/${hash}/confirm`, payload);

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ servedBy: payload.servedBy, servedByPhone: payload.servedByPhone }),
      );

      setConfirmOpen(false);

      if (data.state === 'SERVED') {
        setShowSuccessTakeover(true);
        setTimeout(async () => {
          try {
            const refreshed = await api.get<VerifyResponse>(`/ordonnances/verify/${hash}`);
            setResponse(refreshed.data);
          } catch {
            setResponse(data);
          } finally {
            setShowSuccessTakeover(false);
          }
        }, 1800);
        return;
      }

      setResponse(data);
    } catch {
      setResponse({
        state: 'INVALID',
        message: 'Document Non-Existant / Fraude Détectée',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        color: 'var(--verify-text)',
        px: { xs: 2, md: 4 },
        py: { xs: 3, md: 6 },
        position: 'relative',
        overflow: 'hidden',
        background:
          'radial-gradient(circle at 15% 20%, var(--verify-bg-3), transparent 35%), linear-gradient(140deg, var(--verify-bg-1), var(--verify-bg-2))',
        ...securityVars,
      }}
    >
      <MotionBox
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 0.18, scale: 1 }}
        transition={{ duration: 1.4 }}
        sx={{
          position: 'absolute',
          width: 420,
          height: 420,
          borderRadius: '50%',
          border: '2px solid rgba(148, 163, 184, 0.35)',
          top: -120,
          right: -120,
          pointerEvents: 'none',
        }}
      />

      <MotionBox
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        sx={{ maxWidth: 980, mx: 'auto' }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <Security sx={{ color: '#60a5fa' }} />
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: 0.4 }}>
            SihatiHub - Verification Publique Securisee
          </Typography>
        </Stack>
        <Typography sx={{ color: 'var(--verify-subtext)', mb: 3 }}>
          Verification anti-fraude en temps reel pour prevenir toute reutilisation d'ordonnance.
        </Typography>

        {loading ? (
          <Card sx={{ background: 'var(--verify-glass)', backdropFilter: 'blur(16px)', border: '1px solid rgba(148, 163, 184, 0.25)' }}>
            <CardContent sx={{ py: 8, textAlign: 'center' }}>
              <MotionBox
                animate={{ rotate: 360 }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
                sx={{ display: 'inline-flex', mb: 2 }}
              >
                <VerifiedUser sx={{ fontSize: 54, color: '#93c5fd' }} />
              </MotionBox>
              <CircularProgress sx={{ color: '#38bdf8', mb: 2 }} />
              <Typography>Analyse du hash de securite en cours...</Typography>
            </CardContent>
          </Card>
        ) : (
          <MotionCard
            initial={{ opacity: 0, y: 26 }}
            animate={isServed ? { opacity: 1, y: 0, x: [0, -8, 8, -6, 6, -3, 3, 0] } : { opacity: 1, y: 0 }}
            transition={{ duration: isServed ? 0.6 : 0.4 }}
            sx={{
              background: 'var(--verify-glass)',
              backdropFilter: 'blur(18px)',
              border: isServed
                ? '1px solid rgba(248, 113, 113, 0.7)'
                : isInvalid
                  ? '1px solid rgba(251, 146, 60, 0.7)'
                  : '1px solid rgba(74, 222, 128, 0.55)',
              boxShadow: isServed
                ? '0 20px 70px rgba(153, 27, 27, 0.34)'
                : '0 20px 70px rgba(2, 6, 23, 0.35)',
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
              {isAvailable && (
                <>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 900, color: '#86efac' }}>
                        ORDONNANCE VALIDE
                      </Typography>
                      <Typography sx={{ color: 'var(--verify-subtext)' }}>{response?.message}</Typography>
                    </Box>
                    <Chip icon={<VerifiedUser />} label="Disponible" sx={{ bgcolor: 'var(--verify-success-soft)', color: '#bbf7d0' }} />
                  </Stack>

                  <Box sx={{ mb: 2.5 }}>
                    <Typography variant="subtitle2" sx={{ color: 'var(--verify-subtext)', mb: 0.75 }}>
                      Patient
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>
                      {response?.ordonnance?.consultation?.patient?.firstName} {response?.ordonnance?.consultation?.patient?.lastName}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ color: 'var(--verify-subtext)', mt: 1.5, mb: 0.75 }}>
                      Medecin
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>
                      Dr. {response?.ordonnance?.consultation?.doctor?.firstName} {response?.ordonnance?.consultation?.doctor?.lastName}
                    </Typography>
                  </Box>

                  <Typography variant="subtitle2" sx={{ color: 'var(--verify-subtext)', mb: 1 }}>
                    Medicaments ({medList.length})
                  </Typography>
                  <Stack spacing={1.2} sx={{ mb: 3 }}>
                    {medList.map((med, idx) => (
                      <Box
                        key={`${med.nom}-${idx}`}
                        sx={{
                          border: '1px solid rgba(134, 239, 172, 0.24)',
                          borderRadius: 2,
                          px: 1.5,
                          py: 1.2,
                          bgcolor: 'rgba(21, 128, 61, 0.12)',
                        }}
                      >
                        <Typography sx={{ fontWeight: 700 }}>{idx + 1}. {med.nom}</Typography>
                        <Typography variant="body2" sx={{ color: 'var(--verify-subtext)' }}>
                          {med.dosage} | {med.frequence} | {med.duree}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>

                  <Button
                    variant="contained"
                    onClick={() => setConfirmOpen(true)}
                    sx={{
                      bgcolor: '#166534',
                      px: 3.5,
                      py: 1.2,
                      fontWeight: 800,
                      '&:hover': { bgcolor: '#15803d' },
                    }}
                  >
                    Confirmer la Délivrance (Pharmacien)
                  </Button>
                </>
              )}

              {isServed && (
                <>
                  <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 2 }}>
                    <ErrorOutline sx={{ color: '#fca5a5', fontSize: 34 }} />
                    <Typography variant="h5" sx={{ fontWeight: 900, color: '#fecaca' }}>
                      ATTENTION: Cette ordonnance a déjà été consommée.
                    </Typography>
                  </Stack>

                  <Alert
                    severity="error"
                    sx={{
                      mb: 2,
                      bgcolor: 'var(--verify-danger-soft)',
                      color: '#fee2e2',
                      border: '1px solid rgba(252, 165, 165, 0.45)',
                    }}
                  >
                    Historique: premiere utilisation le {formatDateTime(response?.servedAt)}.
                  </Alert>

                  <Typography sx={{ color: 'var(--verify-subtext)' }}>
                    Cette ordonnance est verrouillee pour eviter la double-delivrance.
                  </Typography>
                </>
              )}

              {isInvalid && (
                <>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: '#fdba74', mb: 1 }}>
                    Document Non-Existant / Fraude Detectee
                  </Typography>
                  <Typography sx={{ color: 'var(--verify-subtext)' }}>
                    Le hash fourni est invalide ou ce document n'existe pas dans notre registre securise.
                  </Typography>
                </>
              )}
            </CardContent>
          </MotionCard>
        )}
      </MotionBox>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Tracer la delivrance</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nom de la pharmacie / Pharmacien"
              value={form.servedBy}
              onChange={(e) => handleFormChange('servedBy', e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Numero de telephone"
              value={form.servedByPhone}
              onChange={(e) => handleFormChange('servedByPhone', e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Note (optionnel)"
              value={form.pharmacyNote}
              onChange={(e) => handleFormChange('pharmacyNote', e.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={submitting}>Annuler</Button>
          <Button
            variant="contained"
            onClick={confirmDelivery}
            disabled={submitting || !form.servedBy.trim() || !form.servedByPhone.trim()}
            sx={{ bgcolor: '#166534', '&:hover': { bgcolor: '#15803d' } }}
          >
            {submitting ? 'Confirmation...' : 'Confirmer'}
          </Button>
        </DialogActions>
      </Dialog>

      {showSuccessTakeover && (
        <MotionBox
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at center, rgba(21, 128, 61, 0.96), rgba(20, 83, 45, 0.98))',
          }}
        >
          <MotionBox
            initial={{ scale: 0.5, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ duration: 0.45, type: 'spring', stiffness: 180 }}
            sx={{ textAlign: 'center', color: '#ecfdf5' }}
          >
            <CheckCircle sx={{ fontSize: 110, mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: 1 }}>
              Delivrance Confirmee
            </Typography>
          </MotionBox>
        </MotionBox>
      )}
    </Box>
  );
}
