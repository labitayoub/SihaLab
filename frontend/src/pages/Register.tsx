import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, TextField, Button, Typography, Container, MenuItem, Grid, IconButton, InputAdornment, Autocomplete } from '@mui/material';
import { ArrowBack, Visibility, VisibilityOff, Email, Badge, Phone, LocationOn, Lock, LocalHospital, Science, LocalPharmacy, Person } from '@mui/icons-material';
import { Country, City } from 'country-state-city';
import { isValidPhoneNumber, parsePhoneNumber, AsYouType } from 'libphonenumber-js';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user.types';

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
    ville: '',
    pays: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [countryIsoCode, setCountryIsoCode] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const allCountries = useMemo(() => Country.getAllCountries(), []);
  const cities = useMemo(
    () => countryIsoCode ? (City.getCitiesOfCountry(countryIsoCode) ?? []) : [],
    [countryIsoCode]
  );
  const selectedCountry = useMemo(
    () => allCountries.find(c => c.isoCode === countryIsoCode) ?? null,
    [allCountries, countryIsoCode]
  );

  const isMedecin = formData.role === UserRole.MEDECIN;
  const isPharmacienOrLabo = [UserRole.PHARMACIEN, UserRole.LABORATOIRE].includes(formData.role);
  const isPatient = formData.role === UserRole.PATIENT;

  const handlePhoneChange = (value: string) => {
    // Format as-you-type if country is known
    const formatted = countryIsoCode
      ? new AsYouType(countryIsoCode as any).input(value)
      : value;
    setFormData(prev => ({ ...prev, phone: formatted }));

    if (!formatted) {
      setPhoneError('');
      return;
    }
    if (countryIsoCode) {
      const valid = isValidPhoneNumber(formatted, countryIsoCode as any);
      setPhoneError(valid ? '' : `Numéro invalide pour ${selectedCountry?.name ?? 'ce pays'}`);
    } else {
      setPhoneError('');
    }
  };

  const handleCountryChange = (isoCode: string, name: string) => {
    setCountryIsoCode(isoCode);
    setFormData(prev => ({ ...prev, pays: name, ville: '', phone: '' }));
    setPhoneError('');
  };

  const handleRoleChange = (role: UserRole) => {
    setCountryIsoCode('');
    setPhoneError('');
    setFormData({ ...formData, role, specialite: '', numeroOrdre: '', ville: '', pays: '', phone: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneError) return;
    // Final validation before submit
    if (countryIsoCode && formData.phone && !isValidPhoneNumber(formData.phone, countryIsoCode as any)) {
      setPhoneError(`Numéro invalide pour ${selectedCountry?.name ?? 'ce pays'}`);
      return;
    }
    try {
      const dataToSend = { ...formData };
      if (!isMedecin) delete (dataToSend as any).numeroOrdre;
      if (!isMedecin && !isPharmacienOrLabo) delete (dataToSend as any).specialite;
      await register(dataToSend);
      navigate('/login');
    } catch {
      // Error toast already shown by AuthContext.register()
    }
  };

  const renderLocationFields = (paysRequired: boolean) => (
    <>
      <Grid item xs={12} sm={6}>
        <Autocomplete
          options={allCountries}
          getOptionLabel={(opt) => `${opt.flag ?? ''} ${opt.name}`}
          isOptionEqualToValue={(opt, val) => opt.isoCode === val.isoCode}
          value={allCountries.find(c => c.isoCode === countryIsoCode) ?? null}
          onChange={(_, country) =>
            country ? handleCountryChange(country.isoCode, country.name) : handleCountryChange('', '')
          }
          renderInput={(params) => (
            <TextField {...params} label="Pays" required={paysRequired} variant="outlined" />
          )}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        {cities.length > 0 ? (
          <TextField
            select fullWidth label="Ville" required variant="outlined"
            value={formData.ville}
            onChange={(e) => setFormData(prev => ({ ...prev, ville: e.target.value }))}
            InputProps={{ startAdornment: <InputAdornment position="start"><LocationOn color="action" /></InputAdornment> }}
          >
            {cities.map((c) => (
              <MenuItem key={`${c.name}-${c.stateCode ?? ''}`} value={c.name}>{c.name}</MenuItem>
            ))}
          </TextField>
        ) : (
          <TextField
            fullWidth label="Ville" required variant="outlined"
            value={formData.ville}
            onChange={(e) => setFormData(prev => ({ ...prev, ville: e.target.value }))}
            helperText={!countryIsoCode ? "Sélectionnez d'abord un pays" : ''}
            InputProps={{ startAdornment: <InputAdornment position="start"><LocationOn color="action" /></InputAdornment> }}
          />
        )}
      </Grid>
    </>
  );

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: '#f4f7f9', py: 4, px: 2 }}>
      <Container maxWidth="md" sx={{ display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ width: '100%', maxWidth: 700, position: 'relative' }}>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton onClick={() => navigate('/login')} sx={{ mr: 2, bgcolor: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h5" fontWeight={900} color="primary.main">
              SihatiLab<span style={{ color: '#4caf50' }}>.</span>
            </Typography>
          </Box>

          <Card elevation={0} sx={{ p: { xs: 3, md: 5 }, borderRadius: '24px', animation: 'fadeInUp 0.6s ease-out' }}>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={900} gutterBottom color="text.primary">
                Créer un compte
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Rejoignez la plateforme leader de la santé connectée.
              </Typography>
            </Box>

            <form onSubmit={handleSubmit}>
              <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                {[UserRole.PATIENT, UserRole.MEDECIN, UserRole.PHARMACIEN, UserRole.LABORATOIRE].map((role) => (
                  <Button
                    key={role}
                    variant={formData.role === role ? 'contained' : 'outlined'}
                    onClick={() => handleRoleChange(role)}
                    startIcon={
                      role === UserRole.PATIENT ? <Person /> :
                      role === UserRole.MEDECIN ? <LocalHospital /> :
                      role === UserRole.PHARMACIEN ? <LocalPharmacy /> : <Science />
                    }
                    sx={{ 
                      borderRadius: '12px', 
                      px: 3, py: 1.5,
                      borderWidth: formData.role === role ? 0 : 2,
                      '&:hover': { borderWidth: formData.role === role ? 0 : 2 }
                    }}
                  >
                    {role}
                  </Button>
                ))}
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth label="Prénom" variant="outlined" required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Badge color="action" /></InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth label="Nom" variant="outlined" required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Badge color="action" /></InputAdornment> }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth label="Adresse Email" type="email" variant="outlined" required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Email color="action" /></InputAdornment> }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth label="Téléphone" variant="outlined" required
                    value={formData.phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    error={!!phoneError}
                    helperText={
                      phoneError ||
                      (selectedCountry?.phonecode ? `Indicatif : +${selectedCountry.phonecode}` : 'Sélectionnez un pays pour valider')
                    }
                    placeholder={selectedCountry ? `+${selectedCountry.phonecode} ...` : '+...'}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Phone color={phoneError ? 'error' : 'action'} /></InputAdornment> }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth label="Mot de passe" type={showPassword ? 'text' : 'password'} variant="outlined" required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><Lock color="action" /></InputAdornment>,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" color="inherit">
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth label="Adresse postale complète" variant="outlined" required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    InputProps={{ startAdornment: <InputAdornment position="start"><LocationOn color="action" /></InputAdornment> }}
                  />
                </Grid>

                {isMedecin && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth label="Spécialité" variant="outlined" required
                        value={formData.specialite}
                        onChange={(e) => setFormData({ ...formData, specialite: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth label="N° Ordre des médecins" variant="outlined" required
                        value={formData.numeroOrdre}
                        onChange={(e) => setFormData({ ...formData, numeroOrdre: e.target.value })}
                      />
                    </Grid>
                    {renderLocationFields(true)}
                  </>
                )}

                {isPharmacienOrLabo && (
                  <>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth variant="outlined" required
                        label={formData.role === UserRole.PHARMACIEN ? 'Nom de la pharmacie' : 'Nom du laboratoire'}
                        value={formData.specialite}
                        onChange={(e) => setFormData({ ...formData, specialite: e.target.value })}
                      />
                    </Grid>
                    {renderLocationFields(true)}
                  </>
                )}

                {isPatient && (
                  <>
                    {renderLocationFields(true)}
                  </>
                )}
              </Grid>

              <Box sx={{ mt: 5 }}>
                <Button 
                  fullWidth variant="contained" type="submit" size="large"
                  sx={{ py: 1.8, fontSize: '1.1rem', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0, 175, 204, 0.3)' }}
                >
                  Valider l'inscription
                </Button>
              </Box>

              <Box sx={{ mt: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Vous avez déjà un compte ?{' '}
                  <Typography 
                    component="span" variant="body2" color="primary.main" fontWeight={800} 
                    sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                    onClick={() => navigate('/login')}
                  >
                    Se connecter
                  </Typography>
                </Typography>
              </Box>
            </form>
          </Card>
        </Box>
      </Container>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Box>
  );
}
