import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, TextField, Button, Typography, Container, InputAdornment, IconButton, Grid } from '@mui/material';
import { MailOutline, LockOutlined, Visibility, VisibilityOff, ArrowBack } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { toast } from '../utils/toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: '#f4f7f9' }}>
      <Grid container sx={{ flex: 1 }}>
        
        {/* Left Side: Brand & Visuals */}
        <Grid item xs={12} md={5} sx={{ 
          display: { xs: 'none', md: 'flex' }, 
          flexDirection: 'column', 
          justifyContent: 'center', 
          p: 6, 
          background: 'linear-gradient(135deg, #00afcc 0%, #0082c8 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <IconButton 
            onClick={() => navigate('/')} 
            sx={{ position: 'absolute', top: 30, left: 30, color: 'white', bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
          >
            <ArrowBack />
          </IconButton>

          <Box sx={{ zIndex: 1, my: 'auto' }}>
            <Typography variant="h2" fontWeight={900} sx={{ mb: 2, letterSpacing: '-1px' }}>
              SihatiLab<span style={{ color: '#4caf50' }}>.</span>
            </Typography>
            <Typography variant="h6" fontWeight={400} sx={{ opacity: 0.9, lineHeight: 1.6, maxWidth: 400 }}>
              Connectez-vous à votre espace médical sécurisé pour accéder à tous vos services de santé.
            </Typography>
          </Box>
          
          {/* Decorative shapes */}
          <Box sx={{ position: 'absolute', bottom: '-10%', right: '-10%', width: 400, height: 400, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }} />
          <Box sx={{ position: 'absolute', top: '20%', right: '-20%', width: 300, height: 300, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.08)' }} />
        </Grid>

        {/* Right Side: Login Form */}
        <Grid item xs={12} md={7} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 3, sm: 6 } }}>
          <Box sx={{ width: '100%', maxWidth: 480 }}>
            {/* Mobile Header */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', mb: 6 }}>
              <IconButton onClick={() => navigate('/')} sx={{ mr: 2, bgcolor: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <ArrowBack />
              </IconButton>
              <Typography variant="h5" fontWeight={900} color="primary.main">
                SihatiLab<span style={{ color: '#4caf50' }}>.</span>
              </Typography>
            </Box>

            <Card elevation={0} sx={{ p: { xs: 4, sm: 6 }, borderRadius: '24px', animation: 'fadeInUp 0.6s ease-out' }}>
              <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight={900} gutterBottom color="text.primary">
                  Bon retour !
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Veuillez entrer vos identifiants pour continuer.
                </Typography>
              </Box>

              <form onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Adresse Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  margin="normal"
                  required
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MailOutline color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 3 }}
                />

                <TextField
                  fullWidth
                  label="Mot de passe"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  margin="normal"
                  required
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlined color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          color="inherit"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, mb: 4 }}>
                  <Typography variant="body2" color="primary.main" sx={{ fontWeight: 700, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
                    Mot de passe oublié ?
                  </Typography>
                </Box>

                <Button 
                  fullWidth 
                  variant="contained" 
                  type="submit" 
                  size="large"
                  sx={{ 
                    py: 1.8, 
                    fontSize: '1.1rem', 
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0, 175, 204, 0.3)'
                  }}
                >
                  Se connecter
                </Button>

                <Box sx={{ mt: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Nouveau sur SihatiLab ?{' '}
                    <Typography 
                      component="span" 
                      variant="body2" 
                      color="primary.main" 
                      fontWeight={800} 
                      sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                      onClick={() => navigate('/register')}
                    >
                      Créer un compte
                    </Typography>
                  </Typography>
                </Box>
              </form>
            </Card>
          </Box>
        </Grid>
      </Grid>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Box>
  );
}
