import { useEffect, useState } from 'react';
import { Box, Button, Card, Typography, Dialog, DialogTitle, DialogContent, TextField, MenuItem, Chip } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Add } from '@mui/icons-material';
import { User, UserRole } from '../types';
import api from '../config/api';
import { toast } from 'react-toastify';

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: UserRole.PATIENT,
    firstName: '',
    lastName: '',
    phone: '',
  });

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
      toast.success('Utilisateur créé');
      setOpen(false);
      loadUsers();
      setFormData({ email: '', password: '', role: UserRole.PATIENT, firstName: '', lastName: '', phone: '' });
    } catch (error) {
      toast.error('Erreur');
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

  const columns: GridColDef[] = [
    { field: 'firstName', headerName: 'Prénom', width: 150 },
    { field: 'lastName', headerName: 'Nom', width: 150 },
    { field: 'email', headerName: 'Email', width: 250 },
    { field: 'role', headerName: 'Rôle', width: 150 },
    { field: 'phone', headerName: 'Téléphone', width: 150 },
    {
      field: 'isActive',
      headerName: 'Statut',
      width: 120,
      renderCell: (params) => (
        <Chip label={params.value ? 'Actif' : 'Inactif'} color={params.value ? 'success' : 'error'} size="small" />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
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
        <DialogTitle>Nouvel Utilisateur</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Rôle"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
            margin="normal"
          >
            {Object.values(UserRole).map((role) => (
              <MenuItem key={role} value={role}>{role}</MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="Prénom"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Nom"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            margin="normal"
          />
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
            label="Mot de passe"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            margin="normal"
          />
          <Button fullWidth variant="contained" onClick={handleCreate} sx={{ mt: 2 }}>
            Créer
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
