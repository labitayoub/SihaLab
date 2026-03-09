import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, TextField, Button, Divider, MenuItem,
  IconButton, CircularProgress, Alert, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions,
} from '@mui/material';
import { Delete, Add, Save, CheckCircle, Edit, PictureAsPdf, Cancel, Download, Visibility } from '@mui/icons-material';
import { toast, confirm } from '../utils/toast';
import api from '../config/api';

interface Medicament {
  nom: string;
  dosage: string;
  frequence: string;
  duree: string;
}

function getOrdonnanceStatusLabel(status: string) {
  switch (status) {
    case 'delivree': return 'délivrée';
    case 'annulee': return 'annulée';
    default: return 'en attente';
  }
}

function getAnalyseStatusLabel(status: string) {
  switch (status) {
    case 'terminee': return 'délivrée';
    case 'en_cours': return 'en cours';
    default: return 'en attente';
  }
}

function getOrdonnanceStatusColor(status: string): 'warning' | 'success' | 'error' {
  switch (status) {
    case 'delivree': return 'success';
    case 'annulee': return 'error';
    default: return 'warning';
  }
}

function getAnalyseStatusColor(status: string): 'warning' | 'success' | 'info' {
  switch (status) {
    case 'terminee': return 'success';
    case 'en_cours': return 'info';
    default: return 'warning';
  }
}

function getConsultationStatusLabel(status: string) {
  switch (status) {
    case 'terminee': return 'Terminée';
    case 'annulee': return 'Annulée';
    default: return 'En cours';
  }
}

function getConsultationStatusColor(status: string): 'warning' | 'success' | 'error' {
  switch (status) {
    case 'terminee': return 'success';
    case 'annulee': return 'error';
    default: return 'warning';
  }
}

