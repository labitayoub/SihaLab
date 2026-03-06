import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, TextField, Button, Typography, Container, MenuItem } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { toast } from 'react-toastify';

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: UserRole.PATIENT,
    firstName: '',
    lastName: '',
    phone: '',
  });
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(formData);
      navigate('/login');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur d\'inscription');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4 }}>
        <Card sx={{ p: 4 }}>
          <Typography variant="h4" align="center" gutterBottom color="primary">
            Inscription
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              select
              fullWidth
              label="Rôle"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              margin="normal"
            >
              <MenuItem value={UserRole.PATIENT}>Patient</MenuItem>
              <MenuItem value={UserRole.MEDECIN}>Médecin</MenuItem>
              <MenuItem value={UserRole.PHARMACIEN}>Pharmacien</MenuItem>
              <MenuItem value={UserRole.LABORATOIRE}>Laboratoire</MenuItem>
              <MenuItem value={UserRole.INFIRMIER}>Infirmier</MenuItem>
            </TextField>
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
            <Button fullWidth variant="contained" type="submit" sx={{ mt: 3 }}>
              S'inscrire
            </Button>
            <Button fullWidth onClick={() => navigate('/login')} sx={{ mt: 1 }}>
              Déjà inscrit ? Se connecter
            </Button>
          </form>
        </Card>
      </Box>
    </Container>
  );
}
