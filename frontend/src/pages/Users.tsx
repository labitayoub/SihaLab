import { useEffect, useState } from 'react';
import { Box, Button, Card, Typography, Dialog, DialogTitle, DialogContent, TextField, MenuItem, Chip, Grid } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Add } from '@mui/icons-material';
import { User, UserRole } from '../types/user.types';
import api from '../config/api';
import { toast } from '../utils/toast';

const ADMIN_ALLOWED_ROLES = [
  { value: UserRole.MEDECIN, label: 'Médecin' },
  { value: UserRole.PHARMACIEN, label: 'Pharmacien' },
  { value: UserRole.LABORATOIRE, label: 'Laboratoire' },
  { value: UserRole.PATIENT, label: 'Patient' },
];

const ROLE_LABELS: Record<string, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.MEDECIN]: 'Médecin',
  [UserRole.PATIENT]: 'Patient',
  [UserRole.PHARMACIEN]: 'Pharmacien',
  [UserRole.LABORATOIRE]: 'Laboratoire',
  [UserRole.INFIRMIER]: 'Infirmier',
};

const initialFormData = {
  email: '',
  password: '',
  role: UserRole.PATIENT,
  firstName: '',
  lastName: '',
  phone: '',
  address: '',
  specialite: '',
  numeroOrdre: '',
};

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data.data || []);
    } catch (error) {
      toast.error('Erreur de chargement');
    }
  };

  const handleCreate = async () => {
    try {
      await api.post('/users', formData);
      toast.success('Utilisateur créé avec succès');
      setOpen(false);
      loadUsers();
      setFormData(initialFormData);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la création');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await api.patch(`/users/${id}`, { isActive: !isActive });
      toast.success('Statut mis à jour');
      loadUsers();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleRoleChange = (role: UserRole) => {
    setFormData({
      ...formData,
      role,
      specialite: '',
      numeroOrdre: '',
    });
  };

  const isMedecin = formData.role === UserRole.MEDECIN;
  const isPharmacienOrLabo = [UserRole.PHARMACIEN, UserRole.LABORATOIRE].includes(formData.role);

  const columns: GridColDef[] = [
    { field: 'firstName', headerName: 'Prénom', flex: 1, minWidth: 120 },
    { field: 'lastName', headerName: 'Nom', flex: 1, minWidth: 120 },
    { field: 'email', headerName: 'Email', flex: 1.5, minWidth: 200 },
    {
      field: 'role',
      headerName: 'Rôle',
      width: 140,
      renderCell: (params) => (
        <Chip label={ROLE_LABELS[params.value] || params.value} size="small" variant="outlined" />
      ),
    },
    { field: 'phone', headerName: 'Téléphone', width: 130 },
    {
      field: 'specialite',
      headerName: 'Spécialité / Établissement',
      flex: 1,
      minWidth: 150,
      renderCell: (params) => params.value || '—',
    },
    {
      field: 'isActive',
      headerName: 'Statut',
      width: 100,
      renderCell: (params) => (
        <Chip label={params.value ? 'Actif' : 'Inactif'} color={params.value ? 'success' : 'error'} size="small" />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
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

      <Card>
        <DataGrid rows={users} columns={columns} autoHeight pageSizeOptions={[10, 20]} />
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Créer un compte</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Rôle"
            value={formData.role}
            onChange={(e) => handleRoleChange(e.target.value as UserRole)}
            margin="normal"
          >
            {ADMIN_ALLOWED_ROLES.map((r) => (
              <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
            ))}
          </TextField>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Prénom"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                margin="normal"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Nom"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                margin="normal"
              />
            </Grid>
          </Grid>

          <TextField
            fullWidth
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Téléphone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Adresse"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            margin="normal"
            multiline
            rows={2}
          />

          {isMedecin && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Spécialité"
                  value={formData.specialite}
                  onChange={(e) => setFormData({ ...formData, specialite: e.target.value })}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="N° Ordre"
                  value={formData.numeroOrdre}
                  onChange={(e) => setFormData({ ...formData, numeroOrdre: e.target.value })}
                  margin="normal"
                />
              </Grid>
            </Grid>
          )}

          {isPharmacienOrLabo && (
            <TextField
              fullWidth
              label={formData.role === UserRole.PHARMACIEN ? 'Nom de la pharmacie' : 'Nom du laboratoire'}
              value={formData.specialite}
              onChange={(e) => setFormData({ ...formData, specialite: e.target.value })}
              margin="normal"
            />
          )}

          <TextField
            fullWidth
            label="Mot de passe"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            margin="normal"
          />

          <Button fullWidth variant="contained" onClick={handleCreate} sx={{ mt: 2 }}>
            Créer le compte
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
