import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, TextField, Button, Typography, Container } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur de connexion');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Card sx={{ p: 4 }}>
          <Typography variant="h4" align="center" gutterBottom color="primary">
            SihatiLab
          </Typography>
          <Typography variant="body2" align="center" sx={{ mb: 3 }}>
            Plateforme Médicale
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
            />
            <Button fullWidth variant="contained" type="submit" sx={{ mt: 3 }}>
              Se connecter
            </Button>
            <Button fullWidth onClick={() => navigate('/register')} sx={{ mt: 1 }}>
              Créer un compte
            </Button>
          </form>
        </Card>
      </Box>
    </Container>
  );
}
