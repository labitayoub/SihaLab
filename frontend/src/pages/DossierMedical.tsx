import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Avatar, Tabs, Tab,
  Accordion, AccordionSummary, AccordionDetails, Paper, Divider,
  CircularProgress, Alert, Button, List, ListItem, ListItemIcon,
  ListItemText, IconButton, Tooltip, LinearProgress,
} from '@mui/material';
import {
  ExpandMore, MedicalServices, LocalPharmacy, Science, Description,
  Person, CalendarMonth, AccessTime, ArrowBack, Medication,
  CheckCircle, HourglassEmpty, PlayArrow, PictureAsPdf, InsertDriveFile,
  FolderShared, Timeline,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user.types';
import { DossierMedical as DossierMedicalType, ConsultationWithDetails } from '../types/dossier.types';
import { Ordonnance, OrdonnanceStatus } from '../types/ordonnance.types';
import { Analyse, AnalyseStatus } from '../types/analyse.types';
import { Document as DocType } from '../types/document.types';
import api from '../config/api';
import { toast } from 'react-toastify';

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function formatDateTime(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function getOrdonnanceStatusChip(status: OrdonnanceStatus) {
  switch (status) {
    case OrdonnanceStatus.DELIVREE:
      return <Chip icon={<CheckCircle />} label="Délivrée" color="success" size="small" />;
    case OrdonnanceStatus.ANNULEE:
      return <Chip label="Annulée" color="error" size="small" />;
    default:
      return <Chip icon={<HourglassEmpty />} label="En attente" color="warning" size="small" />;
  }
}

function getAnalyseStatusChip(status: AnalyseStatus) {
  switch (status) {
    case AnalyseStatus.TERMINEE:
      return <Chip icon={<CheckCircle />} label="Terminée" color="success" size="small" />;
    case AnalyseStatus.EN_COURS:
      return <Chip icon={<PlayArrow />} label="En cours" color="info" size="small" />;
    default:
      return <Chip icon={<HourglassEmpty />} label="En attente" color="warning" size="small" />;
  }
}

export default function DossierMedical() {
  const { patientId } = useParams<{ patientId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dossier, setDossier] = useState<DossierMedicalType | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabIndex, setTabIndex] = useState(0);
  const [patientInfo, setPatientInfo] = useState<any>(null);

  // Si le user est patient, on utilise son propre ID
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

  const { stats, consultations, ordonnances, analyses, documents } = dossier;

  return (
    <Box>
      {/* ═══ Header ═══ */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        {user?.role !== UserRole.PATIENT && (
          <IconButton onClick={() => navigate(-1)}>
            <ArrowBack />
          </IconButton>
        )}
        <FolderShared sx={{ fontSize: 36, color: 'primary.main' }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" fontWeight="bold">
            Dossier Médical
          </Typography>
          {patientInfo && (
            <Typography variant="subtitle1" color="text.secondary">
              {patientInfo.firstName} {patientInfo.lastName}
              {patientInfo.phone && ` • ${patientInfo.phone}`}
            </Typography>
          )}
        </Box>
      </Box>

      {/* ═══ Statistiques ═══ */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <MedicalServices sx={{ fontSize: 32, mb: 0.5 }} />
              <Typography variant="h4" fontWeight="bold">{stats.totalConsultations}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Consultations</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #388e3c 0%, #66bb6a 100%)', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <LocalPharmacy sx={{ fontSize: 32, mb: 0.5 }} />
              <Typography variant="h4" fontWeight="bold">{stats.totalOrdonnances}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Ordonnances</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f57c00 0%, #ffb74d 100%)', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Science sx={{ fontSize: 32, mb: 0.5 }} />
              <Typography variant="h4" fontWeight="bold">{stats.totalAnalyses}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Analyses</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #7b1fa2 0%, #ba68c8 100%)', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Description sx={{ fontSize: 32, mb: 0.5 }} />
              <Typography variant="h4" fontWeight="bold">{stats.totalDocuments}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Documents</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ═══ Info badges ═══ */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        {stats.derniereConsultation && (
          <Chip
            icon={<CalendarMonth />}
            label={`Dernière consultation : ${formatDate(stats.derniereConsultation)}`}
            variant="outlined"
          />
        )}
        {stats.ordonnancesEnAttente > 0 && (
          <Chip
            icon={<HourglassEmpty />}
            label={`${stats.ordonnancesEnAttente} ordonnance(s) en attente`}
            color="warning"
          />
        )}
        {stats.analysesEnAttente > 0 && (
          <Chip
            icon={<HourglassEmpty />}
            label={`${stats.analysesEnAttente} analyse(s) en attente`}
            color="warning"
          />
        )}
      </Box>

      {/* ═══ Tabs ═══ */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          variant="fullWidth"
          sx={{
            bgcolor: 'grey.50',
            '& .MuiTab-root': { fontWeight: 'bold', py: 2 },
          }}
        >
          <Tab icon={<Timeline />} label={`Historique (${consultations.length})`} iconPosition="start" />
          <Tab icon={<LocalPharmacy />} label={`Ordonnances (${ordonnances.length})`} iconPosition="start" />
          <Tab icon={<Science />} label={`Analyses (${analyses.length})`} iconPosition="start" />
          <Tab icon={<Description />} label={`Documents (${documents.length})`} iconPosition="start" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* ─── Tab 0 : Historique des consultations ─── */}
          {tabIndex === 0 && (
            <Box>
              {consultations.length === 0 ? (
                <Alert severity="info">Aucune consultation enregistrée.</Alert>
              ) : (
                consultations.map((c: ConsultationWithDetails, idx: number) => (
                  <Accordion
                    key={c.id}
                    defaultExpanded={idx === 0}
                    sx={{ mb: 1, '&:before': { display: 'none' }, borderRadius: 2, overflow: 'hidden' }}
                    elevation={1}
                  >
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                          <MedicalServices fontSize="small" />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography fontWeight="bold">
                            {c.motif || 'Consultation'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Dr {c.doctor?.firstName} {c.doctor?.lastName}
                            {c.doctor?.specialite && ` — ${c.doctor.specialite}`}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Chip
                            icon={<CalendarMonth />}
                            label={formatDate(c.date)}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Divider sx={{ mb: 2 }} />

                      {/* Infos de la consultation */}
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Motif
                          </Typography>
                          <Typography>{c.motif || '—'}</Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Diagnostic
                          </Typography>
                          <Typography>{c.diagnostic || 'Non renseigné'}</Typography>
                        </Grid>
                        {c.notes && (
                          <Grid item xs={12}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                              Notes
                            </Typography>
                            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50' }}>
                              <Typography variant="body2">{c.notes}</Typography>
                            </Paper>
                          </Grid>
                        )}
                        {c.examenClinique && (
                          <Grid item xs={12}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                              Examen Clinique
                            </Typography>
                            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50' }}>
                              <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                                {typeof c.examenClinique === 'string' ? c.examenClinique : JSON.stringify(c.examenClinique, null, 2)}
                              </Typography>
                            </Paper>
                          </Grid>
                        )}
                      </Grid>

                      {/* Ordonnances de cette consultation */}
                      {c.ordonnances && c.ordonnances.length > 0 && (
                        <Box sx={{ mt: 3 }}>
                          <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <LocalPharmacy color="success" /> Ordonnances ({c.ordonnances.length})
                          </Typography>
                          {c.ordonnances.map((o: any) => (
                            <Paper key={o.id} variant="outlined" sx={{ p: 2, mb: 1, borderLeft: '4px solid', borderLeftColor: 'success.main' }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                  {formatDateTime(o.createdAt)}
                                </Typography>
                                {getOrdonnanceStatusChip(o.status)}
                              </Box>
                              {o.medicaments && (
                                <List dense disablePadding>
                                  {o.medicaments.map((med: any, mi: number) => (
                                    <ListItem key={mi} disableGutters sx={{ py: 0.3 }}>
                                      <ListItemIcon sx={{ minWidth: 30 }}>
                                        <Medication fontSize="small" color="action" />
                                      </ListItemIcon>
                                      <ListItemText
                                        primary={med.nom}
                                        secondary={`${med.dosage} — ${med.frequence} — ${med.duree}`}
                                      />
                                    </ListItem>
                                  ))}
                                </List>
                              )}
                            </Paper>
                          ))}
                        </Box>
                      )}

                      {/* Analyses de cette consultation */}
                      {c.analyses && c.analyses.length > 0 && (
                        <Box sx={{ mt: 3 }}>
                          <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Science color="warning" /> Analyses ({c.analyses.length})
                          </Typography>
                          {c.analyses.map((a: any) => (
                            <Paper key={a.id} variant="outlined" sx={{ p: 2, mb: 1, borderLeft: '4px solid', borderLeftColor: 'warning.main' }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography fontWeight="bold">{a.description}</Typography>
                                {getAnalyseStatusChip(a.status)}
                              </Box>
                              {a.resultat && (
                                <Typography variant="body2" color="text.secondary">
                                  Résultat : {a.resultat}
                                </Typography>
                              )}
                              {a.laboratoire && (
                                <Typography variant="caption" color="text.secondary">
                                  Laboratoire : {a.laboratoire.firstName} {a.laboratoire.lastName}
                                </Typography>
                              )}
                            </Paper>
                          ))}
                        </Box>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))
              )}
            </Box>
          )}

          {/* ─── Tab 1 : Toutes les ordonnances ─── */}
          {tabIndex === 1 && (
            <Box>
              {ordonnances.length === 0 ? (
                <Alert severity="info">Aucune ordonnance enregistrée.</Alert>
              ) : (
                ordonnances.map((o: Ordonnance) => (
                  <Paper key={o.id} variant="outlined" sx={{ p: 2.5, mb: 2, borderRadius: 2, borderLeft: '4px solid', borderLeftColor: 'success.main' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Box>
                        <Typography fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LocalPharmacy color="success" fontSize="small" />
                          Ordonnance
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Dr {o.consultation?.doctor?.firstName} {o.consultation?.doctor?.lastName}
                          {' — '}{formatDateTime(o.createdAt)}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        {getOrdonnanceStatusChip(o.status)}
                        {o.dateDelivrance && (
                          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                            Délivrée le {formatDate(o.dateDelivrance)}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Divider sx={{ mb: 1.5 }} />
                    <List dense disablePadding>
                      {o.medicaments?.map((med, mi) => (
                        <ListItem key={mi} disableGutters sx={{ py: 0.3 }}>
                          <ListItemIcon sx={{ minWidth: 30 }}>
                            <Medication fontSize="small" color="action" />
                          </ListItemIcon>
                          <ListItemText
                            primary={<Typography fontWeight="medium">{med.nom}</Typography>}
                            secondary={`${med.dosage} — ${med.frequence} — ${med.duree}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                ))
              )}
            </Box>
          )}

          {/* ─── Tab 2 : Toutes les analyses ─── */}
          {tabIndex === 2 && (
            <Box>
              {analyses.length === 0 ? (
                <Alert severity="info">Aucune analyse enregistrée.</Alert>
              ) : (
                analyses.map((a: Analyse) => (
                  <Paper key={a.id} variant="outlined" sx={{ p: 2.5, mb: 2, borderRadius: 2, borderLeft: '4px solid', borderLeftColor: 'warning.main' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box>
                        <Typography fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Science color="warning" fontSize="small" />
                          {a.description}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Dr {a.consultation?.doctor?.firstName} {a.consultation?.doctor?.lastName}
                          {' — '}{formatDateTime(a.createdAt)}
                        </Typography>
                      </Box>
                      {getAnalyseStatusChip(a.status)}
                    </Box>
                    {a.laboratoire && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Laboratoire : {a.laboratoire.firstName} {a.laboratoire.lastName}
                      </Typography>
                    )}
                    {a.resultat && (
                      <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5, bgcolor: 'grey.50' }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>Résultat</Typography>
                        <Typography variant="body2">{a.resultat}</Typography>
                      </Paper>
                    )}
                    {a.dateResultat && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Date du résultat : {formatDate(a.dateResultat)}
                      </Typography>
                    )}
                  </Paper>
                ))
              )}
            </Box>
          )}

          {/* ─── Tab 3 : Documents ─── */}
          {tabIndex === 3 && (
            <Box>
              {documents.length === 0 ? (
                <Alert severity="info">Aucun document enregistré.</Alert>
              ) : (
                <Grid container spacing={2}>
                  {documents.map((doc: DocType) => (
                    <Grid item xs={12} sm={6} md={4} key={doc.id}>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                          {doc.mimeType?.includes('pdf') ? (
                            <PictureAsPdf sx={{ fontSize: 36, color: 'error.main' }} />
                          ) : (
                            <InsertDriveFile sx={{ fontSize: 36, color: 'primary.main' }} />
                          )}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography fontWeight="bold" noWrap title={doc.fileName}>
                              {doc.fileName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {(doc.fileSize / 1024).toFixed(1)} KB
                            </Typography>
                          </Box>
                        </Box>
                        <Chip
                          label={doc.type}
                          size="small"
                          color={
                            doc.type === 'consultation' ? 'primary'
                            : doc.type === 'ordonnance' ? 'success'
                            : doc.type === 'analyse' ? 'warning'
                            : 'default'
                          }
                          sx={{ mb: 1 }}
                        />
                        {doc.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {doc.description}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary" display="block">
                          {formatDateTime(doc.createdAt)}
                          {doc.uploader && ` — par ${doc.uploader.firstName} ${doc.uploader.lastName}`}
                        </Typography>
                        {doc.fileUrl && (
                          <Button
                            size="small"
                            variant="outlined"
                            href={doc.fileUrl}
                            target="_blank"
                            sx={{ mt: 1 }}
                          >
                            Télécharger
                          </Button>
                        )}
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
