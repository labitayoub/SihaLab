import { useEffect, useState } from 'react';
import { 
  Box, Button, Card, Typography, Dialog, DialogTitle, DialogContent, 
  DialogActions, TextField, IconButton, MenuItem, List, ListItem, 
  ListItemText, ListItemIcon, CircularProgress, Alert, Autocomplete
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Upload, Close, AttachFile, PictureAsPdf, Image, Description } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/user.types';
import api from '../../config/api';
import { toast } from '../../utils/toast';
import { ToastMessages } from '../../utils/toastMessages';

export default function Documents() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Upload form states
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; name: string }[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [selectedConsultation, setSelectedConsultation] = useState<any>(null);

  useEffect(() => {
    loadDocuments();
    if (user?.role === UserRole.MEDECIN || user?.role === UserRole.INFIRMIER) {
      loadMyPatients();
    }
  }, []);

  const loadDocuments = async () => {
    try {
      const { data } = await api.get('/documents');
      setDocuments(data);
    } catch (error) {
      toast.error(ToastMessages.documents.loadError);
    }
  };

  const loadMyPatients = async () => {
    try {
      const { data } = await api.get('/consultations/my-patients');
      setPatients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  const loadPatientConsultations = async (patientId: string) => {
    try {
      const { data } = await api.get('/consultations', {
        params: { patientId }
      });
      // Filter only completed consultations
      const completedConsultations = data.filter((c: any) => c.status === 'terminee');
      setConsultations(completedConsultations);
    } catch (error) {
      console.error('Error loading consultations:', error);
      setConsultations([]);
    }
  };

  const handleOpenUploadDialog = () => {
    setUploadDialogOpen(true);
    setSelectedFiles([]);
    setSelectedPatient(null);
    setSelectedConsultation(null);
    setConsultations([]);
  };

  const handleCloseUploadDialog = () => {
    if (!uploading) {
      setUploadDialogOpen(false);
      setSelectedFiles([]);
      setSelectedPatient(null);
      setSelectedConsultation(null);
      setConsultations([]);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      const newFiles = files.map(file => ({ 
        file, 
        name: file.name.replace(/\.[^/.]+$/, '') 
      }));
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileNameChange = (index: number, newName: string) => {
    setSelectedFiles(prev => prev.map((item, i) => 
      i === index ? { ...item, name: newName } : item
    ));
  };

  const handlePatientChange = (patient: any) => {
    setSelectedPatient(patient);
    setSelectedConsultation(null);
    if (patient) {
      loadPatientConsultations(patient.id);
    } else {
      setConsultations([]);
    }
  };

  const handleUploadFiles = async () => {
    // Validation
    if (selectedFiles.length === 0) {
      toast.error('Veuillez sélectionner au moins un fichier');
      return;
    }

    if (selectedFiles.some(item => !item.name.trim())) {
      toast.error('Tous les fichiers doivent avoir un nom');
      return;
    }

    if (!selectedConsultation) {
      toast.error('Veuillez sélectionner une consultation');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach(item => {
        formData.append('files', item.file);
      });
      formData.append('fileNames', JSON.stringify(selectedFiles.map(item => item.name.trim())));

      await api.post(`/consultations/${selectedConsultation.id}/upload-files`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success(`${selectedFiles.length} fichier(s) uploadé(s) avec succès`);
      handleCloseUploadDialog();
      loadDocuments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'upload des fichiers');
    } finally {
      setUploading(false);
    }
  };

  const columns: GridColDef[] = [
    { field: 'fileName', headerName: 'Fichier', flex: 1.5, minWidth: 160 },
    { field: 'type', headerName: 'Type', width: 130 },
    { 
      field: 'patient', 
      headerName: 'Patient', 
      flex: 1,
      minWidth: 130,
      valueGetter: (_value: any, row: any) => `${row.patient?.firstName} ${row.patient?.lastName}`,
    },
    { field: 'createdAt', headerName: 'Date', width: 155, valueFormatter: (params) => new Date(params).toLocaleString('fr-FR') },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (params) => (
        <Button size="small" href={params.row.fileUrl} target="_blank">
          Télécharger
        </Button>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Documents</Typography>
        {(user?.role === UserRole.MEDECIN || user?.role === UserRole.INFIRMIER) && (
          <Button 
            variant="contained" 
            startIcon={<Upload />}
            onClick={handleOpenUploadDialog}
          >
            Upload Document
          </Button>
        )}
      </Box>

      <Card>
        <DataGrid rows={documents} columns={columns} autoHeight pageSizeOptions={[10, 20]} />
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={handleCloseUploadDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold">
            Upload de Documents
          </Typography>
          <IconButton onClick={handleCloseUploadDialog} disabled={uploading}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            Sélectionnez un patient et une consultation terminée, puis uploadez vos fichiers avec un nom obligatoire.
          </Alert>

          {/* Patient Selection */}
          <Autocomplete
            options={patients}
            getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
            value={selectedPatient}
            onChange={(_, newValue) => handlePatientChange(newValue)}
            disabled={uploading}
            renderInput={(params) => (
              <TextField 
                {...params} 
                label="Patient *" 
                placeholder="Sélectionnez un patient"
                sx={{ mb: 2 }}
              />
            )}
          />

          {/* Consultation Selection */}
          {selectedPatient && (
            <TextField
              select
              fullWidth
              label="Consultation *"
              value={selectedConsultation?.id || ''}
              onChange={(e) => {
                const consultation = consultations.find(c => c.id === e.target.value);
                setSelectedConsultation(consultation);
              }}
              disabled={uploading || consultations.length === 0}
              helperText={
                consultations.length === 0 
                  ? "Aucune consultation terminée pour ce patient" 
                  : `${consultations.length} consultation(s) disponible(s)`
              }
              sx={{ mb: 3 }}
            >
              {consultations.map((consultation) => (
                <MenuItem key={consultation.id} value={consultation.id}>
                  {new Date(consultation.date).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })} - {consultation.motif || 'Consultation'}
                </MenuItem>
              ))}
            </TextField>
          )}

          {/* File Selection */}
          <Button
            variant="outlined"
            component="label"
            fullWidth
            startIcon={<AttachFile />}
            disabled={uploading || !selectedConsultation}
            sx={{ mb: 2 }}
          >
            Sélectionner des fichiers
            <input
              type="file"
              hidden
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
              onChange={handleFileSelect}
            />
          </Button>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
                Fichiers sélectionnés ({selectedFiles.length})
              </Typography>
              <List dense>
                {selectedFiles.map((item, index) => (
                  <ListItem
                    key={index}
                    sx={{ 
                      bgcolor: '#f5f5f5', 
                      borderRadius: 1, 
                      mb: 1,
                      flexDirection: 'column',
                      alignItems: 'stretch',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 1 }}>
                      <ListItemIcon>
                        {item.file.type === 'application/pdf' ? (
                          <PictureAsPdf color="error" />
                        ) : item.file.type.startsWith('image/') ? (
                          <Image color="primary" />
                        ) : (
                          <Description color="action" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.file.name}
                        secondary={`${(item.file.size / 1024).toFixed(2)} KB`}
                      />
                      <IconButton 
                        edge="end" 
                        size="small" 
                        onClick={() => handleRemoveFile(index)}
                        disabled={uploading}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    </Box>
                    <TextField
                      fullWidth
                      size="small"
                      label="Nom du document *"
                      value={item.name}
                      onChange={(e) => handleFileNameChange(index, e.target.value)}
                      disabled={uploading}
                      required
                      placeholder="Ex: Radiographie thorax, Résultats sanguins..."
                    />
                  </ListItem>
                ))}
              </List>
            </Card>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadDialog} disabled={uploading}>
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={handleUploadFiles}
            disabled={uploading || selectedFiles.length === 0 || !selectedConsultation}
            startIcon={uploading ? <CircularProgress size={20} /> : <Upload />}
          >
            {uploading ? 'Upload en cours...' : `Upload ${selectedFiles.length} fichier(s)`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

