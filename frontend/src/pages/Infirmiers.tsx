import { useEffect, useState } from 'react';
import { Box, Button, Card, Typography, Dialog, DialogTitle, DialogContent, TextField, Chip, IconButton, Tooltip } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Add, ToggleOn, ToggleOff } from '@mui/icons-material';
import { User } from '../types/user.types';
import api from '../config/api';
import { toast } from 'react-toastify';

export default function Infirmiers() {
  const [infirmiers, setInfirmiers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
  });

  useEffect(() => {
    loadInfirmiers();
  }, []);

  const loadInfirmiers = async () => {
    try {
      const { data } = await api.get('/users/infirmiers');
      setInfirmiers(data);
    } catch (error) {
      toast.error('Erreur de chargement des infirmiers');
    }
  };

  const handleCreate = async () => {
    try {
      await api.post('/users/infirmiers', {
        ...formData,
        role: 'infirmier',
      });
      toast.success('Infirmier créé avec succès (compte inactif par défaut)');
      setOpen(false);
      loadInfirmiers();
      setFormData({ email: '', password: '', firstName: '', lastName: '', phone: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur de création');
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await api.patch(`/users/infirmiers/${id}/toggle-active`);
      toast.success('Statut mis à jour');
      loadInfirmiers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  };

  const columns: GridColDef[] = [
    { field: 'firstName', headerName: 'Prénom', flex: 1 },
    { field: 'lastName', headerName: 'Nom', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1.5 },
    { field: 'phone', headerName: 'Téléphone', flex: 1 },
    {
      field: 'isActive',
      headerName: 'Statut',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Actif' : 'Inactif'}
          color={params.value ? 'success' : 'error'}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      renderCell: (params) => (
        <Tooltip title={params.row.isActive ? 'Désactiver' : 'Activer'}>
          <IconButton
            color={params.row.isActive ? 'error' : 'success'}
            onClick={() => handleToggleActive(params.row.id)}
          >
            {params.row.isActive ? <ToggleOff /> : <ToggleOn />}
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Mes Infirmiers</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
          Ajouter un Infirmier
        </Button>
      </Box>

      <Card>
        <DataGrid
          rows={infirmiers}
          columns={columns}
          autoHeight
          pageSizeOptions={[10, 20]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        />
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ajouter un Infirmier</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Prénom"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Nom"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            margin="normal"
            required
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
            required
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Le compte sera créé inactif. Vous devrez l'activer manuellement.
          </Typography>
          <Button fullWidth variant="contained" onClick={handleCreate} sx={{ mt: 2 }}>
            Créer l'infirmier
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
