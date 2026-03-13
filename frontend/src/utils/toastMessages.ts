/**
 * Messages toast centralisés et personnalisés
 * Tous les messages sont clairs, informatifs et aident l'utilisateur à comprendre ce qui s'est passé
 */

export const ToastMessages = {
  // ========== AUTHENTIFICATION ==========
  auth: {
    loginSuccess: '✓ Connexion réussie ! Bienvenue',
    loginError: (details?: string) => `✗ Échec de connexion${details ? ` : ${details}` : '. Vérifiez vos identifiants'}`,
    registerSuccess: '✓ Inscription réussie ! Vous pouvez maintenant vous connecter',
    registerError: (details?: string) => `✗ Échec d'inscription${details ? ` : ${details}` : ''}`,
    logoutSuccess: 'Déconnexion réussie. À bientôt !',
  },

  // ========== RENDEZ-VOUS ==========
  appointments: {
    loadError: '✗ Impossible de charger les rendez-vous. Veuillez réessayer',
    createSuccess: '✓ Rendez-vous créé avec succès ! Vous recevrez une confirmation par email',
    createError: (details?: string) => `✗ Impossible de créer le rendez-vous${details ? ` : ${details}` : ''}`,
    confirmSuccess: '✓ Rendez-vous confirmé ! Le dossier médical a été créé automatiquement',
    confirmError: '✗ Impossible de confirmer le rendez-vous. Veuillez réessayer',
    cancelSuccess: '✓ Rendez-vous annulé avec succès',
    cancelError: '✗ Impossible d\'annuler le rendez-vous. Veuillez réessayer',
  },

  // ========== CONSULTATIONS ==========
  consultations: {
    loadError: '✗ Impossible de charger les consultations. Veuillez rafraîchir la page',
    createSuccess: '✓ Consultation créée avec succès ! Redirection vers les détails...',
    createError: (details?: string) => `✗ Impossible de créer la consultation${details ? ` : ${details}` : ''}`,
    motifRequired: '⚠ Le motif de consultation est obligatoire',
    noPatientSelected: '⚠ Veuillez sélectionner un patient',
    saveSuccess: '✓ Consultation enregistrée avec succès',
    saveError: '✗ Impossible d\'enregistrer la consultation. Veuillez réessayer',
    cancelSuccess: '✓ Consultation annulée — Le rendez-vous associé a été annulé',
    cancelError: (details?: string) => `✗ Impossible d\'annuler la consultation${details ? ` : ${details}` : ''}`,
    pdfGenerateSuccess: (message?: string) => message || '✓ PDF générés avec succès — Consultation terminée',
    pdfGenerateError: '✗ Impossible de générer les PDF. Veuillez réessayer',
  },

  // ========== ORDONNANCES ==========
  ordonnances: {
    loadError: '✗ Impossible de charger les ordonnances. Veuillez rafraîchir la page',
    createSuccess: '✓ Ordonnance créée avec succès',
    createError: (details?: string) => `✗ Impossible de créer l'ordonnance${details ? ` : ${details}` : ''}`,
    updateSuccess: '✓ Ordonnance mise à jour avec succès',
    updateError: '✗ Impossible de mettre à jour l\'ordonnance. Veuillez réessayer',
    deleteSuccess: '✓ Ordonnance supprimée avec succès',
    deleteError: '✗ Impossible de supprimer l\'ordonnance. Veuillez réessayer',
    deliverSuccess: '✓ Ordonnance délivrée avec succès',
    deliverError: '✗ Impossible de délivrer l\'ordonnance. Veuillez réessayer',
    noMedicaments: '⚠ Ajoutez au moins un médicament à l\'ordonnance',
    pdfGenerateSuccess: '✓ Ordonnance créée et PDF généré automatiquement',
    pdfGenerateFallback: '✓ Ordonnance créée (le PDF sera généré depuis la consultation)',
  },

  // ========== ANALYSES ==========
  analyses: {
    loadError: '✗ Impossible de charger les analyses. Veuillez rafraîchir la page',
    createSuccess: '✓ Analyse prescrite avec succès',
    createError: (details?: string) => `✗ Impossible de prescrire l'analyse${details ? ` : ${details}` : ''}`,
    updateSuccess: '✓ Analyse mise à jour avec succès',
    updateError: '✗ Impossible de mettre à jour l\'analyse. Veuillez réessayer',
    deleteSuccess: '✓ Analyse supprimée avec succès',
    deleteError: '✗ Impossible de supprimer l\'analyse. Veuillez réessayer',
    noDescription: '⚠ Veuillez entrer une description pour l\'analyse',
    pdfGenerateSuccess: '✓ Analyse demandée et PDF généré automatiquement',
    pdfGenerateFallback: '✓ Analyse demandée (le PDF sera généré depuis la consultation)',
    resultUploadSuccess: '✓ Résultat d\'analyse uploadé avec succès',
    resultUploadError: '✗ Impossible d\'uploader le résultat. Veuillez réessayer',
  },

  // ========== DOCUMENTS ==========
  documents: {
    loadError: '✗ Impossible de charger les documents. Veuillez rafraîchir la page',
  },

  // ========== LIVRAISONS ==========
  livraisons: {
    loadError: '✗ Impossible de charger les livraisons. Veuillez rafraîchir la page',
    createSuccess: '✓ Livraison créée avec succès',
    createError: '✗ Impossible de créer la livraison. Veuillez réessayer',
    updateStatusSuccess: '✓ Statut de livraison mis à jour avec succès',
    updateStatusError: '✗ Impossible de mettre à jour le statut. Veuillez réessayer',
  },

  // ========== PROFIL ==========
  profile: {
    avatarInvalidType: '⚠ Veuillez sélectionner une image (JPG, PNG, GIF)',
    avatarTooLarge: '⚠ Image trop grande (maximum 5 MB)',
    avatarUploadSuccess: '✓ Photo de profil mise à jour avec succès',
    avatarUploadError: (details?: string) => `✗ Impossible de télécharger la photo${details ? ` : ${details}` : ''}`,
    updateSuccess: '✓ Profil mis à jour avec succès',
    updateError: (details?: string) => `✗ Impossible de mettre à jour le profil${details ? ` : ${details}` : ''}`,
  },

  // ========== HORAIRES ==========
  schedule: {
    morningEndBeforeStart: (day: string) => `⚠ ${day} Matin : l'heure de fin doit être après l'heure de début`,
    afternoonEndBeforeStart: (day: string) => `⚠ ${day} Après-midi : l'heure de fin doit être après l'heure de début`,
    afternoonBeforeMorning: (day: string) => `⚠ ${day} : l'après-midi doit commencer après la fin du matin (pause déjeuner)`,
    saveSuccess: '✓ Horaires sauvegardés avec succès',
    saveError: (details?: string) => `✗ Impossible de sauvegarder les horaires${details ? ` : ${details}` : ''}`,
  },

  // ========== GÉNÉRAL ==========
  general: {
    error: '✗ Une erreur est survenue. Veuillez réessayer',
    success: '✓ Opération réussie',
    loading: 'Chargement en cours...',
    saving: 'Enregistrement en cours...',
  },
};
