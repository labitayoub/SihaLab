-- Script pour supprimer les URLs des PDFs d'analyses existants
-- Cela forcera la régénération des PDFs avec le nouveau code

-- Supprimer les pdfUrl des analyses
UPDATE analyses SET "pdfUrl" = NULL WHERE "pdfUrl" IS NOT NULL;

-- Supprimer les analysePdfUrl des consultations
UPDATE consultations SET "analysePdfUrl" = NULL WHERE "analysePdfUrl" IS NOT NULL;

-- Afficher le résultat
SELECT COUNT(*) as "Analyses mises à jour" FROM analyses WHERE "pdfUrl" IS NULL;
