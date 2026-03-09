import React from 'react';
import { Box, Button, Container, Typography, InputBase, Grid, Paper, IconButton, useTheme, useMediaQuery } from '@mui/material';
import { Search, LocationOn, VideoCall, Medication, EventAvailable, Security, Description, CheckCircle } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleLogin = () => navigate('/login');
  const handleRegister = () => navigate('/register');


  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#ffffff', overflowX: 'hidden' }}>
      {/* ════════════ HEADER ════════════ */}
      <Box 
        sx={{ 
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
          bgcolor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(0,0,0,0.05)'
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 80 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }} onClick={() => window.scrollTo(0,0)}>
              <Typography variant="h4" fontWeight={900} sx={{ color: '#00afcc', letterSpacing: '-1px' }}>
                SihatiLab<span style={{ color: '#4caf50' }}>.</span>
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {!isMobile && (
                <Typography variant="body2" fontWeight={700} sx={{ cursor: 'pointer', mr: 2, '&:hover': { color: '#00afcc' } }} onClick={handleLogin}>
                  Vous êtes professionnel de santé ?
                </Typography>
              )}
              <Button 
                variant="outlined" 
                onClick={handleLogin}
                sx={{ borderRadius: 8, px: 3, py: 1, borderWidth: 2, borderColor: '#00afcc', color: '#00afcc', '&:hover': { borderWidth: 2, bgcolor: '#e0f7fa' } }}
              >
                Se connecter
              </Button>
              <Button 
                variant="contained" 
                onClick={handleRegister}
                sx={{ borderRadius: 8, px: 3, py: 1.2, bgcolor: '#00afcc', color: '#fff', '&:hover': { bgcolor: '#0082c8' }, boxShadow: '0 4px 14px rgba(0, 175, 204, 0.4)' }}
              >
                S'inscrire
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* ════════════ HERO SECTION ════════════ */}
      <Box 
        sx={{ 
          pt: 18, pb: 12, position: 'relative',
          background: 'linear-gradient(135deg, #00afcc 0%, #0082c8 100%)',
          color: '#fff',
          overflow: 'hidden'
        }}
      >
        {/* Background decorative blob */}
        <Box sx={{ position: 'absolute', top: '-20%', right: '-10%', width: '60%', height: '140%', bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '50%', transform: 'rotate(-15deg)', pointerEvents: 'none' }} />
        
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={7}>
              <Typography 
                variant="h2" 
                fontWeight={900} 
                gutterBottom
                sx={{ 
                  fontSize: { xs: '2.5rem', md: '3.5rem' }, 
                  lineHeight: 1.1, mb: 3,
                  animation: 'fadeInUp 0.8s ease-out backwards' 
                }}
              >
                La santé à portée de main, <br/>sans attente.
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 5, fontWeight: 400, opacity: 0.9, maxWidth: 600,
                  animation: 'fadeInUp 0.8s ease-out 0.2s backwards' 
                }}
              >
                Prenez rendez-vous avec vos professionnels de santé, accédez à vos dossiers médicaux et résultats d'analyses en toute sécurité.
              </Typography>

              {/* MOCK SEARCH BAR */}
              <Paper 
                elevation={0}
                sx={{ 
                  p: 1, display: 'flex', alignItems: 'center', width: '100%', maxWidth: 700, borderRadius: 12,
                  boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                  animation: 'fadeInUp 0.8s ease-out 0.4s backwards',
                  flexDirection: { xs: 'column', sm: 'row' }, gap: 1
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1.5, px: 2, py: { xs: 1, sm: 0 }, width: '100%' }}>
                  <Search sx={{ color: 'text.secondary', mr: 1 }} />
                  <InputBase placeholder="Nom, spécialité, établissement..." sx={{ ml: 1, flex: 1, fontWeight: 600 }} />
                </Box>
                <Box sx={{ display: { xs: 'block', sm: 'none' }, width: '100%', height: '1px', bgcolor: 'divider' }} />
                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, px: 2, py: { xs: 1, sm: 0 }, borderLeft: { sm: '1px solid #eee' }, borderRight: { sm: '1px solid #eee' }, width: '100%' }}>
                  <LocationOn sx={{ color: 'text.secondary', mr: 1 }} />
                  <InputBase placeholder="Où ?" sx={{ ml: 1, flex: 1, fontWeight: 600 }} />
                </Box>
                <Button 
                  variant="contained" 
                  color="secondary"
                  sx={{ borderRadius: 8, py: 1.5, px: 4, height: '100%', width: { xs: '100%', sm: 'auto' }, fontWeight: 800, fontSize: '1rem' }}
                >
                  Rechercher
                </Button>
              </Paper>
              
              <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap', animation: 'fadeInUp 0.8s ease-out 0.6s backwards' }}>
                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(255,255,255,0.1)', py: 1, px: 2, borderRadius: 8, backdropFilter: 'blur(5px)' }}>
                   <CheckCircle fontSize="small" sx={{ color: '#4caf50' }} />
                   <Typography variant="body2" fontWeight={700}>100% Sécurisé</Typography>
                 </Box>
                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(255,255,255,0.1)', py: 1, px: 2, borderRadius: 8, backdropFilter: 'blur(5px)' }}>
                   <CheckCircle fontSize="small" sx={{ color: '#4caf50' }} />
                   <Typography variant="body2" fontWeight={700}>Dossier unifié</Typography>
                 </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={5} sx={{ display: { xs: 'none', md: 'block' } }}>
               <Box 
                 sx={{ 
                   position: 'relative', height: 500, width: '100%',
                   animation: 'float 6s ease-in-out infinite'
                 }}
               >
                 <Box 
                   sx={{ 
                     position: 'absolute', top: '10%', right: '0%', width: 400, height: 500, 
                     bgcolor: '#fff', borderRadius: '40px', transform: 'rotate(5deg)',
                     boxShadow: '0 25px 50px rgba(0,0,0,0.2)', overflow: 'hidden'
                   }} 
                 >
                    {/* Abstract modern visual inside the card */}
                    <Box sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column', gap: 3, pt: 8 }}>
                       <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box sx={{ width: 60, height: 60, borderRadius: '50%', bgcolor: '#e0f7fa' }} />
                          <Box>
                            <Box sx={{ width: 120, height: 16, bgcolor: '#f0f0f0', borderRadius: 4, mb: 1 }} />
                            <Box sx={{ width: 80, height: 12, bgcolor: '#f0f0f0', borderRadius: 4 }} />
                          </Box>
                       </Box>
                       <Box sx={{ width: '100%', height: 80, bgcolor: '#f4f7f9', borderRadius: 3 }} />
                       <Box sx={{ width: '100%', height: 120, bgcolor: '#e8f5e9', borderRadius: 3, mt: 'auto' }} />
                    </Box>
                 </Box>
                 <Box 
                   sx={{ 
                     position: 'absolute', bottom: '5%', left: '-10%', p: 3,
                     bgcolor: '#fff', borderRadius: 4, color: 'text.primary',
                     boxShadow: '0 15px 35px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 2
                   }}
                 >
                    <Box sx={{ p: 2, bgcolor: '#ffebee', borderRadius: 3, color: '#f44336' }}>
                      <EventAvailable fontSize="large" />
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={800}>Rendez-vous</Typography>
                      <Typography variant="body2" color="text.secondary">Confirmé pour demain</Typography>
                    </Box>
                 </Box>
               </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ════════════ FEATURES SECTION ════════════ */}
      <Box sx={{ py: 12, bgcolor: '#f9fafb' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h3" fontWeight={900} gutterBottom>
              Un parcours de soins <span style={{ color: '#00afcc' }}>simplifié</span>
            </Typography>
            <Typography variant="h6" color="text.secondary" fontWeight={400} sx={{ maxWidth: 700, mx: 'auto' }}>
              SihatiLab connecte patients, médecins, infirmiers, pharmacies et laboratoires pour une prise en charge fluide.
            </Typography>
          </Box>

          <Grid container spacing={4}>
             {[
               { icon: <EventAvailable />, title: 'Prenez rendez-vous', desc: 'Trouvez le bon praticien et réservez votre consultation en cabinet en quelques clics.', color: '#00afcc', bg: '#e0f7fa' },
               { icon: <Description />, title: 'Dossier Médical Partagé', desc: 'Regroupez toutes vos ordonnances, analyses et comptes-rendus au même endroit.', color: '#4caf50', bg: '#e8f5e9' },
               { icon: <Medication />, title: 'Pharmacie & Livraison', desc: 'Envoyez vos ordonnances à la pharmacie et suivez la préparation de vos médicaments.', color: '#f44336', bg: '#ffebee' },
             ].map((feat, idx) => (
                <Grid item xs={12} md={4} key={idx}>
                  <Paper 
                    sx={{ 
                      p: 5, height: '100%', borderRadius: 6, transition: 'transform 0.3s',
                      border: '1px solid', borderColor: 'divider',
                      '&:hover': { transform: 'translateY(-10px)', boxShadow: `0 20px 40px ${feat.bg}80`, borderColor: feat.color }
                    }}
                  >
                     <Box sx={{ width: 80, height: 80, borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: feat.bg, color: feat.color, mb: 4, transform: 'rotate(-5deg)' }}>
                       {React.cloneElement(feat.icon as any, { sx: { fontSize: 40 } })}
                     </Box>
                     <Typography variant="h5" fontWeight={800} gutterBottom>{feat.title}</Typography>
                     <Typography variant="body1" color="text.secondary" lineHeight={1.6}>
                       {feat.desc}
                     </Typography>
                  </Paper>
                </Grid>
             ))}
          </Grid>
        </Container>
      </Box>

      {/* ════════════ ALTERNATING BLOCKS ════════════ */}
      <Box sx={{ py: 12, bgcolor: '#ffffff', overflow: 'hidden' }}>
        <Container maxWidth="lg">
          {/* Bloc 1 */}
          <Grid container spacing={8} alignItems="center" sx={{ mb: 12 }}>
            <Grid item xs={12} md={6}>
               <Box sx={{ position: 'relative' }}>
                 <Box sx={{ width: '100%', paddingTop: '100%', bgcolor: '#4caf50', borderRadius: '50% 50% 50% 0', position: 'absolute', top: 0, left: 0, opacity: 0.1, transform: 'scale(1.1)' }} />
                 <Paper sx={{ position: 'relative', zIndex: 1, p: 4, borderRadius: 8, bgcolor: '#e8f5e9', border: '1px solid #c8e6c9', boxShadow: 'none' }}>
                   <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                     <Box sx={{ height: 40, width: '60%', bgcolor: '#fff', borderRadius: 2 }} />
                     <Box sx={{ height: 40, width: '80%', bgcolor: '#fff', borderRadius: 2 }} />
                     <Box sx={{ height: 120, width: '100%', bgcolor: '#fff', borderRadius: 3, mt: 2 }} />
                   </Box>
                 </Paper>
               </Box>
            </Grid>
            <Grid item xs={12} md={6}>
               <Typography variant="overline" color="secondary" fontWeight={800} letterSpacing={2}>INFIRMIERS & ANALYSES</Typography>
               <Typography variant="h3" fontWeight={900} sx={{ mt: 1, mb: 3 }}>Suivi de proximité à domicile</Typography>
               <Typography variant="h6" color="text.secondary" fontWeight={400} sx={{ mb: 4, lineHeight: 1.6 }}>
                 Les médecins peuvent assigner des tâches aux infirmiers (injections, prélèvements). Les résultats d'analyses sont automatiquement intégrés dans le dossier du patient.
               </Typography>
               <Button variant="contained" color="secondary" size="large" sx={{ borderRadius: 8, px: 4, py: 1.5 }} onClick={handleRegister}>
                 Découvrir nos solutions
               </Button>
            </Grid>
          </Grid>

          {/* Bloc 2 */}
          <Grid container spacing={8} alignItems="center" direction={{ xs: 'column-reverse', md: 'row' }}>
            <Grid item xs={12} md={6}>
               <Typography variant="overline" color="primary" fontWeight={800} letterSpacing={2}>VOTRE DOSSIER</Typography>
               <Typography variant="h3" fontWeight={900} sx={{ mt: 1, mb: 3 }}>Vos documents de santé, toujours avec vous !</Typography>
               <Typography variant="h6" color="text.secondary" fontWeight={400} sx={{ mb: 4, lineHeight: 1.6 }}>
                 Conservez vos ordonnances, résultats d'examen et certificats dans un environnement hautement sécurisé. Partagez-les en direct avec vos praticiens pendant vos consultations.
               </Typography>
               <Button variant="contained" color="primary" size="large" sx={{ borderRadius: 8, px: 4, py: 1.5 }} onClick={handleLogin}>
                 Accéder à mon espace
               </Button>
            </Grid>
            <Grid item xs={12} md={6}>
               <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'flex-end' }}>
                 <Box sx={{ width: '100%', paddingTop: '100%', bgcolor: '#00afcc', borderRadius: '50% 0 50% 50%', position: 'absolute', top: 0, right: 0, opacity: 0.1, transform: 'scale(1.1)' }} />
                 <Paper sx={{ position: 'relative', zIndex: 1, p: 4, borderRadius: 8, bgcolor: '#e0f7fa', border: '1px solid #b2ebf2', boxShadow: 'none', width: '90%' }}>
                   <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                     <Box sx={{ height: 100, bgcolor: '#fff', borderRadius: 3 }} />
                     <Box sx={{ height: 100, bgcolor: '#fff', borderRadius: 3 }} />
                     <Box sx={{ height: 100, bgcolor: '#fff', borderRadius: 3 }} />
                     <Box sx={{ height: 100, bgcolor: '#fff', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00afcc' }}>
                       <Security sx={{ fontSize: 40 }} />
                     </Box>
                   </Box>
                 </Paper>
               </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ════════════ FOOTER ════════════ */}
      <Box sx={{ bgcolor: '#1e384c', color: '#fff', pt: 8, pb: 4 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} sx={{ mb: 6 }}>
            <Grid item xs={12} md={4}>
              <Typography variant="h5" fontWeight={900} sx={{ color: '#fff', mb: 2 }}>
                SihatiLab<span style={{ color: '#4caf50' }}>.</span>
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7, maxWidth: 300 }}>
                La plateforme complète dédiée à la e-santé, 
                connectant l'ensemble de l'écosystème médical pour un soin optimisé.
              </Typography>
            </Grid>
            <Grid item xs={6} md={4}>
              <Typography variant="subtitle1" fontWeight={800} gutterBottom>Accès Rapides</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, opacity: 0.8 }}>
                <Typography variant="body2" sx={{ cursor: 'pointer', '&:hover': { color: '#00afcc' } }} onClick={handleLogin}>Espace Patient</Typography>
                <Typography variant="body2" sx={{ cursor: 'pointer', '&:hover': { color: '#00afcc' } }} onClick={handleLogin}>Espace Praticien</Typography>
                <Typography variant="body2" sx={{ cursor: 'pointer', '&:hover': { color: '#00afcc' } }} onClick={handleLogin}>Pharmacies parteneries</Typography>
                <Typography variant="body2" sx={{ cursor: 'pointer', '&:hover': { color: '#00afcc' } }} onClick={handleLogin}>Laboratoires</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={4}>
              <Typography variant="subtitle1" fontWeight={800} gutterBottom>Légal</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, opacity: 0.8 }}>
                <Typography variant="body2" sx={{ cursor: 'pointer', '&:hover': { color: '#00afcc' } }}>Conditions Générales</Typography>
                <Typography variant="body2" sx={{ cursor: 'pointer', '&:hover': { color: '#00afcc' } }}>Politique de Confidentialité</Typography>
                <Typography variant="body2" sx={{ cursor: 'pointer', '&:hover': { color: '#00afcc' } }}>Gestion des cookies</Typography>
              </Box>
            </Grid>
          </Grid>
          <Box sx={{ pt: 3, borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', opacity: 0.5 }}>
            <Typography variant="body2">
              © {new Date().getFullYear()} SihatiLab. Tous droits réservés.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Global Animations via inline style just for this page */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
    </Box>
  );
}