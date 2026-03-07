FROM node:20-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste du code
COPY . .

# Exposer le port Vite
EXPOSE 5173

# Commande par défaut (peut être surchargée par docker-compose)
CMD ["npm", "run", "dev", "--", "--host"]
