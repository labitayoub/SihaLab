import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Accordion, AccordionSummary,
  AccordionDetails, Paper, Divider, CircularProgress, Alert, Button, IconButton,
} from '@mui/material';
import {
  ExpandMore, LocalPharmacy, Science, ArrowBack, PictureAsPdf,
  CheckCircle, HourglassEmpty, PlayArrow, Add as AddIcon, Print, Visibility, Description, PostAdd, Download,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/user.types';
import { DossierMedical as DossierMedicalType, ConsultationWithDetails } from '../../types/dossier.types';
import { OrdonnanceStatus } from '../../types/ordonnance.types';
import { AnalyseStatus } from '../../types/analyse.types';
import api from '../../config/api';
import { toast } from '../../utils/toast';

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
  // Pharmaciens pour affichage pharmacie assignée
  const [pharmaciens, setPharmaciens] = useState<any[]>([]);
  useEffect(() => {
    api.get('/users/pharmaciens').then(({ data }) => setPharmaciens(data.data || data || [])).catch(() => setPharmaciens([]));
  }, []);
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
            {/* ── Accordion Header: date + doctor + status + badges ── */}
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
                <Chip
                  label={c.status === 'terminee' ? 'Terminée' : c.status === 'annulee' ? 'Annulée' : 'En cours'}
                  size="small"
                  color={c.status === 'terminee' ? 'success' : c.status === 'annulee' ? 'error' : 'warning'}
                  sx={{ fontWeight: 'bold' }}
                />
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
                {(c.ordonnancePdfUrl || c.analysePdfUrl ||
                  (c.ordonnances && c.ordonnances.some((o: any) => o.pdfUrl)) ||
                  (c.analyses && c.analyses.some((a: any) => a.pdfUrl))) && (
                  <Chip
                    icon={<PictureAsPdf />}
                    label="PDF"
                    size="small"
                    color="secondary"
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
                      sx={{ p: 2, mb: 1.5, borderRadius: 2, position: 'relative' }}
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
                      {/* Affichage pharmacie assignée */}
                      {o.pharmacienId && (() => {
                        const ph = pharmaciens.find((p) => p.id === o.pharmacienId);
                        if (!ph) return null;
                        return (
                          <Box sx={{
                            bgcolor: '#fff',
                            boxShadow: '0 2px 8px rgba(33,150,243,0.10)',
                            border: '1px solid #90caf9',
                            p: 1,
                            borderRadius: 2,
                            minWidth: 160,
                            mt: 1,
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 1
                          }}>
                            <span style={{marginRight: 6, color: '#1976d2'}}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="#1976d2"/></svg>
                            </span>
                            <Box>
                              <Typography variant="caption" color="primary" fontWeight="bold">Pharmacie assignée</Typography>
                              <Typography variant="body2" fontWeight={500}>{ph.firstName} {ph.lastName}</Typography>
                              {ph.address && <Typography variant="body2" sx={{ color: '#888' }}>Adresse: {ph.address}</Typography>}
                              {ph.phone && <Typography variant="body2" sx={{ color: '#888' }}>Tél: {ph.phone}</Typography>}
                            </Box>
                          </Box>
                        );
                      })()}
                      {o.pdfUrl && o.pdfUrl !== c.ordonnancePdfUrl && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, pt: 1, borderTop: '1px dashed #ffb300', flexWrap: 'wrap' }}>
                          <Chip
                            label="Ajouté après"
                            size="small"
                            icon={<PostAdd sx={{ fontSize: '14px !important' }} />}
                            sx={{ bgcolor: '#ffe082', color: '#e65100', fontWeight: 600, fontSize: 11, height: 20 }}
                          />
                          <Button size="small" variant="outlined" startIcon={<Visibility />} href={o.pdfUrl} target="_blank" sx={{ textTransform: 'none', fontSize: '0.75rem' }}>Voir PDF</Button>
                          <Button size="small" variant="contained" startIcon={<Download />} href={o.pdfUrl} download sx={{ textTransform: 'none', fontSize: '0.75rem', bgcolor: '#f57f17', '&:hover': { bgcolor: '#e65100' } }}>Télécharger</Button>
                        </Box>
                      )}
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
                      {a.pdfUrl && a.pdfUrl !== c.analysePdfUrl && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, pt: 1, borderTop: '1px dashed #ce93d8', flexWrap: 'wrap' }}>
                          <Chip
                            label="Ajouté après"
                            size="small"
                            icon={<PostAdd sx={{ fontSize: '14px !important' }} />}
                            sx={{ bgcolor: '#e1bee7', color: '#6a1b9a', fontWeight: 600, fontSize: 11, height: 20 }}
                          />
                          <Button size="small" variant="outlined" startIcon={<Visibility />} href={a.pdfUrl} target="_blank" sx={{ textTransform: 'none', fontSize: '0.75rem' }}>Voir PDF</Button>
                          <Button size="small" variant="contained" startIcon={<Download />} href={a.pdfUrl} download sx={{ textTransform: 'none', fontSize: '0.75rem', bgcolor: '#7b1fa2', '&:hover': { bgcolor: '#6a1b9a' } }}>Télécharger</Button>
                        </Box>
                      )}
                    </Paper>
                  ))}
                </>
              )}

              {/* ── Documents PDF liés à cette consultation ── */}
              {(c.ordonnancePdfUrl || c.analysePdfUrl ||
                (c.ordonnances && c.ordonnances.some((o: any) => o.pdfUrl)) ||
                (c.analyses && c.analyses.some((a: any) => a.pdfUrl))) && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" color="secondary.main" fontWeight="bold" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Description fontSize="small" /> Documents PDF de cette consultation
                  </Typography>

                  {/* PDF fusionné ordonnances */}
                  {c.ordonnancePdfUrl && (
                    <Paper
                      variant="outlined"
                      sx={{ p: 1.5, mb: 1, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#e8f5e9', border: '1px solid #c8e6c9' }}
                    >
                      <PictureAsPdf sx={{ color: '#d32f2f', fontSize: 28 }} />
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2" fontWeight="bold">Ordonnance médicale</Typography>
                          <Chip label="Consultation" size="small" icon={<CheckCircle sx={{ fontSize: '14px !important' }} />} sx={{ bgcolor: '#c8e6c9', color: '#2e7d32', fontWeight: 600, fontSize: 11, height: 20 }} />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Patient : {patientInfo?.lastName} {patientInfo?.firstName} — {new Date(c.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Box>
                      <Button size="small" variant="outlined" startIcon={<Visibility />} href={c.ordonnancePdfUrl} target="_blank" sx={{ textTransform: 'uppercase', fontSize: '0.7rem', mr: 0.5 }}>Voir</Button>
                      <Button size="small" variant="contained" startIcon={<Print />} onClick={() => { const w = window.open(c.ordonnancePdfUrl, '_blank'); if (w) w.addEventListener('load', () => w.print()); }} sx={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>Imprimer</Button>
                    </Paper>
                  )}

                  {/* PDFs individuels d’ordonnances */}
                  {c.ordonnances && c.ordonnances
                    .filter((o: any) => o.pdfUrl && o.pdfUrl !== c.ordonnancePdfUrl)
                    .map((o: any, oi: number) => (
                      <Paper key={o.id} variant="outlined" sx={{ p: 1.5, mb: 1, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#fff8e1', border: '1px dashed #ffb300' }}>
                        <PictureAsPdf sx={{ color: '#f57f17', fontSize: 28 }} />
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight="bold">Ordonnance #{oi + 1}</Typography>
                            <Chip label="Ajouté après" size="small" icon={<PostAdd sx={{ fontSize: '14px !important' }} />} sx={{ bgcolor: '#ffe082', color: '#e65100', fontWeight: 600, fontSize: 11, height: 20 }} />
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            Patient : {patientInfo?.lastName} {patientInfo?.firstName} — {new Date(o.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                          <Typography variant="caption" display="block" color="text.disabled" sx={{ fontSize: 10 }}>
                            {o.medicaments?.map((m: any) => m.nom).filter(Boolean).join(', ') || 'Ordonnance'}
                          </Typography>
                        </Box>
                        <Button size="small" variant="outlined" startIcon={<Visibility />} href={o.pdfUrl} target="_blank" sx={{ textTransform: 'uppercase', fontSize: '0.7rem', mr: 0.5 }}>Voir</Button>
                        <Button size="small" variant="contained" startIcon={<Download />} href={o.pdfUrl} download sx={{ textTransform: 'uppercase', fontSize: '0.7rem', bgcolor: '#f57f17', '&:hover': { bgcolor: '#e65100' } }}>Télécharger</Button>
                      </Paper>
                    ))}

                  {/* PDF fusionné analyses */}
                  {c.analysePdfUrl && (
                    <Paper
                      variant="outlined"
                      sx={{ p: 1.5, mb: 1, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#e3f2fd', border: '1px solid #bbdefb' }}
                    >
                      <PictureAsPdf sx={{ color: '#d32f2f', fontSize: 28 }} />
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2" fontWeight="bold">Demande d'analyses</Typography>
                          <Chip label="Consultation" size="small" icon={<CheckCircle sx={{ fontSize: '14px !important' }} />} sx={{ bgcolor: '#bbdefb', color: '#1565c0', fontWeight: 600, fontSize: 11, height: 20 }} />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Patient : {patientInfo?.lastName} {patientInfo?.firstName} — {new Date(c.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Box>
                      <Button size="small" variant="outlined" startIcon={<Visibility />} href={c.analysePdfUrl} target="_blank" sx={{ textTransform: 'uppercase', fontSize: '0.7rem', mr: 0.5 }}>Voir</Button>
                      <Button size="small" variant="contained" startIcon={<Print />} onClick={() => { const w = window.open(c.analysePdfUrl, '_blank'); if (w) w.addEventListener('load', () => w.print()); }} sx={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>Imprimer</Button>
                    </Paper>
                  )}

                  {/* PDFs individuels d’analyses */}
                  {c.analyses && c.analyses
                    .filter((a: any) => a.pdfUrl && a.pdfUrl !== c.analysePdfUrl)
                    .map((a: any, ai: number) => (
                      <Paper key={a.id} variant="outlined" sx={{ p: 1.5, mb: 1, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#f3e5f5', border: '1px dashed #ce93d8' }}>
                        <PictureAsPdf sx={{ color: '#7b1fa2', fontSize: 28 }} />
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight="bold">Analyse #{ai + 1}</Typography>
                            <Chip label="Ajouté après" size="small" icon={<PostAdd sx={{ fontSize: '14px !important' }} />} sx={{ bgcolor: '#e1bee7', color: '#6a1b9a', fontWeight: 600, fontSize: 11, height: 20 }} />
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            Patient : {patientInfo?.lastName} {patientInfo?.firstName} — {new Date(a.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                          <Typography variant="caption" display="block" color="text.disabled" sx={{ fontSize: 10 }}>
                            {a.description || 'Analyse'}
                          </Typography>
                        </Box>
                        <Button size="small" variant="outlined" startIcon={<Visibility />} href={a.pdfUrl} target="_blank" sx={{ textTransform: 'uppercase', fontSize: '0.7rem', mr: 0.5 }}>Voir</Button>
                        <Button size="small" variant="contained" startIcon={<Download />} href={a.pdfUrl} download sx={{ textTransform: 'uppercase', fontSize: '0.7rem', bgcolor: '#7b1fa2', '&:hover': { bgcolor: '#6a1b9a' } }}>Télécharger</Button>
                      </Paper>
                    ))}
                </>
              )}
            </AccordionDetails>
          </Accordion>
        ))
      )}


    </Box>
  );
}
