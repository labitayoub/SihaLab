export enum AppointmentStatus {
    EN_ATTENTE = 'en_attente',
    CONFIRME = 'confirme',
    TERMINE = 'termine',
    ANNULE = 'annule',
}

export enum OrdonnanceStatus {
    EN_ATTENTE = 'en_attente',
    DELIVREE = 'delivree',
    ANNULEE = 'annulee',
}

export enum AnalyseStatus {
    EN_ATTENTE = 'en_attente',
    EN_COURS = 'en_cours',
    TERMINEE = 'terminee',
}

export enum ConsultationStatus {
  EN_COURS = 'en_cours',
  TERMINEE = 'terminee',
  ANNULEE = 'annulee',
}

export enum LivraisonStatus {
  EN_PREPARATION = 'en_preparation',
  PRETE = 'prete',
  EN_COURS = 'en_cours',
  LIVREE = 'livree',
  ANNULEE = 'annulee',
  ECHEC = 'echec',
}

export enum DocumentType {
  ANALYSE = 'analyse',
  ORDONNANCE = 'ordonnance',
  CONSULTATION = 'consultation',
  AUTRE = 'autre',
}