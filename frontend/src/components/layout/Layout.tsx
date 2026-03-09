import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Box, Avatar, Menu, MenuItem, useMediaQuery, useTheme } from '@mui/material';
import { Menu as MenuIcon, Dashboard, CalendarMonth, MedicalServices, LocalPharmacy, Science, LocalShipping, Description, People, AccountCircle, GroupAdd, Schedule, FolderShared, Logout } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/user.types';

const DRAWER_WIDTH = 260;

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const menuItems = [
    { text: 'Tableau de bord', icon: <Dashboard />, path: '/dashboard', roles: [UserRole.ADMIN, UserRole.MEDECIN, UserRole.PATIENT, UserRole.PHARMACIEN, UserRole.LABORATOIRE, UserRole.INFIRMIER] },
    { text: 'Rendez-vous', icon: <CalendarMonth />, path: '/appointments', roles: [UserRole.MEDECIN, UserRole.PATIENT, UserRole.INFIRMIER] },
    { text: 'Mes Patients', icon: <People />, path: '/mes-patients', roles: [UserRole.MEDECIN, UserRole.INFIRMIER] },
    { text: 'Mes Consultations', icon: <MedicalServices />, path: '/consultations', roles: [UserRole.MEDECIN, UserRole.INFIRMIER] },
    { text: 'Consultations', icon: <MedicalServices />, path: '/consultations', roles: [UserRole.PATIENT] },
    { text: 'Ordonnances', icon: <LocalPharmacy />, path: '/ordonnances', roles: [UserRole.MEDECIN, UserRole.PATIENT, UserRole.PHARMACIEN, UserRole.INFIRMIER] },
    { text: 'Analyses', icon: <Science />, path: '/analyses', roles: [UserRole.MEDECIN, UserRole.PATIENT, UserRole.LABORATOIRE, UserRole.INFIRMIER] },
    { text: 'Livraisons', icon: <LocalShipping />, path: '/livraisons', roles: [UserRole.PATIENT, UserRole.PHARMACIEN] },
    { text: 'Documents', icon: <Description />, path: '/documents', roles: [UserRole.MEDECIN, UserRole.PATIENT, UserRole.INFIRMIER] },
    { text: 'Dossier Médical', icon: <FolderShared />, path: '/dossier-medical', roles: [UserRole.PATIENT] },
    { text: 'Mon Équipe', icon: <GroupAdd />, path: '/infirmiers', roles: [UserRole.MEDECIN] },
    { text: 'Mon Agenda', icon: <Schedule />, path: '/schedule', roles: [UserRole.MEDECIN, UserRole.INFIRMIER] },
    { text: 'Utilisateurs', icon: <People />, path: '/users', roles: [UserRole.ADMIN] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user?.role as UserRole));

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h5" fontWeight={800} color="primary.main" sx={{ letterSpacing: '-0.5px' }}>
          SihatiLab<span style={{ color: theme.palette.secondary.main }}>.</span>
        </Typography>
      </Box>
      <Box sx={{ px: 2, pb: 2, flexGrow: 1, overflowY: 'auto' }}>
        <Typography variant="overline" color="text.secondary" sx={{ ml: 2, mb: 1, display: 'block', fontWeight: 700, letterSpacing: '1px' }}>
          MENU PRINCIPAL
        </Typography>
        <List sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {filteredMenuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <ListItemButton 
                key={item.path} 
                onClick={() => { navigate(item.path); if (!isDesktop) setDrawerOpen(false); }}
                sx={{
                  borderRadius: '10px',
                  mb: 0.5,
                  p: '10px 16px',
                  backgroundColor: isActive ? 'primary.light' : 'transparent',
                  color: isActive ? 'primary.dark' : 'text.primary',
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: isActive ? 'primary.light' : 'grey.100',
                    transform: 'translateX(4px)'
                  }
                }}
              >
                <ListItemIcon sx={{ color: isActive ? 'primary.dark' : 'text.secondary', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  primaryTypographyProps={{ 
                    fontWeight: isActive ? 800 : 600,
                    fontSize: '0.95rem'
                  }} 
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>
      
      {/* Bottom Profile Section */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <ListItemButton 
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{ borderRadius: 2, p: 1.5, '&:hover': { bgcolor: 'grey.100' } }}
        >
          <Avatar src={user?.avatarUrl} sx={{ width: 36, height: 36, mr: 1.5, bgcolor: 'primary.main', fontWeight: 800 }}>
             {!user?.avatarUrl && user?.firstName[0]}
          </Avatar>
          <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
            <Typography variant="subtitle2" fontWeight={700} noWrap>
              {user?.firstName} {user?.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ textTransform: 'capitalize' }}>
              {user?.role.toLowerCase()}
            </Typography>
          </Box>
        </ListItemButton>
        <Menu 
          anchorEl={anchorEl} 
          open={Boolean(anchorEl)} 
          onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{ sx: { mt: 1, minWidth: 200, borderRadius: 3, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' } }}
        >
          <MenuItem onClick={() => { navigate('/profile'); setAnchorEl(null); }} sx={{ py: 1.5, fontWeight: 600 }}>
            <ListItemIcon><AccountCircle fontSize="small" /></ListItemIcon> Mon Profil
          </MenuItem>
          <MenuItem onClick={() => { logout(); navigate('/login'); }} sx={{ py: 1.5, color: 'error.main', fontWeight: 600 }}>
            <ListItemIcon><Logout fontSize="small" color="error" /></ListItemIcon> Déconnexion
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Desktop App Bar (Hidden on Mobile) */}
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{ 
          width: isDesktop ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%', 
          ml: isDesktop ? `${DRAWER_WIDTH}px` : 0,
          bgcolor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          color: 'text.primary',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {!isDesktop && (
              <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2 }}>
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h6" fontWeight={800} sx={{ display: { xs: 'block', md: 'none' } }}>
              SihatiLab
            </Typography>
          </Box>

          {/* Quick Actions / Notifications can go here */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Kept header minimal, user profile is in the sidebar for desktop */}
            {!isDesktop && (
              <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                <Avatar src={user?.avatarUrl} sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                  {!user?.avatarUrl && user?.firstName[0]}
                </Avatar>
              </IconButton>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={!isDesktop ? drawerOpen : false}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, borderRight: 'none' },
          }}
        >
          {drawerContent}
        </Drawer>
        
        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, borderRight: '1px solid #e0e0e0', bgcolor: '#ffffff' },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1,
          minWidth: 0,
          overflowX: 'hidden',
          overflowY: 'auto',
          p: { xs: 2, sm: 3, md: 4 }, 
          mt: 8,
          width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
