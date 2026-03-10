import { useEffect, useState, useMemo } from 'react';
import { Box, Button, Card, Typography, Dialog, DialogTitle, DialogContent, TextField, Chip, IconButton, MenuItem, Divider, Alert, Autocomplete, Paper } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Add, Delete, Close, LocalPharmacy, CheckCircle, Visibility, Print } from '@mui/icons-material';
import { Country, City } from 'country-state-city';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user.types';
import { Ordonnance, OrdonnanceStatus } from '../types/ordonnance.types';
import api from '../config/api';
import { toast } from '../utils/toast';

export default function Ordonnances() {
  const { user } = useAuth();
  const [ordonnances, setOrdonnances] = useState<Ordonnance[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    consultationId: '',
    pharmacienId: '',
    medicaments: [{ nom: '', dosage: '', frequence: '', duree: '' }],
  });

  // Pharmacie selector state
  const [allPharmaciens, setAllPharmaciens] = useState<any[]>([]);
  const [countryIsoCode, setCountryIsoCode] = useState('');
  const [selectedCountryName, setSelectedCountryName] = useState('');
  const [selectedVille, setSelectedVille] = useState('');

  // country-state-city data
  const allCountries = useMemo(() => Country.getAllCountries(), []);
  const citiesForCountry = useMemo(
    () => countryIsoCode ? (City.getCitiesOfCountry(countryIsoCode) ?? []) : [],
    [countryIsoCode]
  );

  // Pharmaciens inscrits sur la plateforme correspondant au pays + ville
  const filteredPharmaciens = useMemo(() =>
    allPharmaciens.filter((p) =>
      (!selectedCountryName || p.pays === selectedCountryName) &&
      (!selectedVille || p.ville === selectedVille)
    ),
  [allPharmaciens, selectedCountryName, selectedVille]);

  useEffect(() => {
    loadOrdonnances();
    if (user?.role === UserRole.MEDECIN) {
      loadConsultations();
    }
  }, []);

  // Load ALL pharmaciens once when dialog opens
  useEffect(() => {
    if (user?.role === UserRole.MEDECIN && open) {
      api.get('/users/pharmaciens')
        .then(({ data }) => setAllPharmaciens(data))
        .catch((e) => console.error('Erreur chargement pharmaciens', e));
    }
  }, [open]);

  const loadOrdonnances = async () => {
    try {
      const endpoint = user?.role === UserRole.PATIENT ? '/ordonnances/patient/me' : '/ordonnances';
      const { data } = await api.get(endpoint);
      setOrdonnances(data);
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
        medicaments: formData.medicaments,
      };
      if (formData.pharmacienId) payload.pharmacienId = formData.pharmacienId;
      const { data: newOrd } = await api.post('/ordonnances', payload);
      // Génération automatique du PDF dédié à cette ordonnance
      try {
        await api.post(`/consultations/${newOrd.consultationId}/generate-ordonnance-pdf/${newOrd.id}`);
        toast.success('Ordonnance créée et PDF généré automatiquement');
      } catch {
        toast.success('Ordonnance créée (PDF sera généré depuis la consultation)');
      }
      setOpen(false);
      loadOrdonnances();
      setFormData({ consultationId: '', pharmacienId: '', medicaments: [{ nom: '', dosage: '', frequence: '', duree: '' }] });
      setCountryIsoCode('');
      setSelectedCountryName('');
      setSelectedVille('');
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };

    const handleDelivrer = async (id: string) => {
    try {
      await api.post(`/ordonnances/${id}/delivrer`);
      toast.success('Ordonnance délivrée');
      loadOrdonnances();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const addMedicament = () => {
    setFormData({
      ...formData,
      medicaments: [...formData.medicaments, { nom: '', dosage: '', frequence: '', duree: '' }],
    });
  };

  const removeMedicament = (index: number) => {
    const newMeds = formData.medicaments.filter((_, i) => i !== index);
    setFormData({ ...formData, medicaments: newMeds });
  };

  const updateMedicament = (index: number, field: string, value: string) => {
    const newMeds = [...formData.medicaments];
    newMeds[index] = { ...newMeds[index], [field]: value };
    setFormData({ ...formData, medicaments: newMeds });
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
    { 
      field: 'doctor', 
      headerName: 'Médecin', 
      flex: 1,
      minWidth: 130,
      valueGetter: (_value: any, row: any) => `Dr. ${row.consultation?.doctor?.firstName} ${row.consultation?.doctor?.lastName}`,
    },
    { 
      field: 'medicaments', 
      headerName: 'Médicaments', 
      flex: 1.5,
      minWidth: 160,
      valueGetter: (_value: any, row: any) => row.medicaments?.map((m: any) => m.nom).join(', '),
    },
    {
      field: 'pharmacien',
      headerName: 'Pharmacie',
      flex: 1,
      minWidth: 130,
      valueGetter: (_value: any, row: any) =>
        row.pharmacien ? `${row.pharmacien.firstName} ${row.pharmacien.lastName}` : '—',
    },
    {
      field: 'status',
      headerName: 'Statut',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={params.value === OrdonnanceStatus.DELIVREE ? 'success' : 'warning'}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {params.row.pdfUrl && (
            <>
              <IconButton size="small" color="primary" href={params.row.pdfUrl} target="_blank" title="Voir PDF">
                <Visibility fontSize="small" />
              </IconButton>
              <IconButton size="small" color="secondary" onClick={() => window.print()} title="Imprimer">
                <Print fontSize="small" />
              </IconButton>
            </>
          )}
          {user?.role === UserRole.PHARMACIEN && params.row.status === OrdonnanceStatus.EN_ATTENTE && (
            <Button size="small" onClick={() => handleDelivrer(params.row.id)}>Délivrer</Button>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Ordonnances</Typography>
        {user?.role === UserRole.MEDECIN && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
            Nouvelle Ordonnance
          </Button>
        )}
      </Box>

      {/* Affichage pour pharmacien: ordonnances assignées */}
      {user?.role === UserRole.PHARMACIEN && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight="bold">Ordonnances qui vous sont assignées</Typography>
          <Typography variant="caption">Vous pouvez voir et imprimer les ordonnances qui vous ont été attribuées par les médecins.</Typography>
        </Alert>
      )}

      <Card>
        <DataGrid rows={ordonnances} columns={columns} autoHeight pageSizeOptions={[10, 20, 50]} />
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Nouvelle Ordonnance
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

          {/* ── Pharmacie selection ── */}
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <LocalPharmacy color="primary" />
            <Typography variant="subtitle1" fontWeight={600}>Pharmacie (optionnel)</Typography>
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
              setFormData((f) => ({ ...f, pharmacienId: '' }));
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
              onChange={(e) => { setSelectedVille(e.target.value); setFormData((f) => ({ ...f, pharmacienId: '' })); }}
              margin="dense"
            >
              <MenuItem value=""><em>— Toutes les villes —</em></MenuItem>
              {citiesForCountry.map((c) => (
                <MenuItem key={`${c.name}-${(c as any).stateCode ?? ''}`} value={c.name}>{c.name}</MenuItem>
              ))}
            </TextField>
          )}

          {/* Étape 3 — Pharmaciens inscrits sur la plateforme */}
          {selectedCountryName && (
            <Box sx={{ mt: 1.5 }}>
              {filteredPharmaciens.length === 0 ? (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Aucune pharmacie inscrite pour {[selectedVille, selectedCountryName].filter(Boolean).join(', ')}
                </Alert>
              ) : (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    {filteredPharmaciens.length} pharmacie(s) inscrite(s) sur la plateforme
                  </Typography>
                  {filteredPharmaciens.map((p) => (
                    <Box
                      key={p.id}
                      onClick={() => setFormData((f) => ({ ...f, pharmacienId: f.pharmacienId === p.id ? '' : p.id }))}
                      sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        p: 1.5, mb: 1, borderRadius: 2, cursor: 'pointer', border: '2px solid',
                        borderColor: formData.pharmacienId === p.id ? 'primary.main' : 'divider',
                        bgcolor: formData.pharmacienId === p.id ? 'primary.50' : 'background.paper',
                        '&:hover': { borderColor: 'primary.light', bgcolor: 'action.hover' },
                        transition: 'all .15s',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <LocalPharmacy color={formData.pharmacienId === p.id ? 'primary' : 'disabled'} />
                        <Box>
                          <Typography variant="body2" fontWeight={700}>
                            {p.firstName} {p.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            📍 {[p.address, p.ville, p.pays].filter(Boolean).join(', ') || 'Adresse non renseignée'}
                          </Typography>
                          {p.phone && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              📞 {p.phone}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      {formData.pharmacienId === p.id && <CheckCircle color="primary" fontSize="small" />}
                    </Box>
                  ))}
                </>
              )}
            </Box>
          )}

          {formData.pharmacienId && (
            <Button
              size="small" color="inherit"
              sx={{ mt: 0.5, mb: 1, color: 'text.secondary', textTransform: 'none' }}
              onClick={() => setFormData((f) => ({ ...f, pharmacienId: '' }))}
            >
              ✕ Retirer la sélection de pharmacie
            </Button>
          )}
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>Médicaments</Typography>
          {formData.medicaments.map((med, index) => (
            <Card key={index} sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">Médicament {index + 1}</Typography>
                {formData.medicaments.length > 1 && (
                  <IconButton size="small" onClick={() => removeMedicament(index)}>
                    <Delete />
                  </IconButton>
                )}
              </Box>
              <TextField
                fullWidth
                label="Nom"
                value={med.nom}
                onChange={(e) => updateMedicament(index, 'nom', e.target.value)}
                margin="dense"
              />
              <TextField
                fullWidth
                label="Dosage"
                value={med.dosage}
                onChange={(e) => updateMedicament(index, 'dosage', e.target.value)}
                margin="dense"
              />
              <TextField
                fullWidth
                label="Fréquence"
                value={med.frequence}
                onChange={(e) => updateMedicament(index, 'frequence', e.target.value)}
                margin="dense"
              />
              <TextField
                fullWidth
                label="Durée"
                value={med.duree}
                onChange={(e) => updateMedicament(index, 'duree', e.target.value)}
                margin="dense"
              />
            </Card>
          ))}
          <Button onClick={addMedicament} sx={{ mb: 2 }}>+ Ajouter médicament</Button>
          <Button fullWidth variant="contained" onClick={handleCreate}>
            Créer Ordonnance
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
