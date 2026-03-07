import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Box, Avatar, Menu, MenuItem } from '@mui/material';
import { Menu as MenuIcon, Dashboard, CalendarMonth, MedicalServices, LocalPharmacy, Science, LocalShipping, Description, People, AccountCircle, GroupAdd, Schedule } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/user.types';

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard', roles: [UserRole.ADMIN, UserRole.MEDECIN, UserRole.PATIENT, UserRole.PHARMACIEN, UserRole.LABORATOIRE] },
    { text: 'Rendez-vous', icon: <CalendarMonth />, path: '/appointments', roles: [UserRole.MEDECIN, UserRole.PATIENT] },
    { text: 'Consultations', icon: <MedicalServices />, path: '/consultations', roles: [UserRole.MEDECIN, UserRole.PATIENT, UserRole.INFIRMIER] },
    { text: 'Ordonnances', icon: <LocalPharmacy />, path: '/ordonnances', roles: [UserRole.MEDECIN, UserRole.PATIENT, UserRole.PHARMACIEN] },
    { text: 'Analyses', icon: <Science />, path: '/analyses', roles: [UserRole.MEDECIN, UserRole.PATIENT, UserRole.LABORATOIRE] },
    { text: 'Livraisons', icon: <LocalShipping />, path: '/livraisons', roles: [UserRole.PATIENT, UserRole.PHARMACIEN] },
    { text: 'Documents', icon: <Description />, path: '/documents', roles: [UserRole.MEDECIN, UserRole.PATIENT] },
    { text: 'Mes Infirmiers', icon: <GroupAdd />, path: '/infirmiers', roles: [UserRole.MEDECIN] },
    { text: 'Mes Disponibilités', icon: <Schedule />, path: '/schedule', roles: [UserRole.MEDECIN] },
    { text: 'Utilisateurs', icon: <People />, path: '/users', roles: [UserRole.ADMIN] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user?.role as UserRole));

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed">
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={() => setDrawerOpen(true)} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            sx={{ flexGrow: 1, cursor: 'pointer', userSelect: 'none' }}
            onClick={() => navigate('/dashboard')}
          >
            SihatiLab
          </Typography>
          <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Avatar
              src={user?.avatarUrl}
              sx={{ width: 32, height: 32 }}
            >
              {!user?.avatarUrl && user?.firstName[0]}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <MenuItem onClick={() => { navigate('/profile'); setAnchorEl(null); }}>
              <AccountCircle sx={{ mr: 1 }} /> Mon Profil
            </MenuItem>
            <MenuItem onClick={() => { logout(); navigate('/login'); }}>Déconnexion</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 250, pt: 2 }}>
          <List>
            {filteredMenuItems.map((item) => (
              <ListItemButton key={item.path} onClick={() => { navigate(item.path); setDrawerOpen(false); }}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
