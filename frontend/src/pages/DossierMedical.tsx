import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Accordion, AccordionSummary,
  AccordionDetails, Paper, Divider, CircularProgress, Alert, Button, IconButton,
} from '@mui/material';
import {
  ExpandMore, LocalPharmacy, Science, ArrowBack, PictureAsPdf,
  CheckCircle, HourglassEmpty, PlayArrow, Add as AddIcon, Print, Visibility, Description,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user.types';
import { DossierMedical as DossierMedicalType, ConsultationWithDetails } from '../types/dossier.types';
import { OrdonnanceStatus } from '../types/ordonnance.types';
import { AnalyseStatus } from '../types/analyse.types';
import api from '../config/api';
import { toast } from 'react-toastify';

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function getOrdonnanceStatusLabel(status: OrdonnanceStatus) {
  switch (status) {
    case OrdonnanceStatus.DELIVREE: return 'Délivrée';
    case OrdonnanceStatus.ANNULEE: return 'Annulée';
    default: return 'En attente';
  }
}

function getOrdonnanceStatusColor(status: OrdonnanceStatus): 'warning' | 'success' | 'error' {
  switch (status) {
    case OrdonnanceStatus.DELIVREE: return 'success';
    case OrdonnanceStatus.ANNULEE: return 'error';
    default: return 'warning';
  }
}

function getAnalyseStatusLabel(status: AnalyseStatus) {
  switch (status) {
    case AnalyseStatus.TERMINEE: return 'Délivrée';
    case AnalyseStatus.EN_COURS: return 'En cours';
    default: return 'En attente';
  }
}

function getAnalyseStatusColor(status: AnalyseStatus): 'warning' | 'success' | 'info' {
  switch (status) {
    case AnalyseStatus.TERMINEE: return 'success';
    case AnalyseStatus.EN_COURS: return 'info';
    default: return 'warning';
  }
}

export default function DossierMedical() {
  const { patientId } = useParams<{ patientId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dossier, setDossier] = useState<DossierMedicalType | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientInfo, setPatientInfo] = useState<any>(null);

  const effectivePatientId = user?.role === UserRole.PATIENT ? user.id : patientId;

  useEffect(() => {
    if (effectivePatientId) {
      loadDossier(effectivePatientId);
      loadPatientInfo(effectivePatientId);
    }
  }, [effectivePatientId]);

  const loadDossier = async (pid: string) => {
    setLoading(true);
    try {
      const { data } = await api.get<DossierMedicalType>(`/consultations/patient/${pid}/dossier`);
      setDossier(data);
      setDocuments((data as any).documents || []);
    } catch (error) {
      toast.error('Erreur lors du chargement du dossier médical');
    } finally {
      setLoading(false);
    }
  };

  const loadPatientInfo = async (pid: string) => {
    try {
      const { data } = await api.get(`/users/${pid}`);
      setPatientInfo(data);
    } catch {
      // patient info optional
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 8 }}>
        <CircularProgress size={48} />
        <Typography sx={{ mt: 2 }} color="text.secondary">Chargement du dossier médical...</Typography>
      </Box>
    );
  }

  if (!dossier) {
    return (
      <Box sx={{ pt: 4 }}>
        <Alert severity="error">Impossible de charger le dossier médical.</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>Retour</Button>
      </Box>
    );
  }

  const { consultations } = dossier;

  return (
    <Box>
      {/* ═══ Header ═══ */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
        {user?.role !== UserRole.PATIENT && (
          <IconButton onClick={() => navigate(-1)}>
            <ArrowBack />
          </IconButton>
        )}
        <Typography variant="h4" fontWeight="bold">
          Dossier Médical
        </Typography>
      </Box>

      {/* ═══ Patient Info Card ═══ */}
      {patientInfo && (
        <Paper variant="outlined" sx={{ p: 2.5, mb: 4, borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {patientInfo.firstName} {patientInfo.lastName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Email: {patientInfo.email}
          </Typography>
          {patientInfo.phone && (
            <Typography variant="body2" color="text.secondary">
              Téléphone: {patientInfo.phone}
            </Typography>
          )}
          {patientInfo.dateNaissance && (
            <Typography variant="body2" color="text.secondary">
              Date de naissance: {formatDate(patientInfo.dateNaissance)}
            </Typography>
          )}
        </Paper>
      )}

      {/* ═══ Consultations Section ═══ */}
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
        Consultations ({consultations.length})
      </Typography>

      {consultations.length === 0 ? (
        <Alert severity="info">Aucune consultation enregistrée.</Alert>
      ) : (
        consultations.map((c: ConsultationWithDetails, idx: number) => (
          <Accordion
            key={c.id}
            defaultExpanded={idx === 0}
            sx={{
              mb: 2,
              '&:before': { display: 'none' },
              borderRadius: 2,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
            }}
            elevation={0}
          >
            {/* ── Accordion Header: date + doctor + badges ── */}
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {formatDate(c.date)}
                </Typography>
                {c.doctor && (
                  <Typography variant="body2" color="text.secondary">
                    — Dr {c.doctor.firstName} {c.doctor.lastName}
                  </Typography>
                )}
                {c.ordonnances && c.ordonnances.length > 0 && (
                  <Chip
                    icon={<AddIcon />}
                    label={`${c.ordonnances.length} Ordonnance(s)`}
                    size="small"
                    color="primary"
                    sx={{ fontWeight: 'bold' }}
                  />
                )}
                {c.analyses && c.analyses.length > 0 && (
                  <Chip
                    icon={<Science />}
                    label={`${c.analyses.length} Analyse(s)`}
                    size="small"
                    color="error"
                    sx={{ fontWeight: 'bold' }}
                  />
                )}
              </Box>
            </AccordionSummary>

            {/* ── Accordion Content ── */}
            <AccordionDetails sx={{ pt: 0 }}>
              {/* Médecin */}
              {c.doctor && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">
                    Médecin
                  </Typography>
                  <Typography variant="body2">
                    Dr {c.doctor.firstName} {c.doctor.lastName}
                    {(c.doctor as any).specialite ? ` — ${(c.doctor as any).specialite}` : ''}
                  </Typography>
                </Box>
              )}

              {/* Motif */}
              {c.motif && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="primary.main" fontWeight="bold">
                    Motif
                  </Typography>
                  <Typography variant="body2">
                    {c.motif}
                  </Typography>
                </Box>
              )}

              {/* Diagnostic */}
              {c.diagnostic && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="primary.main" fontWeight="bold">
                    Diagnostic
                  </Typography>
                  <Typography variant="body2">
                    {c.diagnostic}
                  </Typography>
                </Box>
              )}

              {/* Notes */}
              {c.notes && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="primary.main" fontWeight="bold">
                    Notes
                  </Typography>
                  <Typography variant="body2">
                    {c.notes}
                  </Typography>
                </Box>
              )}

              {/* Examen clinique */}
              {c.examenClinique && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="primary.main" fontWeight="bold">
                    Examen Clinique
                  </Typography>
                  <Typography variant="body2">
                    {typeof c.examenClinique === 'string' ? c.examenClinique : JSON.stringify(c.examenClinique, null, 2)}
                  </Typography>
                </Box>
              )}

              {/* ── Ordonnances ── */}
              {c.ordonnances && c.ordonnances.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" color="warning.main" fontWeight="bold" sx={{ mb: 1.5 }}>
                    Ordonnances ({c.ordonnances.length})
                  </Typography>
                  {c.ordonnances.map((o: any, oi: number) => (
                    <Paper
                      key={o.id}
                      variant="outlined"
                      sx={{ p: 2, mb: 1.5, borderRadius: 2 }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography fontWeight="bold">
                          Ordonnance #{oi + 1}
                        </Typography>
                        <Chip
                          label={getOrdonnanceStatusLabel(o.status)}
                          size="small"
                          color={getOrdonnanceStatusColor(o.status)}
                        />
                      </Box>
                      {o.medicaments && o.medicaments.map((med: any, mi: number) => (
                        <Box key={mi} sx={{ ml: 1, mb: 0.5 }}>
                          <Typography variant="body2" fontWeight="bold">
                            {med.nom} - {med.dosage}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                            {med.frequence} pendant {med.duree}
                          </Typography>
                        </Box>
                      ))}
                    </Paper>
                  ))}
                </>
              )}

              {/* ── Analyses ── */}
              {c.analyses && c.analyses.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" color="primary.main" fontWeight="bold" sx={{ mb: 1.5 }}>
                    Analyses
                  </Typography>
                  {c.analyses.map((a: any) => (
                    <Paper
                      key={a.id}
                      variant="outlined"
                      sx={{ p: 2, mb: 1.5, borderRadius: 2 }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                        <Typography fontWeight="bold">
                          {a.description}
                        </Typography>
                        <Chip
                          label={getAnalyseStatusLabel(a.status)}
                          size="small"
                          color={getAnalyseStatusColor(a.status)}
                        />
                      </Box>
                      {a.laboratoire && (
                        <Typography variant="body2" color="text.secondary">
                          Laboratoire: {a.laboratoire.firstName || a.laboratoire.id}
                        </Typography>
                      )}
                      {a.resultat && (
                        <Typography variant="body2" color="text.secondary">
                          Résultat: {a.resultat}
                        </Typography>
                      )}
                      {a.resultatFileUrl && (
                        <Button
                          size="small"
                          startIcon={<PictureAsPdf />}
                          href={a.resultatFileUrl}
                          target="_blank"
                          sx={{ mt: 0.5, textTransform: 'uppercase' }}
                        >
                          Voir PDF: {a.resultatFileUrl.split('/').pop()}
                        </Button>
                      )}
                    </Paper>
                  ))}
                </>
              )}

              {/* ── Documents PDF liés à cette consultation ── */}
              {(() => {
                const consultationDocs = documents.filter(
                  (d: any) => d.description?.includes(formatDate(c.date)) || d.fileUrl?.includes(c.id)
                );
                if (consultationDocs.length === 0) return null;
                return (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" color="secondary.main" fontWeight="bold" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Description fontSize="small" /> Documents PDF ({consultationDocs.length})
                    </Typography>
                    {consultationDocs.map((doc: any) => (
                      <Paper
                        key={doc.id}
                        variant="outlined"
                        sx={{ p: 1.5, mb: 1, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}
                      >
                        <PictureAsPdf sx={{ color: '#d32f2f', fontSize: 28 }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight="bold">{doc.fileName}</Typography>
                          <Typography variant="caption" color="text.secondary">{doc.description}</Typography>
                        </Box>
                        <Chip
                          label={doc.type === 'ordonnance' ? 'Ordonnance' : doc.type === 'analyse' ? 'Analyse' : doc.type}
                          size="small"
                          color={doc.type === 'ordonnance' ? 'warning' : 'info'}
                          sx={{ fontWeight: 'bold', mr: 1 }}
                        />
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Visibility />}
                          href={doc.fileUrl}
                          target="_blank"
                          sx={{ textTransform: 'uppercase', fontSize: '0.7rem', mr: 0.5 }}
                        >
                          Voir
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<Print />}
                          onClick={() => {
                            const printWin = window.open(doc.fileUrl, '_blank');
                            if (printWin) {
                              printWin.addEventListener('load', () => {
                                printWin.print();
                              });
                            }
                          }}
                          sx={{ textTransform: 'uppercase', fontSize: '0.7rem' }}
                        >
                          Imprimer
                        </Button>
                      </Paper>
                    ))}
                  </>
                );
              })()}
            </AccordionDetails>
          </Accordion>
        ))
      )}

      {/* ═══ All Documents Section ═══ */}
      {documents.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <PictureAsPdf sx={{ color: '#d32f2f' }} /> Documents ({documents.length})
          </Typography>
          <Grid container spacing={2}>
            {documents.map((doc: any) => (
              <Grid item xs={12} sm={6} key={doc.id}>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: '12px !important' }}>
                    <PictureAsPdf sx={{ color: '#d32f2f', fontSize: 36 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight="bold" noWrap>{doc.fileName}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>{doc.description}</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          label={doc.type === 'ordonnance' ? 'Ordonnance' : doc.type === 'analyse' ? 'Analyse' : doc.type}
                          size="small"
                          color={doc.type === 'ordonnance' ? 'warning' : 'info'}
                          sx={{ fontWeight: 'bold', fontSize: '0.65rem', height: 20 }}
                        />
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Visibility />}
                        href={doc.fileUrl}
                        target="_blank"
                        sx={{ textTransform: 'uppercase', fontSize: '0.65rem', minWidth: 80 }}
                      >
                        Voir
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<Print />}
                        onClick={() => {
                          const printWin = window.open(doc.fileUrl, '_blank');
                          if (printWin) {
                            printWin.addEventListener('load', () => { printWin.print(); });
                          }
                        }}
                        sx={{ textTransform: 'uppercase', fontSize: '0.65rem', minWidth: 80 }}
                      >
                        Imprimer
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}
