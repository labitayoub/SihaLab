import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, TextField, Button, Typography, Container, MenuItem, Grid } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user.types';
import { toast } from 'react-toastify';

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: UserRole.PATIENT,
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    specialite: '',
    numeroOrdre: '',
  });
  const { register } = useAuth();
  const navigate = useNavigate();

  const isMedecin = formData.role === UserRole.MEDECIN;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSend = { ...formData };
      if (!isMedecin) {
        delete (dataToSend as any).specialite;
        delete (dataToSend as any).numeroOrdre;
      }
      await register(dataToSend);
      navigate('/login');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur d\'inscription');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4, mb: 4 }}>
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
            </TextField>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Prénom"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  margin="normal"
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Nom"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  margin="normal"
                  required
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
