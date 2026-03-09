import { useState, useRef } from 'react';
import {
  Box, Card, Typography, Avatar, Button, TextField, Grid,
  Divider, Chip, CircularProgress, IconButton, Tooltip,
} from '@mui/material';
import { Edit, Save, Cancel, CameraAlt, Person } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user.types';
import api from '../config/api';
import { toast } from '../utils/toast';

const ROLE_LABELS: Record<string, string> = {
  [UserRole.ADMIN]: 'Administrateur',
  [UserRole.MEDECIN]: 'Médecin',
  [UserRole.PATIENT]: 'Patient',
  [UserRole.PHARMACIEN]: 'Pharmacien',
  [UserRole.LABORATOIRE]: 'Laboratoire',
  [UserRole.INFIRMIER]: 'Infirmier',
};

const ROLE_COLORS: Record<string, 'primary' | 'success' | 'warning' | 'info' | 'secondary' | 'error'> = {
  [UserRole.ADMIN]: 'error',
  [UserRole.MEDECIN]: 'primary',
  [UserRole.PATIENT]: 'success',
  [UserRole.PHARMACIEN]: 'warning',
  [UserRole.LABORATOIRE]: 'info',
  [UserRole.INFIRMIER]: 'secondary',
};

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    address: user?.address || '',
    specialite: user?.specialite || '',
    numeroOrdre: user?.numeroOrdre || '',
  });

  const isMedecin = user?.role === UserRole.MEDECIN;
  const isPharmacienOrLabo = user?.role === UserRole.PHARMACIEN || user?.role === UserRole.LABORATOIRE;

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image trop grande (max 5MB)');
      return;
    }

    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      await api.post('/users/me/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await refreshUser();
      toast.success('Photo de profil mise à jour');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors du téléchargement');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/users/me', formData);
      await refreshUser();
      setEditing(false);
      toast.success('Profil mis à jour');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      address: user?.address || '',
      specialite: user?.specialite || '',
      numeroOrdre: user?.numeroOrdre || '',
    });
    setEditing(false);
  };

  if (!user) return null;

  const fullName = `${user.firstName} ${user.lastName}`;
  const avatarLetter = user.firstName?.[0]?.toUpperCase() || '?';

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>Mon Profil</Typography>

      {/* Avatar + identité */}
      <Card sx={{ p: 4, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          {/* Photo */}
          <Box sx={{ position: 'relative' }}>
            <Avatar
              src={user.avatarUrl}
              sx={{ width: 120, height: 120, fontSize: 48, cursor: 'pointer', border: '3px solid', borderColor: 'primary.main' }}
              onClick={handleAvatarClick}
            >
              {uploadingAvatar ? <CircularProgress size={40} color="inherit" /> : avatarLetter}
            </Avatar>
            <Tooltip title="Changer la photo">
              <IconButton
                size="small"
                onClick={handleAvatarClick}
                sx={{
                  position: 'absolute', bottom: 0, right: 0,
                  bgcolor: 'primary.main', color: 'white',
                  '&:hover': { bgcolor: 'primary.dark' },
                }}
              >
                <CameraAlt fontSize="small" />
              </IconButton>
            </Tooltip>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleAvatarChange}
            />
          </Box>

          {/* Infos principales */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={600}>{fullName}</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>{user.email}</Typography>
            <Chip
              icon={<Person />}
              label={ROLE_LABELS[user.role] || user.role}
              color={ROLE_COLORS[user.role] || 'default'}
              size="small"
            />
            {!user.isActive && (
              <Chip label="Compte inactif" color="error" size="small" sx={{ ml: 1 }} />
            )}
            {user.specialite && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {isMedecin ? `Spécialité : ${user.specialite}` : `Établissement : ${user.specialite}`}
              </Typography>
            )}
          </Box>

          {/* Bouton éditer */}
          <Box>
            {!editing ? (
              <Button variant="outlined" startIcon={<Edit />} onClick={() => setEditing(true)}>
                Modifier
              </Button>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" startIcon={<Save />} onClick={handleSave} disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
                <Button variant="outlined" startIcon={<Cancel />} onClick={handleCancel} color="inherit">
                  Annuler
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Card>

      {/* Informations détaillées */}
      <Card sx={{ p: 4 }}>
        <Typography variant="h6" gutterBottom>Informations personnelles</Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Prénom"
              value={editing ? formData.firstName : user.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              InputProps={{ readOnly: !editing }}
              variant={editing ? 'outlined' : 'filled'}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Nom"
              value={editing ? formData.lastName : user.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              InputProps={{ readOnly: !editing }}
              variant={editing ? 'outlined' : 'filled'}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email"
              value={user.email}
              InputProps={{ readOnly: true }}
              variant="filled"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Téléphone"
              value={editing ? formData.phone : (user.phone || '')}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              InputProps={{ readOnly: !editing }}
              variant={editing ? 'outlined' : 'filled'}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Adresse"
              multiline
              rows={2}
              value={editing ? formData.address : (user.address || '')}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              InputProps={{ readOnly: !editing }}
              variant={editing ? 'outlined' : 'filled'}
            />
          </Grid>

          {/* Champs spécifiques selon rôle */}
          {isMedecin && (
            <>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Spécialité"
                  value={editing ? formData.specialite : (user.specialite || '')}
                  onChange={(e) => setFormData({ ...formData, specialite: e.target.value })}
                  InputProps={{ readOnly: !editing }}
                  variant={editing ? 'outlined' : 'filled'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="N° Ordre"
                  value={editing ? formData.numeroOrdre : (user.numeroOrdre || '')}
                  onChange={(e) => setFormData({ ...formData, numeroOrdre: e.target.value })}
                  InputProps={{ readOnly: !editing }}
                  variant={editing ? 'outlined' : 'filled'}
                />
              </Grid>
            </>
          )}

          {isPharmacienOrLabo && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={user.role === UserRole.PHARMACIEN ? 'Nom de la pharmacie' : 'Nom du laboratoire'}
                value={editing ? formData.specialite : (user.specialite || '')}
                onChange={(e) => setFormData({ ...formData, specialite: e.target.value })}
                InputProps={{ readOnly: !editing }}
                variant={editing ? 'outlined' : 'filled'}
              />
            </Grid>
          )}

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Rôle"
              value={ROLE_LABELS[user.role] || user.role}
              InputProps={{ readOnly: true }}
              variant="filled"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Membre depuis"
              value={new Date(user.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
              InputProps={{ readOnly: true }}
              variant="filled"
            />
          </Grid>
        </Grid>
      </Card>
    </Box>
  );
}
