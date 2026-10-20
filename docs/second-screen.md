# Mode deuxième écran — Coffre-fort 3D

Le premier prototype cible le Coffre-fort 3D : l'écran TV affiche le jeu, tandis que le téléphone active ses capteurs et transmet les rotations au jeu via WebSocket.

## Fonctionnement

- Le bouton « Écran TV » crée une salle avec un code aléatoire de 8 caractères.
- L'écran affiche le coffre et attend les commandes du téléphone.
- Le téléphone rejoint la salle, demande l'autorisation des capteurs depuis un geste utilisateur, puis transmet les deltas de rotation.
- Le jeu conserve la logique, le chronomètre et le rendu 3D sur l'écran d'affichage.
- Le mode local reste le comportement par défaut.

## API temps réel

- `POST /api/rooms` crée un code.
- `/api/rooms/:code/ws?role=display` connecte l'écran.
- `/api/rooms/:code/ws?role=controller` connecte le téléphone.
- `controller:motion` transmet un vecteur de rotation `v: [x, y, z]`.
- `controller:ready` lance une manche sur l'écran.

Le relais vérifie la forme et les bornes des messages, limite leur taille et remplace une ancienne connexion du même rôle.

## Déploiement

Le mode distant nécessite un déploiement Cloudflare Workers avec un binding Durable Objects. Le site statique GitHub Pages et le serveur Vite statique ne fournissent pas cette API temps réel.

## Test manuel

1. Déployer le Worker.
2. Sur l'écran TV, ouvrir Coffre-fort et choisir « Écran TV ».
3. Sur le téléphone, ouvrir le lien de manette ou accéder à DuoGames puis saisir le code.
4. Autoriser les capteurs, puis démarrer depuis le téléphone.
5. Vérifier que les rotations font progresser la chaîne sur la TV et que le mode local reste inchangé.
