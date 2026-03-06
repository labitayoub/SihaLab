import { useEffect, useState } from 'react';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import { CalendarMonth, MedicalServices, LocalPharmacy, Science } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import api from '../config/api';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ appointments: 0, consultations: 0, ordonnances: 0, analyses: 0 });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [appointments, consultations, ordonnances, analyses] = await Promise.all([
        api.get('/appointments'),
        api.get('/consultations'),
        api.get('/ordonnances'),
        api.get('/analyses'),
      ]);
      setStats({
        appointments: appointments.data.length,
        consultations: consultations.data.length,
        ordonnances: ordonnances.data.length,
        analyses: analyses.data.length,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const cards = [
    { title: 'Rendez-vous', value: stats.appointments, icon: <CalendarMonth />, color: '#1976d2' },
    { title: 'Consultations', value: stats.consultations, icon: <MedicalServices />, color: '#4caf50' },
    { title: 'Ordonnances', value: stats.ordonnances, icon: <LocalPharmacy />, color: '#ff9800' },
    { title: 'Analyses', value: stats.analyses, icon: <Science />, color: '#9c27b0' },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Bienvenue, {user?.firstName} {user?.lastName}
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Rôle: {user?.role}
      </Typography>
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {cards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      {card.title}
                    </Typography>
                    <Typography variant="h4">{card.value}</Typography>
                  </Box>
                  <Box sx={{ color: card.color, fontSize: 48 }}>
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
