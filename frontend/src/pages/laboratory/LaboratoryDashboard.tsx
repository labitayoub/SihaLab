import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Chip, TextField, MenuItem, InputAdornment,
  Tabs, Tab, CircularProgress, Alert, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, Grid, Divider,
} from '@mui/material';
import {
  Search, Science, HourglassEmpty, PlayArrow, CheckCircle, Visibility, Close, Person,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { Analyse, AnalyseStatus } from '../../types/analyse.types';
import api from '../../config/api';
import { toast } from '../../utils/toast';

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function getStatusLabel(status: AnalyseStatus): string {
  switch (status) {
    case AnalyseStatus.EN_ATTENTE: return 'En attente';
    case AnalyseStatus.EN_COURS: return 'En cours';
    case AnalyseStatus.TERMINEE: return 'Terminée';
    default: return status;
  }
}

function getStatusColor(status: AnalyseStatus): 'warning' | 'info' | 'success' {
  switch (status) {
    case AnalyseStatus.EN_ATTENTE: return 'warning';
    case AnalyseStatus.EN_COURS: return 'info';
    case AnalyseStatus.TERMINEE: return 'success';
    default: return 'warning';
  }
}

interface TestResult {
  testName: string;
  resultValue: string;
  unit?: string;
  normalRange?: string;
  isAbnormal?: boolean;
}

export default function LaboratoryDashboard() {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<Analyse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [shouldSwitchToCompleted, setShouldSwitchToCompleted] = useState(false);
  
  // Result entry dialog
  const [selectedAnalyse, setSelectedAnalyse] = useState<Analyse | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([
    { testName: '', resultValue: '', unit: '', normalRange: '', isAbnormal: false },
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAnalyses();
  }, []);

  // Switch to completed tab after analyses are updated
  useEffect(() => {
    if (shouldSwitchToCompleted) {
      setTabValue(2);
      setShouldSwitchToCompleted(false);
    }
  }, [analyses, shouldSwitchToCompleted]);

  const loadAnalyses = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/analyses');
      setAnalyses(data);
    } catch (error) {
      toast.error('Erreur lors du chargement des analyses');
    } finally {
      setLoading(false);
    }
  }, []);

  // Memoized counts - calculated once per analyses change
  const statusCounts = useMemo(() => {
    return {
      pending: analyses.filter(a => a.status === AnalyseStatus.EN_ATTENTE).length,
      inProgress: analyses.filter(a => a.status === AnalyseStatus.EN_COURS).length,
      completed: analyses.filter(a => a.status === AnalyseStatus.TERMINEE).length,
    };
  }, [analyses]);

  // Memoized filtered analyses - only recalculates when dependencies change
  const filteredAnalyses = useMemo(() => {
    let filtered = analyses;

    // Filter by tab status
    const statusMap = [AnalyseStatus.EN_ATTENTE, AnalyseStatus.EN_COURS, AnalyseStatus.TERMINEE];
    const targetStatus = statusMap[tabValue];
    filtered = filtered.filter(a => a.status === targetStatus);

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.consultation?.patient?.firstName?.toLowerCase().includes(query) ||
        a.consultation?.patient?.lastName?.toLowerCase().includes(query) ||
        a.consultation?.doctor?.firstName?.toLowerCase().includes(query) ||
        a.consultation?.doctor?.lastName?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [analyses, searchQuery, tabValue]);

  const handleOpenDialog = useCallback(async (analyse: Analyse) => {
    setSelectedAnalyse(analyse);
    
    // If analysis is EN_ATTENTE, start it automatically
    if (analyse.status === AnalyseStatus.EN_ATTENTE) {
      try {
        const { data } = await api.post(`/analyses/${analyse.id}/start`);
        toast.success('Analyse commencée');
        
        // Update local state instead of full reload
        setAnalyses(prev => prev.map(a => a.id === analyse.id ? data : a));
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Erreur lors du démarrage de l\'analyse');
        return;
      }
    }
    
    // Load existing results if available
    if (analyse.resultat) {
      try {
        const parsed = JSON.parse(analyse.resultat);
        setTestResults(parsed);
      } catch {
        setTestResults([{ testName: '', resultValue: '', unit: '', normalRange: '', isAbnormal: false }]);
      }
    } else {
      setTestResults([{ testName: '', resultValue: '', unit: '', normalRange: '', isAbnormal: false }]);
    }
    
    setDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setSelectedAnalyse(null);
    setTestResults([{ testName: '', resultValue: '', unit: '', normalRange: '', isAbnormal: false }]);
  }, []);

  const handleAddTestResult = useCallback(() => {
    setTestResults(prev => [...prev, { testName: '', resultValue: '', unit: '', normalRange: '', isAbnormal: false }]);
  }, []);

  const handleRemoveTestResult = useCallback((index: number) => {
    setTestResults(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleTestResultChange = useCallback((index: number, field: keyof TestResult, value: any) => {
    setTestResults(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const handleSubmitResults = useCallback(async () => {
    if (!selectedAnalyse) return;

    // Validation
    const validResults = testResults.filter(r => r.testName.trim() && r.resultValue.trim());
    if (validResults.length === 0) {
      toast.error('Au moins un résultat de test est requis');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post(`/analyses/${selectedAnalyse.id}/submit-results`, {
        results: validResults,
      });
      
      toast.success('✓ Résultats enregistrés — Rapport PDF généré');
      
      // Close dialog first
      handleCloseDialog();
      
      // Redirect to patient dossiers
      navigate('/laboratory/dossiers');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'enregistrement des résultats');
    } finally {
      setSubmitting(false);
    }
  }, [selectedAnalyse, testResults, handleCloseDialog, navigate]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 8 }}>
        <CircularProgress size={48} />
        <Typography sx={{ mt: 2 }} color="text.secondary">Chargement des analyses...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Gestion des Analyses</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Chip icon={<HourglassEmpty />} label={`${statusCounts.pending} En attente`} color="warning" />
          <Chip icon={<PlayArrow />} label={`${statusCounts.inProgress} En cours`} color="info" />
          <Chip icon={<CheckCircle />} label={`${statusCounts.completed} Terminées`} color="success" />
        </Box>
      </Box>

      {/* Search and Filter */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              size="small"
              placeholder="Rechercher par nom de patient ou médecin..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
        <Tab icon={<HourglassEmpty />} iconPosition="start" label={`En attente (${statusCounts.pending})`} />
        <Tab icon={<PlayArrow />} iconPosition="start" label={`En cours (${statusCounts.inProgress})`} />
        <Tab icon={<CheckCircle />} iconPosition="start" label={`Terminées (${statusCounts.completed})`} />
      </Tabs>

      {/* Analyses List */}
      {filteredAnalyses.length === 0 ? (
        <Alert severity="info">Aucune analyse trouvée.</Alert>
      ) : (
        filteredAnalyses.map((analyse) => (
          <Paper
            key={analyse.id}
            variant="outlined"
            sx={{ p: 2.5, mb: 2, borderRadius: 2, cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
            onClick={() => handleOpenDialog(analyse)}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Science sx={{ color: '#1976d2' }} />
                  <Typography variant="subtitle1" fontWeight="bold">
                    {analyse.consultation?.patient?.firstName} {analyse.consultation?.patient?.lastName}
                  </Typography>
                  <Chip
                    label={getStatusLabel(analyse.status)}
                    size="small"
                    color={getStatusColor(analyse.status)}
                    sx={{ fontWeight: 'bold' }}
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Demandé par: Dr {analyse.consultation?.doctor?.firstName} {analyse.consultation?.doctor?.lastName}
                </Typography>

                <Typography variant="body2" sx={{ mb: 1 }}>
                  {analyse.description}
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  Date de demande: {formatDate(analyse.createdAt)}
                </Typography>

                {analyse.dateResultat && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                    Date de résultat: {formatDate(analyse.dateResultat)}
                  </Typography>
                )}
              </Box>

              <Button
                variant="outlined"
                size="small"
                startIcon={analyse.status === AnalyseStatus.TERMINEE ? <Visibility /> : <PlayArrow />}
                sx={{ whiteSpace: 'nowrap' }}
              >
                {analyse.status === AnalyseStatus.TERMINEE ? 'Voir' : 'Traiter'}
              </Button>
            </Box>
          </Paper>
        ))
      )}

      {/* Result Entry Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold">
            {selectedAnalyse?.status === AnalyseStatus.TERMINEE ? 'Résultats d\'Analyse' : 'Saisie des Résultats'}
          </Typography>
          <IconButton onClick={handleCloseDialog}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedAnalyse && (
            <>
              {/* Patient & Doctor Info */}
              <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Patient</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {selectedAnalyse.consultation?.patient?.firstName} {selectedAnalyse.consultation?.patient?.lastName}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Médecin</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      Dr {selectedAnalyse.consultation?.doctor?.firstName} {selectedAnalyse.consultation?.doctor?.lastName}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Analyse demandée</Typography>
                    <Typography variant="body2">{selectedAnalyse.description}</Typography>
                  </Grid>
                </Grid>
              </Paper>

              <Divider sx={{ mb: 2 }} />

              {/* Test Results */}
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
                Résultats des Tests
              </Typography>

              {testResults.map((result, index) => (
                <Paper key={index} variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Nom du test"
                        value={result.testName}
                        onChange={(e) => handleTestResultChange(index, 'testName', e.target.value)}
                        disabled={selectedAnalyse.status === AnalyseStatus.TERMINEE}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Résultat"
                        value={result.resultValue}
                        onChange={(e) => handleTestResultChange(index, 'resultValue', e.target.value)}
                        disabled={selectedAnalyse.status === AnalyseStatus.TERMINEE}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Unité"
                        value={result.unit || ''}
                        onChange={(e) => handleTestResultChange(index, 'unit', e.target.value)}
                        disabled={selectedAnalyse.status === AnalyseStatus.TERMINEE}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Valeurs normales"
                        value={result.normalRange || ''}
                        onChange={(e) => handleTestResultChange(index, 'normalRange', e.target.value)}
                        disabled={selectedAnalyse.status === AnalyseStatus.TERMINEE}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        select
                        label="Anormal?"
                        value={result.isAbnormal ? 'yes' : 'no'}
                        onChange={(e) => handleTestResultChange(index, 'isAbnormal', e.target.value === 'yes')}
                        disabled={selectedAnalyse.status === AnalyseStatus.TERMINEE}
                      >
                        <MenuItem value="no">Non</MenuItem>
                        <MenuItem value="yes">Oui</MenuItem>
                      </TextField>
                    </Grid>
                  </Grid>
                  {selectedAnalyse.status !== AnalyseStatus.TERMINEE && testResults.length > 1 && (
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleRemoveTestResult(index)}
                      sx={{ mt: 1 }}
                    >
                      Supprimer
                    </Button>
                  )}
                </Paper>
              ))}

              {selectedAnalyse.status !== AnalyseStatus.TERMINEE && (
                <Button
                  variant="outlined"
                  onClick={handleAddTestResult}
                  sx={{ mb: 2 }}
                >
                  Ajouter un test
                </Button>
              )}

              {/* PDF Link */}
              {selectedAnalyse.resultatFileUrl && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Visibility />}
                    href={selectedAnalyse.resultatFileUrl}
                    target="_blank"
                  >
                    Voir le rapport PDF
                  </Button>
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Fermer</Button>
          {selectedAnalyse?.status !== AnalyseStatus.TERMINEE && (
            <Button
              variant="contained"
              onClick={handleSubmitResults}
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={20} /> : 'Marquer comme Terminée'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
