import { useEffect, useState, useMemo } from 'react';
import {
  Box, Button, Card, Typography, Dialog, DialogTitle, DialogContent,
  TextField, Chip, Grid, InputAdornment, IconButton, MenuItem, Autocomplete,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Add, Visibility, VisibilityOff, Email, Badge, Phone, LocationOn,
  Lock, LocalHospital, LocalPharmacy, Science, Person, Close,
} from '@mui/icons-material';
import { Country, City } from 'country-state-city';
import { isValidPhoneNumber, AsYouType } from 'libphonenumber-js';
import { User, UserRole } from '../types/user.types';
import api from '../config/api';
import { toast } from '../utils/toast';

const ROLE_LABELS: Record<string, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.MEDECIN]: 'Médecin',
  [UserRole.PATIENT]: 'Patient',
  [UserRole.PHARMACIEN]: 'Pharmacien',
  [UserRole.LABORATOIRE]: 'Laboratoire',
  [UserRole.INFIRMIER]: 'Infirmier',
};

const initialFormData = {
  email: '', password: '', role: UserRole.PATIENT,
  firstName: '', lastName: '', phone: '', address: '',
  specialite: '', numeroOrdre: '', ville: '', pays: '',
};

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [showPassword, setShowPassword] = useState(false);
  const [countryIso, setCountryIso] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const allCountries = useMemo(() => Country.getAllCountries(), []);
  const cities = useMemo(
    () => countryIso ? (City.getCitiesOfCountry(countryIso) ?? []) : [],
    [countryIso]
  );
  const selectedCountry = useMemo(
    () => allCountries.find(c => c.isoCode === countryIso) ?? null,
    [allCountries, countryIso]
  );

  const isMedecin = formData.role === UserRole.MEDECIN;
  const isPharmacienOrLabo = [UserRole.PHARMACIEN, UserRole.LABORATOIRE].includes(formData.role as UserRole);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data.data || []);
    } catch {
      toast.error('Erreur de chargement');
    }
  };

  const handleRoleChange = (role: UserRole) => {
    setCountryIso('');
    setPhoneError('');
    setFormData({ ...initialFormData, role });
  };

  const handlePhoneChange = (value: string) => {
    const formatted = countryIso ? new AsYouType(countryIso as any).input(value) : value;
    setFormData(p => ({ ...p, phone: formatted }));
    if (!formatted) { setPhoneError(''); return; }
    if (countryIso) {
      setPhoneError(isValidPhoneNumber(formatted, countryIso as any) ? '' : `Numéro invalide pour ${selectedCountry?.name ?? 'ce pays'}`);
    }
  };

  const handleCountryChange = (isoCode: string, name: string) => {
    setCountryIso(isoCode);
    setFormData(p => ({ ...p, pays: name, ville: '', phone: '' }));
    setPhoneError('');
  };

  const handleClose = () => {
    setOpen(false);
    setFormData(initialFormData);
    setCountryIso('');
    setPhoneError('');
    setShowPassword(false);
  };

  const handleCreate = async () => {
    if (phoneError) return;
    try {
      const payload: any = { ...formData };
      if (!isMedecin) delete payload.numeroOrdre;
      if (!isMedecin && !isPharmacienOrLabo) delete payload.specialite;
      await api.post('/users', payload);
      toast.success('Utilisateur créé avec succès');
      handleClose();
      loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la création');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await api.patch(`/users/${id}`, { isActive: !isActive });
      toast.success('Statut mis à jour');
      loadUsers();
    } catch {
      toast.error('Erreur');
    }
  };

  const columns: GridColDef[] = [
    { field: 'firstName', headerName: 'Prénom', flex: 1, minWidth: 100 },
    { field: 'lastName', headerName: 'Nom', flex: 1, minWidth: 100 },
    { field: 'email', headerName: 'Email', flex: 1.5, minWidth: 160 },
    {
      field: 'role', headerName: 'Rôle', width: 130,
      renderCell: (params) => <Chip label={ROLE_LABELS[params.value] || params.value} size="small" variant="outlined" />,
    },
    {
      field: 'specialite', headerName: 'Spécialité / Établissement', flex: 1, minWidth: 120,
      renderCell: (params) => params.value || '—',
    },
    {
      field: 'isActive', headerName: 'Statut', width: 90,
      renderCell: (params) => <Chip label={params.value ? 'Actif' : 'Inactif'} color={params.value ? 'success' : 'error'} size="small" />,
    },
    {
      field: 'actions', headerName: 'Actions', width: 110,
      renderCell: (params) => (
        <Button size="small" onClick={() => handleToggleActive(params.row.id, params.row.isActive)}>
          {params.row.isActive ? 'Désactiver' : 'Activer'}
        </Button>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Utilisateurs</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
          Nouvel Utilisateur
        </Button>
      </Box>

      <Card sx={{ overflow: 'hidden' }}>
        <DataGrid
          rows={users}
          columns={columns}
          autoHeight
          pageSizeOptions={[10, 20]}
          disableColumnResize
          sx={{ '& .MuiDataGrid-scrollbar--horizontal': { display: 'none' } }}
        />
      </Card>

      {/* ── DIALOG CRÉATION ── */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 4, p: 1 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.3rem', pb: 1 }}>
          Créer un compte utilisateur
          <IconButton onClick={handleClose}><Close /></IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          {/* Sélecteur rôle */}
          <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
            {[
              { role: UserRole.PATIENT,     label: 'Patient',     icon: <Person /> },
              { role: UserRole.MEDECIN,     label: 'Médecin',     icon: <LocalHospital /> },
              { role: UserRole.PHARMACIEN,  label: 'Pharmacien',  icon: <LocalPharmacy /> },
              { role: UserRole.LABORATOIRE, label: 'Laboratoire', icon: <Science /> },
            ].map(({ role, label, icon }) => (
              <Button key={role}
                variant={formData.role === role ? 'contained' : 'outlined'}
                onClick={() => handleRoleChange(role)}
                startIcon={icon}
                sx={{ borderRadius: 3, px: 2.5, py: 1, textTransform: 'none', fontWeight: 700,
                  borderWidth: formData.role === role ? 0 : 2,
                  '&:hover': { borderWidth: formData.role === role ? 0 : 2 } }}
              >{label}</Button>
            ))}
          </Box>

          <Grid container spacing={2}>
            {/* Prénom + Nom */}
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Prénom" required variant="outlined" value={formData.firstName}
                onChange={e => setFormData(p => ({ ...p, firstName: e.target.value }))}
                InputProps={{ startAdornment: <InputAdornment position="start"><Badge color="action" /></InputAdornment> }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Nom" required variant="outlined" value={formData.lastName}
                onChange={e => setFormData(p => ({ ...p, lastName: e.target.value }))}
                InputProps={{ startAdornment: <InputAdornment position="start"><Badge color="action" /></InputAdornment> }} />
            </Grid>

            {/* Email */}
            <Grid item xs={12}>
              <TextField fullWidth label="Adresse Email" type="email" required variant="outlined" value={formData.email}
                onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                InputProps={{ startAdornment: <InputAdornment position="start"><Email color="action" /></InputAdornment> }} />
            </Grid>

            {/* Téléphone + Mot de passe */}
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Téléphone" required variant="outlined" value={formData.phone}
                onChange={e => handlePhoneChange(e.target.value)}
                error={!!phoneError}
                helperText={phoneError || (selectedCountry?.phonecode ? `Indicatif : +${selectedCountry.phonecode}` : 'Sélectionnez un pays d\'abord')}
                placeholder={selectedCountry ? `+${selectedCountry.phonecode} ...` : '+...'}
                InputProps={{ startAdornment: <InputAdornment position="start"><Phone color={phoneError ? 'error' : 'action'} /></InputAdornment> }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Mot de passe" required variant="outlined"
                type={showPassword ? 'text' : 'password'} value={formData.password}
                onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Lock color="action" /></InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(v => !v)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }} />
            </Grid>

            {/* Adresse */}
            <Grid item xs={12}>
              <TextField fullWidth label="Adresse postale complète" required variant="outlined" value={formData.address}
                onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
                InputProps={{ startAdornment: <InputAdornment position="start"><LocationOn color="action" /></InputAdornment> }} />
            </Grid>

            {/* Médecin : spécialité + n° ordre */}
            {isMedecin && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Spécialité" required variant="outlined" value={formData.specialite}
                    onChange={e => setFormData(p => ({ ...p, specialite: e.target.value }))} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="N° Ordre des médecins" required variant="outlined" value={formData.numeroOrdre}
                    onChange={e => setFormData(p => ({ ...p, numeroOrdre: e.target.value }))} />
                </Grid>
              </>
            )}

            {/* Pharmacien / Labo : établissement */}
            {isPharmacienOrLabo && (
              <Grid item xs={12}>
                <TextField fullWidth required variant="outlined" value={formData.specialite}
                  label={formData.role === UserRole.PHARMACIEN ? 'Nom de la pharmacie' : 'Nom du laboratoire'}
                  onChange={e => setFormData(p => ({ ...p, specialite: e.target.value }))} />
              </Grid>
            )}

            {/* Pays */}
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={allCountries}
                getOptionLabel={opt => `${(opt as any).flag ?? ''} ${(opt as any).name}`}
                isOptionEqualToValue={(opt, val) => (opt as any).isoCode === (val as any).isoCode}
                value={allCountries.find(c => c.isoCode === countryIso) ?? null}
                onChange={(_, country: any) =>
                  country ? handleCountryChange(country.isoCode, country.name) : handleCountryChange('', '')
                }
                renderInput={params => <TextField {...params} label="Pays" required variant="outlined" />}
              />
            </Grid>

            {/* Ville */}
            <Grid item xs={12} sm={6}>
              {cities.length > 0 ? (
                <TextField select fullWidth label="Ville" required variant="outlined" value={formData.ville}
                  onChange={e => setFormData(p => ({ ...p, ville: e.target.value }))}
                  InputProps={{ startAdornment: <InputAdornment position="start"><LocationOn color="action" /></InputAdornment> }}>
                  {cities.map(c => (
                    <MenuItem key={`${c.name}-${(c as any).stateCode ?? ''}`} value={c.name}>{c.name}</MenuItem>
                  ))}
                </TextField>
              ) : (
                <TextField fullWidth label="Ville" required variant="outlined" value={formData.ville}
                  onChange={e => setFormData(p => ({ ...p, ville: e.target.value }))}
                  helperText={!countryIso ? "Sélectionnez d'abord un pays" : ''}
                  InputProps={{ startAdornment: <InputAdornment position="start"><LocationOn color="action" /></InputAdornment> }} />
              )}
            </Grid>
          </Grid>

          <Button fullWidth variant="contained" size="large" onClick={handleCreate}
            sx={{ mt: 3, py: 1.6, borderRadius: 3, fontWeight: 700, textTransform: 'none', fontSize: '1rem',
              boxShadow: '0 6px 18px rgba(25,118,210,0.3)' }}>
            Créer le compte
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