export default function ConsultationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [consultation, setConsultation] = useState<any>(null);
  const [ordonnances, setOrdonnances] = useState<any[]>([]);
  const [analyses, setAnalyses] = useState<any[]>([]);

  // Edit mode for consultation info
  const [editMode, setEditMode] = useState(false);
  const [diagnostic, setDiagnostic] = useState('');
  const [notes, setNotes] = useState('');

  // Pharmacists & labs
  const [pharmaciens, setPharmaciens] = useState<any[]>([]);
  const [laboratoires, setLaboratoires] = useState<any[]>([]);

  // Ordonnance form
  const [pharmacienId, setPharmacienId] = useState('');
  const [medicaments, setMedicaments] = useState<Medicament[]>([
    { nom: '', dosage: '', frequence: '', duree: '' },
  ]);

  // Edit existing ordonnance
  const [editingOrdId, setEditingOrdId] = useState<string | null>(null);
  const [editOrdMeds, setEditOrdMeds] = useState<Medicament[]>([]);
  const [editOrdPharmacienId, setEditOrdPharmacienId] = useState('');

  // Analyse form
  const [labId, setLabId] = useState('');
  const [descriptionAnalyse, setDescriptionAnalyse] = useState('');

  // Edit existing analyse
  const [editingAnId, setEditingAnId] = useState<string | null>(null);
  const [editAnDescription, setEditAnDescription] = useState('');
  const [editAnLabId, setEditAnLabId] = useState('');

  // Confirm delete dialog
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: 'ordonnance' | 'analyse'; id: string; label: string } | null>(null);

  // PDF generation
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    Promise.all([
      loadConsultation(),
      loadPharmaciens(),
      loadLaboratoires(),
    ]);
  }, []);

  const loadAll = () => {
    loadConsultation();
  };

  const loadConsultation = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/consultations/${id}`);
      setConsultation(data);
      setDiagnostic(data.diagnostic || '');
      setNotes(data.notes || '');

      // Use dedicated endpoints with consultationId filter for reliable JSONB deserialization
      const [ordRes, anRes] = await Promise.allSettled([
        api.get(`/ordonnances?consultationId=${id}`),
        api.get(`/analyses?consultationId=${id}`),
      ]);
      setOrdonnances(ordRes.status === 'fulfilled' ? ordRes.value.data || [] : data.ordonnances || []);
      setAnalyses(anRes.status === 'fulfilled' ? anRes.value.data || [] : data.analyses || []);
    } catch {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadPharmaciens = async () => {
    try {
      const { data } = await api.get('/users?role=pharmacien');
      setPharmaciens(data.data || data || []);
    } catch {
      setPharmaciens([]);
    }
  };

  const loadLaboratoires = async () => {
    try {
      const { data } = await api.get('/users?role=laboratoire');
      setLaboratoires(data.data || data || []);
    } catch {
      setLaboratoires([]);
    }
  };

  const handleSaveConsultation = async () => {
    try {
      await api.patch(`/consultations/${id}`, { diagnostic, notes });
      toast.success('Consultation enregistrée');
      setConsultation((prev: any) => ({ ...prev, diagnostic, notes }));
      setEditMode(false);
    } catch {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const handleAddMedicament = () => {
    setMedicaments([...medicaments, { nom: '', dosage: '', frequence: '', duree: '' }]);
  };

  const handleRemoveMedicament = (idx: number) => {
    setMedicaments(medicaments.filter((_, i) => i !== idx));
  };

  const handleMedicamentChange = (idx: number, field: keyof Medicament, value: string) => {
    const updated = [...medicaments];
    updated[idx][field] = value;
    setMedicaments(updated);
  };

  const handleCreateOrdonnance = async () => {
    const filled = medicaments.filter((m) => m.nom.trim());
    if (filled.length === 0) {
      toast.warning('Ajoutez au moins un médicament');
      return;
    }
    try {
      await api.post('/ordonnances', {
        consultationId: id,
        pharmacienId: pharmacienId || undefined,
        medicaments: filled,
      });
      toast.success('Ordonnance créée');
      setMedicaments([{ nom: '', dosage: '', frequence: '', duree: '' }]);
      setPharmacienId('');
      loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const handleCreateAnalyse = async () => {
    if (!descriptionAnalyse.trim()) {
      toast.warning('Entrez une description');
      return;
    }
    try {
      await api.post('/analyses', {
        consultationId: id,
        labId: labId || undefined,
        description: descriptionAnalyse,
      });
      toast.success('Analyse prescrite');
      setDescriptionAnalyse('');
      setLabId('');
      loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  // ── Edit ordonnance ──
  const startEditOrd = (o: any) => {
    setEditingOrdId(o.id);
    setEditOrdMeds(o.medicaments?.map((m: any) => ({ ...m })) || [{ nom: '', dosage: '', frequence: '', duree: '' }]);
    setEditOrdPharmacienId(o.pharmacienId || '');
  };

  const cancelEditOrd = () => { setEditingOrdId(null); };

  const handleSaveOrd = async (ordId: string) => {
    const filled = editOrdMeds.filter((m) => m.nom.trim());
    if (filled.length === 0) { toast.warning('Ajoutez au moins un médicament'); return; }
    try {
      await api.patch(`/ordonnances/${ordId}`, { medicaments: filled, pharmacienId: editOrdPharmacienId || undefined });
      toast.success('Ordonnance mise à jour');
      setEditingOrdId(null);
      loadAll();
    } catch { toast.error('Erreur mise à jour ordonnance'); }
  };

  const addEditOrdMed = () => setEditOrdMeds([...editOrdMeds, { nom: '', dosage: '', frequence: '', duree: '' }]);
  const removeEditOrdMed = (i: number) => setEditOrdMeds(editOrdMeds.filter((_, idx) => idx !== i));
  const changeEditOrdMed = (i: number, field: keyof Medicament, val: string) => {
    const arr = [...editOrdMeds]; arr[i][field] = val; setEditOrdMeds(arr);
  };

  // ── Edit analyse ──
  const startEditAn = (a: any) => {
    setEditingAnId(a.id);
    setEditAnDescription(a.description || '');
    setEditAnLabId(a.labId || '');
  };

  const cancelEditAn = () => { setEditingAnId(null); };

  const handleSaveAn = async (anId: string) => {
    if (!editAnDescription.trim()) { toast.warning('Entrez une description'); return; }
    try {
      await api.patch(`/analyses/${anId}`, { description: editAnDescription, labId: editAnLabId || undefined });
      toast.success('Analyse mise à jour');
      setEditingAnId(null);
      loadAll();
    } catch { toast.error('Erreur mise à jour analyse'); }
  };

  // ── Delete ──
  const confirmDelete = (type: 'ordonnance' | 'analyse', itemId: string, label: string) => {
    setDeleteDialog({ open: true, type, id: itemId, label });
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    const label = deleteDialog.type === 'ordonnance' ? 'cette ordonnance' : 'cette analyse';
    const ok = await confirm({
      title: `Supprimer ${label} ?`,
      text: 'Cette action est définitive et irréversible.',
      icon: 'error',
      confirmText: 'Supprimer',
      confirmColor: '#f44336',
    });
    if (!ok) return;
    try {
      if (deleteDialog.type === 'ordonnance') {
        await api.delete(`/ordonnances/${deleteDialog.id}`);
        toast.success('Ordonnance supprimée');
      } else {
        await api.delete(`/analyses/${deleteDialog.id}`);
        toast.success('Analyse supprimée');
      }
      setDeleteDialog(null);
      loadAll();
    } catch { toast.error('Erreur lors de la suppression'); }
  };



  const handleCancelConsultation = async () => {
    const ok = await confirm({
      title: 'Annuler cette consultation ?',
      text: 'Le rendez-vous associé sera également annulé. Cette action est irréversible.',
      icon: 'warning',
      confirmText: 'Oui, annuler',
      confirmColor: '#f44336',
    });
    if (!ok) return;
    try {
      await api.delete(`/consultations/${id}/cancel`);
      toast.success('Consultation annulée — Le rendez-vous est annulé');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'annulation');
    }
  };

  const handleGeneratePdfs = async () => {
    setGenerating(true);
    try {
      // Save diagnostic & notes before generating PDFs
      await api.patch(`/consultations/${id}`, { diagnostic, notes });
      const { data } = await api.post(`/consultations/${id}/generate-pdfs`);
      toast.success(data.message || 'PDF(s) générés — Consultation terminée');
      // Reload consultation to get updated ordonnancePdfUrl / analysePdfUrl
      loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de la génération des PDFs');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!consultation) {
    return <Alert severity="error">Consultation introuvable.</Alert>;
  }

  const formattedDate = new Date(consultation.date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto' }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        Détails de la consultation
      </Typography>

      {/* ── Informations générales ── */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
          Informations générales
        </Typography>

        {/* Info summary always visible */}
        <Alert severity="info" icon={false} sx={{ mb: 2 }}>
          <Typography variant="body2"><strong>Date:</strong> {formattedDate}</Typography>
          <Typography variant="body2">
            <strong>Patient:</strong> {consultation.patient?.firstName} {consultation.patient?.lastName}
          </Typography>
          <Box sx={{ mt: 1 }}>
            <strong>Statut :</strong>{' '}
            <Chip
              label={getConsultationStatusLabel(consultation.status)}
              size="small"
              color={getConsultationStatusColor(consultation.status)}
              sx={{ fontWeight: 'bold' }}
            />
          </Box>
        </Alert>

        {consultation.status === 'terminee' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Cette consultation est terminée. Les modifications ne sont plus possibles.
          </Alert>
        )}
        {consultation.status === 'annulee' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Cette consultation a été annulée.
          </Alert>
        )}

        {!editMode && (consultation.diagnostic || consultation.notes) ? (
          <Box sx={{ bgcolor: '#f5faf5', border: '1px solid #c8e6c9', borderRadius: 1, p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="body2" color="success.dark" fontWeight="bold">
                Informations actuelles
              </Typography>
              {consultation.status === 'en_cours' && (
                <Button
                  size="small"
                  startIcon={<Edit />}
                  onClick={() => setEditMode(true)}
                  sx={{ textTransform: 'uppercase', fontSize: '0.7rem', color: 'primary.main', p: 0 }}
                >
                  Modifier
                </Button>
              )}
            </Box>
            {consultation.diagnostic && (
              <Typography variant="body2">
                <strong>Diagnostic:</strong> {consultation.diagnostic}
              </Typography>
            )}
            {consultation.notes && (
              <Typography variant="body2">
                <strong>Notes:</strong> {consultation.notes}
              </Typography>
            )}
          </Box>
        ) : null}

        {consultation.status === 'en_cours' && (editMode || (!consultation.diagnostic && !consultation.notes)) && (
          <>
            <TextField
              fullWidth
              label="Diagnostic *"
              value={diagnostic}
              onChange={(e) => setDiagnostic(e.target.value)}
              multiline
              rows={2}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSaveConsultation}
                sx={{ textTransform: 'uppercase' }}
              >
                Enregistrer
              </Button>
              {editMode && (
                <Button variant="outlined" onClick={() => setEditMode(false)}>
                  Annuler
                </Button>
              )}
            </Box>
          </>
        )}
      </Paper>

      {/* ── Ordonnance ── */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
          Ordonnance (Document unique)
        </Typography>

        {/* Existing ordonnance (only ONE allowed) */}
        {ordonnances.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Une ordonnance est déjà associée à cette consultation. Pour ajouter ou retirer des médicaments, veuillez la modifier.
            </Alert>
            {ordonnances.map((o: any, idx: number) => (
              <Box
                key={o.id}
                sx={{ bgcolor: '#f5faf5', border: '1px solid #c8e6c9', borderRadius: 1, p: 2 }}
              >
                {editingOrdId === o.id ? (
                  /* ── Inline edit form ── */
                  <Box>
                    <TextField
                      select fullWidth label="Pharmacien" value={editOrdPharmacienId}
                      onChange={(e) => setEditOrdPharmacienId(e.target.value)}
                      size="small" sx={{ mb: 2 }}
                    >
                      <MenuItem value="">— Aucun pharmacien —</MenuItem>
                      {pharmaciens.map((p) => (
                        <MenuItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</MenuItem>
                      ))}
                    </TextField>
                    {editOrdMeds.map((med, mi) => (
                      <Box key={mi} sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'center' }}>
                        <TextField label="Médicament" value={med.nom} onChange={(e) => changeEditOrdMed(mi, 'nom', e.target.value)} size="small" sx={{ flex: 2 }} />
                        <TextField label="Dosage" value={med.dosage} onChange={(e) => changeEditOrdMed(mi, 'dosage', e.target.value)} size="small" sx={{ flex: 1.5 }} />
                        <TextField label="Fréquence" value={med.frequence} onChange={(e) => changeEditOrdMed(mi, 'frequence', e.target.value)} size="small" sx={{ flex: 1.5 }} />
                        <TextField label="Durée" value={med.duree} onChange={(e) => changeEditOrdMed(mi, 'duree', e.target.value)} size="small" sx={{ flex: 1.5 }} />
                        <IconButton color="error" onClick={() => removeEditOrdMed(mi)} disabled={editOrdMeds.length === 1} size="small"><Delete /></IconButton>
                      </Box>
                    ))}
                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                      <Button size="small" startIcon={<Add />} onClick={addEditOrdMed}>+ Ajouter un médicament</Button>
                      <Button size="small" variant="contained" startIcon={<Save />} onClick={() => handleSaveOrd(o.id)}>Mettre à jour l'ordonnance</Button>
                      <Button size="small" variant="outlined" startIcon={<Cancel />} onClick={cancelEditOrd}>Annuler</Button>
                    </Box>
                  </Box>
                ) : (
                  /* ── Display mode ── */
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <CheckCircle sx={{ fontSize: 20, color: 'success.main' }} />
                      <Typography variant="body1" fontWeight="bold" sx={{ flex: 1 }}>
                        Prescription en cours - Statut:{' '}
                        <Chip label={getOrdonnanceStatusLabel(o.status)} size="small" color={getOrdonnanceStatusColor(o.status)} sx={{ fontWeight: 'bold' }} />
                      </Typography>
                      {consultation.status === 'en_cours' && (
                        <>
                          <Button size="small" variant="outlined" startIcon={<Edit />} onClick={() => startEditOrd(o)}>Modifier / Ajouter Médicaments</Button>
                          <IconButton size="small" color="error" onClick={() => confirmDelete('ordonnance', o.id, `l'ordonnance`)} title="Supprimer l'ordonnance"><Delete /></IconButton>
                        </>
                      )}
                    </Box>
                    {o.medicaments?.map((med: any, mi: number) => (
                      <Typography key={mi} variant="body2" sx={{ pl: 4, py: 0.5, color: '#333', borderBottom: mi !== o.medicaments.length - 1 ? '1px dashed #e0e0e0' : 'none' }}>
                        • <strong>{med.nom}</strong> {med.dosage && `- ${med.dosage}`} {(med.frequence || med.duree) && `(${med.frequence} pendant ${med.duree})`}
                      </Typography>
                    ))}
                  </>
                )}
              </Box>
            ))}
          </Box>
        )}

        {/* New ordonnance form (only if 0 ordonnances and consultation en_cours) */}
        {ordonnances.length === 0 && consultation.status === 'en_cours' && (
          <Box>
            <Divider sx={{ mb: 3 }} />
            <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>Nouvelle ordonnance</Typography>
            <TextField
              select
              fullWidth
              label="Pharmacien"
              value={pharmacienId}
              onChange={(e) => setPharmacienId(e.target.value)}
              sx={{ mb: 2 }}
              size="small"
            >
              <MenuItem value="">— Aucun pharmacien —</MenuItem>
              {pharmaciens.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </MenuItem>
              ))}
            </TextField>

            {medicaments.map((med, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'center' }}>
                <TextField
                  label="Médicament"
                  value={med.nom}
                  onChange={(e) => handleMedicamentChange(idx, 'nom', e.target.value)}
                  size="small"
                  sx={{ flex: 2 }}
                />
                <TextField
                  label="Dosage"
                  value={med.dosage}
                  onChange={(e) => handleMedicamentChange(idx, 'dosage', e.target.value)}
                  size="small"
                  sx={{ flex: 1.5 }}
                />
                <TextField
                  label="Fréquence"
                  value={med.frequence}
                  onChange={(e) => handleMedicamentChange(idx, 'frequence', e.target.value)}
                  size="small"
                  sx={{ flex: 1.5 }}
                />
                <TextField
                  label="Durée"
                  value={med.duree}
                  onChange={(e) => handleMedicamentChange(idx, 'duree', e.target.value)}
                  size="small"
                  sx={{ flex: 1.5 }}
                />
                <IconButton color="error" onClick={() => handleRemoveMedicament(idx)} disabled={medicaments.length === 1} size="small">
                  <Delete />
                </IconButton>
              </Box>
            ))}

            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Button startIcon={<Add />} onClick={handleAddMedicament} size="small" variant="outlined">
                + Ajouter médicament
              </Button>
              <Button variant="contained" onClick={handleCreateOrdonnance} size="small" sx={{ textTransform: 'uppercase' }}>
                Créer l'ordonnance
              </Button>
            </Box>
          </Box>
        )}
      </Paper>

      {/* ── Analyse de laboratoire ── */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
          Analyse de laboratoire (Document unique)
        </Typography>

        {/* Existing analyses */}
        {analyses.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Une demande d'analyse est déjà associée à cette consultation. Pour ajouter ou modifier des analyses, veuillez la modifier.
            </Alert>
            {analyses.map((a: any, idx: number) => (
              <Box
                key={a.id}
                sx={{ bgcolor: '#f5faf5', border: '1px solid #c8e6c9', borderRadius: 1, p: 2 }}
              >
                {editingAnId === a.id ? (
                  /* ── Inline edit form ── */
                  <Box>
                    <TextField
                      select fullWidth label="Laboratoire" value={editAnLabId}
                      onChange={(e) => setEditAnLabId(e.target.value)}
                      size="small" sx={{ mb: 2 }}
                    >
                      <MenuItem value="">— Aucun laboratoire —</MenuItem>
                      {laboratoires.map((l) => (
                        <MenuItem key={l.id} value={l.id}>{l.firstName} {l.lastName}</MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      fullWidth label="Description des analyses (vous pouvez lister plusieurs analyses sur plusieurs lignes)" value={editAnDescription}
                      onChange={(e) => setEditAnDescription(e.target.value)}
                      multiline rows={4} size="small" sx={{ mb: 2 }}
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button size="small" variant="contained" startIcon={<Save />} onClick={() => handleSaveAn(a.id)}>Mettre à jour l'analyse</Button>
                      <Button size="small" variant="outlined" startIcon={<Cancel />} onClick={cancelEditAn}>Annuler</Button>
                    </Box>
                  </Box>
                ) : (
                  /* ── Display mode ── */
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <CheckCircle sx={{ fontSize: 20, color: 'success.main' }} />
                      <Typography variant="body1" fontWeight="bold" sx={{ flex: 1 }}>
                        Analyse en cours - Statut:{' '}
                        <Chip label={getAnalyseStatusLabel(a.status)} size="small" color={getAnalyseStatusColor(a.status)} sx={{ fontWeight: 'bold' }} />
                      </Typography>
                      {consultation.status === 'en_cours' && (
                        <>
                          <Button size="small" variant="outlined" startIcon={<Edit />} onClick={() => startEditAn(a)}>Modifier les analyses</Button>
                          <IconButton size="small" color="error" onClick={() => confirmDelete('analyse', a.id, `l'analyse`)} title="Supprimer l'analyse"><Delete /></IconButton>
                        </>
                      )}
                    </Box>
                    <Box sx={{ pl: 4, py: 1 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-line' }}>
                        {a.description}
                      </Typography>
                    </Box>
                    {a.resultat && (
                      <Typography variant="body2" sx={{ pl: 4, mt: 1, color: 'text.secondary' }}>
                        <strong>Résultat :</strong> {a.resultat}
                      </Typography>
                    )}
                    {a.resultatFileUrl && (
                      <Box sx={{ pl: 4, mt: 1 }}>
                        <Button size="small" startIcon={<PictureAsPdf />} href={a.resultatFileUrl} target="_blank"
                          sx={{ textTransform: 'uppercase', fontSize: '0.7rem', color: 'primary.main', p: 0 }}>
                          Voir PDF des résultats
                        </Button>
                      </Box>
                    )}
                  </>
                )}
              </Box>
            ))}
          </Box>
        )}

        {/* New analyse form */}
        {analyses.length === 0 && consultation.status === 'en_cours' && (
          <Box>
            <Divider sx={{ mb: 3 }} />
            <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>Prescrire une nouvelle analyse</Typography>
            <TextField
              select
              fullWidth
              label="Laboratoire"
              value={labId}
              onChange={(e) => setLabId(e.target.value)}
              sx={{ mb: 2 }}
              size="small"
            >
              <MenuItem value="">— Aucun laboratoire —</MenuItem>
              {laboratoires.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {l.firstName} {l.lastName}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              label="Description des analyses (Vous pouvez lister plusieurs analyses ici)"
              value={descriptionAnalyse}
              onChange={(e) => setDescriptionAnalyse(e.target.value)}
              multiline
              rows={4}
              sx={{ mb: 2 }}
              size="small"
            />

            <Button
              variant="contained"
              onClick={handleCreateAnalyse}
              sx={{ textTransform: 'uppercase' }}
            >
              Créer la demande d'analyse
            </Button>
          </Box>
        )}
      </Paper>

      {/* ── Generate PDFs ── */}
      {consultation.status === 'en_cours' && (ordonnances.length > 0 || analyses.length > 0) && (
        <Paper
          variant="outlined"
          sx={{
            p: 3, mb: 3, borderRadius: 2,
            background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
            border: '1px solid #90caf9',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <PictureAsPdf sx={{ fontSize: 40, color: '#d32f2f' }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Générer les documents PDF
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Génère les ordonnances et analyses en PDF avec QR code, en-tête médecin et filigrane.
                La consultation sera automatiquement marquée comme <strong>terminée</strong> après la génération.
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="large"
              startIcon={generating ? <CircularProgress size={20} color="inherit" /> : <PictureAsPdf />}
              onClick={handleGeneratePdfs}
              disabled={generating}
              sx={{
                textTransform: 'uppercase',
                fontWeight: 'bold',
                px: 4, py: 1.5,
                background: 'linear-gradient(45deg, #1565c0 30%, #7b1fa2 90%)',
                '&:hover': { background: 'linear-gradient(45deg, #0d47a1 30%, #6a1b9a 90%)' },
              }}
            >
              {generating ? 'Génération...' : 'Générer & Terminer'}
            </Button>
          </Box>
        </Paper>
      )}

      {/* ── Documents PDF générés ── */}
      {(consultation.ordonnancePdfUrl || consultation.analysePdfUrl) && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: '#fafafa' }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
            📄 Documents PDF générés
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {consultation.ordonnancePdfUrl && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: 1, bgcolor: '#e8f5e9', border: '1px solid #c8e6c9' }}>
                <PictureAsPdf sx={{ color: '#d32f2f', fontSize: 28 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight="bold" color="text.primary">
                    Ordonnance médicale
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {consultation.patient?.lastName} {consultation.patient?.firstName} — {formattedDate}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Visibility />}
                  href={consultation.ordonnancePdfUrl}
                  target="_blank"
                  sx={{ textTransform: 'none', mr: 1 }}
                >
                  Voir
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<Download />}
                  href={consultation.ordonnancePdfUrl}
                  download
                  sx={{ textTransform: 'none' }}
                >
                  Télécharger
                </Button>
              </Box>
            )}
            {consultation.analysePdfUrl && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: 1, bgcolor: '#e3f2fd', border: '1px solid #bbdefb' }}>
                <PictureAsPdf sx={{ color: '#d32f2f', fontSize: 28 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight="bold" color="text.primary">
                    Demande d'analyses
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {consultation.patient?.lastName} {consultation.patient?.firstName} — {formattedDate}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Visibility />}
                  href={consultation.analysePdfUrl}
                  target="_blank"
                  sx={{ textTransform: 'none', mr: 1 }}
                >
                  Voir
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<Download />}
                  href={consultation.analysePdfUrl}
                  download
                  sx={{ textTransform: 'none' }}
                >
                  Télécharger
                </Button>
              </Box>
            )}
          </Box>
        </Paper>
      )}

      {/* ── Footer buttons ── */}
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          onClick={() => navigate('/consultations')}
          sx={{ textTransform: 'uppercase' }}
        >
          Retour
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {consultation.status === 'en_cours' && (
            <Button
              variant="outlined"
              color="error"
              onClick={handleCancelConsultation}
              sx={{ textTransform: 'uppercase' }}
            >
              Annuler la consultation
            </Button>
          )}
        </Box>
      </Box>

      {/* ── Delete confirmation dialog ── */}
      <Dialog open={!!deleteDialog?.open} onClose={() => setDeleteDialog(null)}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer <strong>{deleteDialog?.label}</strong> ? Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(null)}>Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Supprimer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


