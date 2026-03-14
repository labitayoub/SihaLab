import { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Accordion, AccordionSummary, AccordionDetails,
  Chip, Button, CircularProgress, Alert, Grid, Divider, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, List, ListItem, ListItemText, ListItemIcon,
} from '@mui/material';
import {
  ExpandMore, Person, Science, CalendarToday, Visibility, Description, Search,
  UploadFile, AttachFile, Close, PictureAsPdf, Image,
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

  // File upload dialog
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedAnalyse, setSelectedAnalyse] = useState<Analyse | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

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

  const handleOpenUploadDialog = (analyse: Analyse) => {
    setSelectedAnalyse(analyse);
    setUploadDialogOpen(true);
  };

  const handleCloseUploadDialog = () => {
    setUploadDialogOpen(false);
    setSelectedAnalyse(null);
    setSelectedFiles([]);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      const validFiles = files.filter(file => validTypes.includes(file.type));
      
      if (validFiles.length !== files.length) {
        toast.error('Seuls les fichiers PDF et images (JPG, PNG, GIF) sont acceptés');
      }
      
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadFiles = async () => {
    if (!selectedAnalyse || selectedFiles.length === 0) {
      toast.error('Veuillez sélectionner au moins un fichier');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      await api.post(`/analyses/${selectedAnalyse.id}/upload-files`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success(`${selectedFiles.length} fichier(s) uploadé(s) avec succès`);
      handleCloseUploadDialog();
      loadDossiers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'upload des fichiers');
    } finally {
      setUploading(false);
    }
  };

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
                              Résultats de Laboratoire
                            </Button>
                          )}

                          {/* Upload files button */}
                          <Button
                            variant="outlined"
                            size="small"
                            color="secondary"
                            startIcon={<UploadFile />}
                            onClick={() => handleOpenUploadDialog(analyse)}
                            fullWidth
                          >
                            Fichiers ({analyse.uploadedFiles?.length || 0})
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>

                    <Divider sx={{ my: 1.5 }} />

                    {/* Uploaded Files Section */}
                    {analyse.uploadedFiles && analyse.uploadedFiles.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                          <AttachFile sx={{ fontSize: 16 }} />
                          Fichiers joints ({analyse.uploadedFiles.length})
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {analyse.uploadedFiles.map((fileUrl, index) => {
                            const isPdf = fileUrl.toLowerCase().endsWith('.pdf');
                            const fileName = fileUrl.split('/').pop() || `Fichier ${index + 1}`;
                            
                            return (
                              <Chip
                                key={index}
                                icon={isPdf ? <PictureAsPdf /> : <Image />}
                                label={`Fichier ${index + 1}`}
                                onClick={() => window.open(fileUrl, '_blank')}
                                color={isPdf ? 'error' : 'primary'}
                                variant="outlined"
                                sx={{ cursor: 'pointer' }}
                              />
                            );
                          })}
                        </Box>
                      </Box>
                    )}

                    {/* Laboratory assignment info */}
                    {analyse.laboratoire && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold">
                          Laboratoire:
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {analyse.laboratoire.firstName} {analyse.laboratoire.lastName}
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        ))
      )}

      {/* File Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={handleCloseUploadDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold">
            Upload de Fichiers
          </Typography>
          <IconButton onClick={handleCloseUploadDialog}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedAnalyse && (
            <>
              <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">Patient</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {selectedAnalyse.consultation?.patient?.firstName} {selectedAnalyse.consultation?.patient?.lastName}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Analyse
                </Typography>
                <Typography variant="body2">{selectedAnalyse.description}</Typography>
              </Paper>

              <Button
                variant="outlined"
                component="label"
                fullWidth
                startIcon={<AttachFile />}
                sx={{ mb: 2 }}
              >
                Sélectionner des fichiers (PDF ou Images)
                <input
                  type="file"
                  hidden
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.gif"
                  onChange={handleFileSelect}
                />
              </Button>

              {selectedFiles.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                    Fichiers sélectionnés ({selectedFiles.length})
                  </Typography>
                  <List dense>
                    {selectedFiles.map((file, index) => (
                      <ListItem
                        key={index}
                        secondaryAction={
                          <IconButton edge="end" size="small" onClick={() => handleRemoveFile(index)}>
                            <Close fontSize="small" />
                          </IconButton>
                        }
                      >
                        <ListItemIcon>
                          {file.type === 'application/pdf' ? (
                            <PictureAsPdf color="error" />
                          ) : (
                            <Image color="primary" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={file.name}
                          secondary={`${(file.size / 1024).toFixed(2)} KB`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}

              {selectedAnalyse.uploadedFiles && selectedAnalyse.uploadedFiles.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#e8f5e9' }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                    Fichiers déjà uploadés ({selectedAnalyse.uploadedFiles.length})
                  </Typography>
                  <List dense>
                    {selectedAnalyse.uploadedFiles.map((fileUrl, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          {fileUrl.endsWith('.pdf') ? (
                            <PictureAsPdf color="error" />
                          ) : (
                            <Image color="primary" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={`Fichier ${index + 1}`}
                          secondary={
                            <Button
                              size="small"
                              href={fileUrl}
                              target="_blank"
                              startIcon={<Visibility />}
                            >
                              Voir
                            </Button>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadDialog}>Fermer</Button>
          <Button
            variant="contained"
            onClick={handleUploadFiles}
            disabled={uploading || selectedFiles.length === 0}
            startIcon={uploading ? <CircularProgress size={20} /> : <UploadFile />}
          >
            {uploading ? 'Upload en cours...' : `Upload ${selectedFiles.length} fichier(s)`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
