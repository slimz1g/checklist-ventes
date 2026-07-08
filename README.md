# Check-list des ventes — LeadFox

Implémentation réelle du dashboard de priorités, remplaçant le mockup par de vrais appels
API vers HubSpot, le Google Sheet "Pipeline vendeur", et Fireflies.

Toute la logique métier (seuils de 48h, paliers Ghosting, règle des 60 jours, etc.) est
documentée dans `Check-list_des_ventes_Reference.md` — ce code l'implémente telle quelle.

## Démarrage

```bash
npm install
cp .env.example .env.local   # puis remplir les vraies clés
npm run dev
```

Ouvre http://localhost:3000/priorities

## Ce qui est réel vs ce qui reste à faire

**Fonctionnel dès que les clés sont configurées :**
- Lecture live des deals HubSpot (Entonnoir de ventes, Deals sans RV réalisé, Outbound: Cold Email)
- Calcul des 6 sections de priorité selon les règles documentées
- Lecture du Google Sheet pour le % de closing et les notes
- Détection des tâches HubSpot en retard
- Liens "Ouvrir dans HubSpot" fonctionnels

**Volontairement laissé de côté pour cette première passe** (voir section 7-8 du document
de référence) :
- Insight Fireflies par deal — la fonction existe (`lib/fireflies.ts`) mais n'est pas
  encore appelée automatiquement dans la route `/api/priorities`, pour éviter un appel
  Fireflies par deal à chaque chargement de page. À brancher une fois qu'on sait si
  HubSpot a déjà un champ avec le lien Fireflies par deal (mentionné mais pas confirmé).
- Bouton "Appeler" (Aircall) — la logique de récupération du téléphone existe
  (`getPrimaryContactPhone`) mais n'est pas encore branchée dans la page `/priorities`.
- Le nom de l'onglet Google Sheet change chaque mois ("Pipeline vendeur - juil '26") —
  actuellement codé en dur dans `lib/googleSheet.ts`. Cassera au changement de mois tant
  que ce n'est pas automatisé ou que la convention de nommage change.
- Authentification de l'app elle-même (qui peut accéder à `/priorities`) — pas encore de
  couche Supabase branchée. Pour un déploiement solo, ce n'est pas bloquant, mais requis
  avant d'ouvrir à toute l'équipe.
- Filtre "Mes deals / Toute l'équipe" et filtre par pipeline du mockup — pas encore
  réintégrés dans cette version réelle, qui ne montre que les deals de `HUBSPOT_OWNER_ID`.

## Structure

```
app/
  api/priorities/route.ts   → agrège HubSpot + Sheet + Fireflies, calcule les 6 sections
  priorities/page.tsx       → l'interface qui affiche le résultat
lib/
  hubspot.ts                → client HubSpot (recherche de deals, tâches, téléphone contact)
  googleSheet.ts             → client Google Sheets (lecture du sheet Pipeline vendeur)
  fireflies.ts               → client Fireflies (recherche de transcription par participant)
```
