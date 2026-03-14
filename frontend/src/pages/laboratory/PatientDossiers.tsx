import { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Accordion, AccordionSummary, AccordionDetails,
  Chip, Button, CircularProgress, Alert, Grid, Divider, TextField, InputAdornment,
} from '@mui/material';
import {
  ExpandMore, Person, Science, CalendarToday, Visibility, Description, Search,
} from '@mui/icons-material';
import api from '../../config/api';
import { Analyse, AnalyseStatus } from '../../types/analyse.types';
import { toast } from '../../utils/toast';

interface PatientDossier {
  patientId: string;
  patientName: string;
  analyses: Analyse[];
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PatientDossiers() {
  const [dossiers, setDossiers] = useState<PatientDossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDossiers();
  }, []);

  const loadDossiers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/analyses', {
        params: { status: AnalyseStatus.TERMINEE },
      });

      // Group analyses by patient
      const grouped = data.reduce((acc: Record<string, PatientDossier>, analyse: Analyse) => {
        const patientId = analyse.consultation?.patient?.id;
        if (!patientId || !analyse.consultation?.patient) return acc;

        if (!acc[patientId]) {
          acc[patientId] = {
            patientId,
            patientName: `${analyse.consultation.patient.firstName} ${analyse.consultation.patient.lastName}`,
            analyses: [],
          };
        }

        acc[patientId].analyses.push(analyse);
        return acc;
      }, {});

      // Convert to array and sort analyses by date (most recent first)
      const dossiersArray = (Object.values(grouped) as PatientDossier[]).map((dossier: PatientDossier) => ({
        ...dossier,
        analyses: dossier.analyses.sort((a: Analyse, b: Analyse) => 
          new Date(b.dateResultat || b.createdAt || '').getTime() - 
          new Date(a.dateResultat || a.createdAt || '').getTime()
        ),
      }));

      // Sort dossiers by most recent analysis
      dossiersArray.sort((a, b) => {
        const dateA = new Date(a.analyses[0]?.dateResultat || a.analyses[0]?.createdAt || '').getTime();
        const dateB = new Date(b.analyses[0]?.dateResultat || b.analyses[0]?.createdAt || '').getTime();
        return dateB - dateA;
      });

      setDossiers(dossiersArray);
    } catch (error) {
      toast.error('Erreur lors du chargement des dossiers');
    } finally {
      setLoading(false);
    }
  };

  // Filter dossiers based on search query
  const filteredDossiers = useMemo(() => {
    if (!searchQuery.trim()) {
      return dossiers;
    }

    const query = searchQuery.toLowerCase();
    return dossiers.filter(dossier =>
      dossier.patientName.toLowerCase().includes(query)
    );
  }, [dossiers, searchQuery]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 8 }}>
        <CircularProgress size={48} />
        <Typography sx={{ mt: 2 }} color="text.secondary">
          Chargement des dossiers...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Dossiers Patients
        </Typography>
        <Chip
          icon={<Person />}
          label={`${filteredDossiers.length} Patient${filteredDossiers.length > 1 ? 's' : ''}`}
          color="primary"
        />
      </Box>

      {/* Search Bar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Rechercher un patient par nom..."
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
      </Paper>

      {filteredDossiers.length === 0 ? (
        <Alert severity="info">
          {searchQuery.trim() 
            ? `Aucun patient trouvé pour "${searchQuery}"`
            : 'Aucun dossier patient trouvé.'}
        </Alert>
      ) : (
        filteredDossiers.map((dossier) => (
          <Accordion key={dossier.patientId} sx={{ mb: 2, borderRadius: 2 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Person sx={{ color: '#1976d2' }} />
                <Typography variant="h6" fontWeight="bold">
                  {dossier.patientName}
                </Typography>
                <Chip
                  size="small"
                  label={`${dossier.analyses.length} analyse${dossier.analyses.length > 1 ? 's' : ''}`}
                  color="success"
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {dossier.analyses.map((analyse) => (
                  <Paper
                    key={analyse.id}
                    variant="outlined"
                    sx={{ p: 2, borderRadius: 2, bgcolor: '#fafafa' }}
                  >
                    <Grid container spacing={2}>
                      {/* Left side - Analysis info */}
                      <Grid item xs={12} md={8}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Science sx={{ color: '#1976d2', fontSize: 20 }} />
                          <Typography variant="subtitle1" fontWeight="bold">
                            {analyse.description}
                          </Typography>
                        </Box>

                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Demandé par: Dr {analyse.consultation?.doctor?.firstName}{' '}
                          {analyse.consultation?.doctor?.lastName}
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CalendarToday sx={{ fontSize: 16, color: '#64748b' }} />
                            <Typography variant="caption" color="text.secondary">
                              Demande: {formatDate(analyse.createdAt || null)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CalendarToday sx={{ fontSize: 16, color: '#64748b' }} />
                            <Typography variant="caption" color="text.secondary">
                              Résultat: {formatDate(analyse.dateResultat || null)}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>

                      {/* Right side - PDF buttons */}
                      <Grid item xs={12} md={4}>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1,
                            height: '100%',
                            justifyContent: 'center',
                          }}
                        >
                          {/* Analysis request PDF */}
                          {analyse.pdfUrl && (
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<Description />}
                              href={analyse.pdfUrl}
                              target="_blank"
                              fullWidth
                              sx={{ color: '#1976d2', borderColor: '#1976d2' }}
                            >
                              Demande d'Analyse
                            </Button>
                          )}

                          {/* Lab result PDF */}
                          {analyse.resultatFileUrl && (
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<Visibility />}
                              href={analyse.resultatFileUrl}
                              target="_blank"
                              fullWidth
                            >
                              Résultats d'Analyse
                            </Button>
                          )}
                        </Box>
                      </Grid>
                    </Grid>

                    <Divider sx={{ my: 1.5 }} />

                    {/* Results preview */}
                    {analyse.resultat && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold">
                          Résultats:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                          {(() => {
                            try {
                              const results = JSON.parse(analyse.resultat);
                              return results.map((r: any, idx: number) => (
                                <Chip
                                  key={idx}
                                  label={`${r.testName}: ${r.resultValue} ${r.unit || ''}`}
                                  size="small"
                                  color={r.isAbnormal ? 'error' : 'default'}
                                  variant="outlined"
                                />
                              ));
                            } catch {
                              return <Typography variant="caption">—</Typography>;
                            }
                          })()}
                        </Box>
                      </Box>
                    )}
                  </Paper>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        ))
      )}
    </Box>
  );
}
