# Glonetz — Portail Apprenant

Application Next.js dédiée aux **étudiants** : connexion, tableau de bord, paiements, réclamations et profil.

## Lancer en local

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3001](http://localhost:3001)

## Compte mock (développement)

| Téléphone       | PIN  |
|-----------------|------|
| +237600000001   | 0000 |

## Variables d'environnement

Créer `.env.local` :

```env
NEXT_PUBLIC_DATA_PROVIDER=mock
NEXT_PUBLIC_API_BASE_URL=https://glonetzerpbackend-1.onrender.com/api
NEXT_PUBLIC_API_LANGUAGE=fr
```

## Projet associé

Le portail **admin / manager / comptable** est dans `../v0-treasury-accounts-ui-main` (port 3000).
