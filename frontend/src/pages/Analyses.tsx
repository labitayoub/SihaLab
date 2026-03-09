import { useEffect, useState, useMemo } from 'react';
import { Box, Button, Card, Typography, Dialog, DialogTitle, DialogContent, TextField, Chip, MenuItem, IconButton, Divider, Alert, Autocomplete } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Add, Upload, Close, Biotech, CheckCircle } from '@mui/icons-material';
import { Country, City } from 'country-state-city';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user.types';
import { Analyse, AnalyseStatus } from '../types/analyse.types';
import api from '../config/api';
import { toast } from '../utils/toast';

export default function Analyses() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<Analyse[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedAnalyse, setSelectedAnalyse] = useState<string>('');
  const [formData, setFormData] = useState({
    consultationId: '',
    labId: '',
    description: '',
  });
  const [resultat, setResultat] = useState('');

  // Laboratoire selector state
  const [allLaboratoires, setAllLaboratoires] = useState<any[]>([]);
  const [countryIsoCode, setCountryIsoCode] = useState('');
  const [selectedCountryName, setSelectedCountryName] = useState('');
  const [selectedVille, setSelectedVille] = useState('');

  // country-state-city data
  const allCountries = useMemo(() => Country.getAllCountries(), []);
  const citiesForCountry = useMemo(
    () => countryIsoCode ? (City.getCitiesOfCountry(countryIsoCode) ?? []) : [],
    [countryIsoCode]
  );

  // Laboratoires inscrits sur la plateforme correspondant au pays + ville
  const filteredLaboratoires = useMemo(() =>
    allLaboratoires.filter((l) =>
      (!selectedCountryName || l.pays === selectedCountryName) &&
      (!selectedVille || l.ville === selectedVille)
    ),
  [allLaboratoires, selectedCountryName, selectedVille]);

  useEffect(() => {
    loadAnalyses();
    if (user?.role === UserRole.MEDECIN) {
      loadConsultations();
    }
  }, []);

  // Load ALL laboratoires once when dialog opens
  useEffect(() => {
    if (user?.role === UserRole.MEDECIN && open) {
      api.get('/users/laboratoires')
        .then(({ data }) => setAllLaboratoires(data))
        .catch((e) => console.error('Erreur chargement laboratoires', e));
    }
  }, [open]);

  const loadAnalyses = async () => {
    try {
      const endpoint = user?.role === UserRole.PATIENT ? '/analyses/patient/me' : '/analyses';
      const { data } = await api.get(endpoint);
      setAnalyses(data);
    } catch (error) {
      toast.error('Erreur de chargement');
    }
  };

  const loadConsultations = async () => {
    try {
      const { data } = await api.get('/consultations');
      setConsultations(data);
    } catch (error) {
      console.error(error);
    }
 };

  const handleCreate = async () => {
    try {
      const payload: any = {
        consultationId: formData.consultationId,
        description: formData.description,
      };
      if (formData.labId) payload.labId = formData.labId;
      const { data: newAnalyse } = await api.post('/analyses', payload);
      // Génération automatique du PDF dédié à cette analyse
      try {
        await api.post(`/consultations/${newAnalyse.consultationId}/generate-analyse-pdf/${newAnalyse.id}`);
        toast.success('Analyse demandée et PDF généré automatiquement');
      } catch {
        toast.success('Analyse demandée (PDF sera généré depuis la consultation)');
      }
      setOpen(false);
      loadAnalyses();
      setFormData({ consultationId: '', labId: '', description: '' });
      setCountryIsoCode('');
      setSelectedCountryName('');
      setSelectedVille('');
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };

  const handleUploadResultat = async () => {
    try {
      await api.post(`/analyses/${selectedAnalyse}/upload-resultat`, {
        resultat,
        fileUrl: '/uploads/resultat.pdf',
      });
      toast.success('Résultat uploadé');
      setUploadOpen(false);
      loadAnalyses();
      setResultat('');
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const columns: GridColDef[] = [
    { field: 'createdAt', headerName: 'Date', width: 155, valueFormatter: (params) => new Date(params).toLocaleString('fr-FR') },
    { 
      field: 'patient', 
      headerName: 'Patient', 
      flex: 1,
      minWidth: 130,
      valueGetter: (_value: any, row: any) => `${row.consultation?.patient?.firstName} ${row.consultation?.patient?.lastName}`,
    },
    { field: 'description', headerName: 'Description', flex: 2, minWidth: 170 },
    {
      field: 'laboratoire',
      headerName: 'Laboratoire',
      flex: 1,
      minWidth: 130,
      valueGetter: (_value: any, row: any) =>
        row.laboratoire ? `${row.laboratoire.firstName} ${row.laboratoire.lastName}` : '—',
    },
    {
      field: 'status',
      headerName: 'Statut',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={
            params.value === AnalyseStatus.TERMINEE ? 'success' :
            params.value === AnalyseStatus.EN_COURS ? 'warning' : 'default'
          }
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 170,
      renderCell: (params) => (
        user?.role === UserRole.LABORATOIRE && params.row.status !== AnalyseStatus.TERMINEE && (
          <Button 
            size="small" 
            startIcon={<Upload />}
            onClick={() => { setSelectedAnalyse(params.row.id); setUploadOpen(true); }}
          >
            Upload Résultat
          </Button>
        )
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Analyses</Typography>
        {user?.role === UserRole.MEDECIN && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
            Nouvelle Analyse
          </Button>
        )}
      </Box>

      <Card>
        <DataGrid rows={analyses} columns={columns} autoHeight pageSizeOptions={[10, 20]} />
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Nouvelle Demande d'Analyse
          <IconButton onClick={() => setOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Consultation"
            value={formData.consultationId}
            onChange={(e) => setFormData({ ...formData, consultationId: e.target.value })}
            margin="normal"
          >
            {consultations.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.patient?.firstName} {c.patient?.lastName} - {new Date(c.date).toLocaleDateString()}
              </MenuItem>
            ))}
          </TextField>

          {/* ── Laboratoire selection ── */}
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Biotech color="secondary" />
            <Typography variant="subtitle1" fontWeight={600}>Laboratoire (optionnel)</Typography>
          </Box>

          {/* Étape 1 — Pays (liste complète country-state-city) */}
          <Autocomplete
            options={allCountries}
            getOptionLabel={(opt) => `${opt.flag ?? ''} ${opt.name}`}
            isOptionEqualToValue={(opt, val) => opt.isoCode === val.isoCode}
            value={allCountries.find((c) => c.isoCode === countryIsoCode) ?? null}
            onChange={(_, country) => {
              if (country) { setCountryIsoCode(country.isoCode); setSelectedCountryName(country.name); }
              else { setCountryIsoCode(''); setSelectedCountryName(''); }
              setSelectedVille('');
              setFormData((f) => ({ ...f, labId: '' }));
            }}
            renderInput={(params) => (
              <TextField {...params} label="1. Pays" size="small" margin="dense" />
            )}
            sx={{ mb: 0.5 }}
          />

          {/* Étape 2 — Ville (villes du pays sélectionné) */}
          {countryIsoCode && (
            <TextField
              select
              fullWidth
              size="small"
              label="2. Ville"
              value={selectedVille}
              onChange={(e) => { setSelectedVille(e.target.value); setFormData((f) => ({ ...f, labId: '' })); }}
              margin="dense"
            >
              <MenuItem value=""><em>— Toutes les villes —</em></MenuItem>
              {citiesForCountry.map((c) => (
                <MenuItem key={`${c.name}-${(c as any).stateCode ?? ''}`} value={c.name}>{c.name}</MenuItem>
              ))}
            </TextField>
          )}

          {/* Étape 3 — Laboratoires inscrits sur la plateforme */}
          {selectedCountryName && (
            <Box sx={{ mt: 1.5 }}>
              {filteredLaboratoires.length === 0 ? (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Aucun laboratoire inscrit pour {[selectedVille, selectedCountryName].filter(Boolean).join(', ')}
                </Alert>
              ) : (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    {filteredLaboratoires.length} laboratoire(s) inscrit(s) sur la plateforme
                  </Typography>
                  {filteredLaboratoires.map((l) => (
                    <Box
                      key={l.id}
                      onClick={() => setFormData((f) => ({ ...f, labId: f.labId === l.id ? '' : l.id }))}
                      sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        p: 1.5, mb: 1, borderRadius: 2, cursor: 'pointer', border: '2px solid',
                        borderColor: formData.labId === l.id ? 'secondary.main' : 'divider',
                        bgcolor: formData.labId === l.id ? 'secondary.50' : 'background.paper',
                        '&:hover': { borderColor: 'secondary.light', bgcolor: 'action.hover' },
                        transition: 'all .15s',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Biotech color={formData.labId === l.id ? 'secondary' : 'disabled'} />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{l.firstName} {l.lastName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {[l.ville, l.pays].filter(Boolean).join(', ')}
                            {l.phone ? ` · ${l.phone}` : ''}
                          </Typography>
                        </Box>
                      </Box>
                      {formData.labId === l.id && <CheckCircle color="secondary" fontSize="small" />}
                    </Box>
                  ))}
                </>
              )}
            </Box>
          )}

          {formData.labId && (
            <Button
              size="small" color="inherit"
              sx={{ mt: 0.5, mb: 1, color: 'text.secondary', textTransform: 'none' }}
              onClick={() => setFormData((f) => ({ ...f, labId: '' }))}
            >
              ✕ Retirer la sélection du laboratoire
            </Button>
          )}
          <Divider sx={{ my: 2 }} />

          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
            multiline
            rows={4}
          />
          <Button fullWidth variant="contained" onClick={handleCreate} sx={{ mt: 2 }}>
            Créer
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Upload Résultat
          <IconButton onClick={() => setUploadOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Résultat"
            value={resultat}
            onChange={(e) => setResultat(e.target.value)}
            margin="normal"
            multiline
            rows={6}
          />
          <Button fullWidth variant="contained" onClick={handleUploadResultat} sx={{ mt: 2 }}>
            Enregistrer
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
