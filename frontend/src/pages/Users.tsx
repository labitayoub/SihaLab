import { useEffect, useState, useMemo } from 'react';
import {
  Box, Button, Card, Typography, Dialog, DialogTitle, DialogContent,
  TextField, Chip, Grid, InputAdornment, IconButton, MenuItem, Autocomplete,
  Avatar, Paper, Stack, Tabs, Tab, Tooltip, alpha,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Add, Visibility, VisibilityOff, Email, Badge, Phone, LocationOn,
  Lock, LocalHospital, LocalPharmacy, Science, Person, Close,
  MedicalServices, People, Search, Biotech, AdminPanelSettings,
  CheckCircle, Block,
} from '@mui/icons-material';
import { Country, City } from 'country-state-city';
import { isValidPhoneNumber, AsYouType } from 'libphonenumber-js';
import { User, UserRole } from '../types/user.types';
import api from '../config/api';
import { toast } from '../utils/toast';
import React from 'react';

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactElement }> = {
  [UserRole.ADMIN]: { label: 'Admin', color: '#d32f2f', bg: '#ffebee', icon: <AdminPanelSettings sx={{ fontSize: 18 }} /> },
  [UserRole.MEDECIN]: { label: 'Médecin', color: '#1976d2', bg: '#e3f2fd', icon: <MedicalServices sx={{ fontSize: 18 }} /> },
  [UserRole.PATIENT]: { label: 'Patient', color: '#2e7d32', bg: '#e8f5e9', icon: <Person sx={{ fontSize: 18 }} /> },
  [UserRole.PHARMACIEN]: { label: 'Pharmacien', color: '#9c27b0', bg: '#f3e5f5', icon: <LocalPharmacy sx={{ fontSize: 18 }} /> },
  [UserRole.LABORATOIRE]: { label: 'Laboratoire', color: '#e65100', bg: '#fff3e0', icon: <Biotech sx={{ fontSize: 18 }} /> },
  [UserRole.INFIRMIER]: { label: 'Infirmier', color: '#00838f', bg: '#e0f7fa', icon: <LocalHospital sx={{ fontSize: 18 }} /> },
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
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filtered users
  const filteredUsers = useMemo(() => {
    let result = users;
    if (roleFilter !== 'all') {
      result = result.filter(u => u.role === roleFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(u =>
        u.firstName?.toLowerCase().includes(q) ||
        u.lastName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.specialite?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [users, roleFilter, searchQuery]);

  // Role counts
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: users.length };
    Object.values(UserRole).forEach(role => {
      counts[role] = users.filter(u => u.role === role).length;
    });
    return counts;
  }, [users]);

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
    {
      field: 'user', headerName: 'Utilisateur', flex: 1.5, minWidth: 220,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
          <Avatar
            src={params.row.avatarUrl || undefined}
            sx={{
              width: 38, height: 38, fontWeight: 700, fontSize: 14,
              bgcolor: ROLE_CONFIG[params.row.role]?.color || '#757575',
            }}
          >
            {(params.row.firstName?.[0] || '').toUpperCase()}{(params.row.lastName?.[0] || '').toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} noWrap>
              {params.row.role === UserRole.MEDECIN ? 'Dr. ' : ''}{params.row.firstName} {params.row.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
              {params.row.email}
            </Typography>
          </Box>
        </Box>
      ),
      valueGetter: (value: any, row: any) => `${row.firstName} ${row.lastName} ${row.email}`,
    },
    {
      field: 'role', headerName: 'Rôle', width: 150,
      renderCell: (params) => {
        const config = ROLE_CONFIG[params.value];
        return config ? (
          <Chip
            icon={config.icon}
            label={config.label}
            size="small"
            sx={{
              fontWeight: 700, fontSize: 12,
              bgcolor: config.bg, color: config.color,
              border: `1px solid ${alpha(config.color, 0.3)}`,
              '& .MuiChip-icon': { color: config.color },
            }}
          />
        ) : <Chip label={params.value} size="small" />;
      },
    },
    {
      field: 'specialite', headerName: 'Spécialité / Établissement', flex: 1, minWidth: 160,
      renderCell: (params) => (
        <Typography variant="body2" color={params.value ? 'text.primary' : 'text.disabled'} noWrap>
          {params.value || '—'}
        </Typography>
      ),
    },
    {
      field: 'ville', headerName: 'Ville', width: 130,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {params.value && <LocationOn sx={{ fontSize: 14, color: 'text.secondary' }} />}
          <Typography variant="body2" color={params.value ? 'text.primary' : 'text.disabled'} noWrap>
            {params.value || '—'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'isActive', headerName: 'Statut', width: 110,
      renderCell: (params) => (
        <Chip
          icon={params.value ? <CheckCircle sx={{ fontSize: 16 }} /> : <Block sx={{ fontSize: 16 }} />}
          label={params.value ? 'Actif' : 'Inactif'}
          size="small"
          sx={{
            fontWeight: 600, fontSize: 12,
            bgcolor: params.value ? '#e8f5e9' : '#ffebee',
            color: params.value ? '#2e7d32' : '#d32f2f',
            border: `1px solid ${params.value ? '#a5d6a7' : '#ef9a9a'}`,
            '& .MuiChip-icon': { color: params.value ? '#2e7d32' : '#d32f2f' },
          }}
        />
      ),
    },
    {
      field: 'actions', headerName: '', width: 120, sortable: false,
      renderCell: (params) => (
        <Tooltip title={params.row.isActive ? 'Désactiver le compte' : 'Activer le compte'}>
          <Button
            size="small"
            variant={params.row.isActive ? 'outlined' : 'contained'}
            color={params.row.isActive ? 'error' : 'success'}
            onClick={() => handleToggleActive(params.row.id, params.row.isActive)}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, fontSize: 12 }}
          >
            {params.row.isActive ? 'Désactiver' : 'Activer'}
          </Button>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box sx={{ animation: 'fadeIn 0.4s ease-out', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <People sx={{ fontSize: 36, color: '#1976d2' }} />
            Utilisateurs
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {users.length} comptes enregistrés
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpen(true)}
          sx={{
            borderRadius: 3, px: 3, py: 1.2, textTransform: 'none', fontWeight: 700, fontSize: '0.95rem',
            boxShadow: '0 4px 14px rgba(25,118,210,0.3)',
            '&:hover': { boxShadow: '0 6px 20px rgba(25,118,210,0.4)' },
          }}
        >
          Nouvel Utilisateur
        </Button>
      </Box>

      {/* Role stat cards */}
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {Object.entries(ROLE_CONFIG).map(([role, config]) => (
          <Grid item xs={4} sm={2} key={role}>
            <Paper
              elevation={0}
              onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}
              sx={{
                p: 1.5, textAlign: 'center', borderRadius: 2.5, cursor: 'pointer',
                bgcolor: roleFilter === role ? config.bg : 'background.paper',
                border: '2px solid',
                borderColor: roleFilter === role ? config.color : 'transparent',
                transition: 'all 0.25s ease',
                '&:hover': { bgcolor: config.bg, borderColor: alpha(config.color, 0.4) },
              }}
            >
              <Typography variant="h5" fontWeight={800} sx={{ color: config.color, lineHeight: 1.2 }}>
                {roleCounts[role] || 0}
              </Typography>
              <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 0.3 }}>
                {config.icon} {config.label}s
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Search bar */}
      <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2.5 }}>
        <TextField
          fullWidth
          placeholder="Rechercher par nom, email, spécialité..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          variant="standard"
          InputProps={{
            disableUnderline: true,
            startAdornment: <InputAdornment position="start" sx={{ ml: 1.5 }}><Search color="action" /></InputAdornment>,
            endAdornment: searchQuery ? (
              <InputAdornment position="end" sx={{ mr: 0.5 }}>
                <IconButton size="small" onClick={() => setSearchQuery('')}><Close sx={{ fontSize: 18 }} /></IconButton>
              </InputAdornment>
            ) : null,
            sx: { py: 1.2, fontSize: '0.95rem' },
          }}
        />
      </Paper>

      {/* Info bar */}
      {(roleFilter !== 'all' || searchQuery) && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {filteredUsers.length} résultat{filteredUsers.length !== 1 ? 's' : ''}
          </Typography>
          {roleFilter !== 'all' && (
            <Chip
              label={ROLE_CONFIG[roleFilter]?.label || roleFilter}
              size="small"
              onDelete={() => setRoleFilter('all')}
              sx={{ fontWeight: 600, bgcolor: ROLE_CONFIG[roleFilter]?.bg, color: ROLE_CONFIG[roleFilter]?.color }}
            />
          )}
          {searchQuery && (
            <Chip label={`"${searchQuery}"`} size="small" onDelete={() => setSearchQuery('')} sx={{ fontWeight: 600 }} />
          )}
        </Box>
      )}

      {/* Data Table */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <DataGrid
          rows={filteredUsers}
          columns={columns}
          autoHeight
          pageSizeOptions={[10, 20, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableColumnResize
          disableRowSelectionOnClick
          rowHeight={60}
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': {
              bgcolor: 'grey.50',
              borderBottom: '2px solid',
              borderColor: 'divider',
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 700,
              fontSize: 13,
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            },
            '& .MuiDataGrid-row': {
              transition: 'background 0.15s',
              '&:hover': { bgcolor: 'action.hover' },
            },
            '& .MuiDataGrid-cell': { borderColor: 'divider' },
            '& .MuiDataGrid-scrollbar--horizontal': { display: 'none' },
          }}
        />
      </Paper>

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
              { role: UserRole.PATIENT, label: 'Patient', icon: <Person /> },
              { role: UserRole.MEDECIN, label: 'Médecin', icon: <LocalHospital /> },
              { role: UserRole.PHARMACIEN, label: 'Pharmacien', icon: <LocalPharmacy /> },
              { role: UserRole.LABORATOIRE, label: 'Laboratoire', icon: <Science /> },
            ].map(({ role, label, icon }) => (
              <Button key={role}
                variant={formData.role === role ? 'contained' : 'outlined'}
                onClick={() => handleRoleChange(role)}
                startIcon={icon}
                sx={{
                  borderRadius: 3, px: 2.5, py: 1, textTransform: 'none', fontWeight: 700,
                  borderWidth: formData.role === role ? 0 : 2,
                  '&:hover': { borderWidth: formData.role === role ? 0 : 2 }
                }}
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
            sx={{
              mt: 3, py: 1.6, borderRadius: 3, fontWeight: 700, textTransform: 'none', fontSize: '1rem',
              boxShadow: '0 6px 18px rgba(25,118,210,0.3)'
            }}>
            Créer le compte
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
