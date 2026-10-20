# Mode deuxième écran — prototype Coffre-fort

## Objectif

Valider le pilotage d'un jeu sur un écran distant avant de généraliser le mode à DuoGames.

- **Écran d'affichage** : exécute et affiche la partie.
- **Téléphone manette** : envoie les commandes tactiles ou capteurs.
- **Salle** : code aléatoire de 8 caractères, partagé entre les deux appareils.
- **Transport** : WebSocket relayé par un Cloudflare Durable Object.

Le mode local actuel doit rester le comportement par défaut.

## Protocole actuel

- `POST /api/rooms` crée un code de salle.
- `GET /api/rooms/:code/ws?role=display` connecte l'écran d'affichage.
- `GET /api/rooms/:code/ws?role=controller` connecte la manette.
- La manette peut envoyer `{ "type": "controller:angle", "angle": 120 }`.
- L'écran peut envoyer `{ "type": "display:state", "state": {} }`.

Une salle autorise une connexion par rôle ; une nouvelle connexion du même rôle remplace l'ancienne. Les messages sont validés et limités en taille.

## Déploiement

Le backend nécessite un déploiement Cloudflare Workers avec un binding Durable Objects. GitHub Pages et le serveur Vite statique ne fournissent pas ces routes API. En local, utiliser Wrangler pour démarrer le Worker et ses assets ensemble.

## Étapes de validation

1. Tester création et reconnexion d'une salle sur un déploiement Workers.
2. Ajouter l'écran d'attente et le QR/code de connexion.
3. Connecter la molette du Coffre-fort à la manette distante.
4. Vérifier latence, perte de connexion et retour au mode local.
5. Réutiliser le protocole pour les autres jeux uniquement après validation.
