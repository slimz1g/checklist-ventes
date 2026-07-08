# Check-list des ventes — Document de référence

*Dernière mise à jour : 8 juillet 2026*

## 1. Vision du projet

Un **coach de vente** intégré à HubSpot qui priorise automatiquement les tâches à faire pour maximiser les rendez-vous générés et protéger les deals en négociation. Pas une simple check-list statique — un système qui détecte les angles morts et dit quoi prioriser.

**Livrable :** Nouvel onglet dans le dashboard existant (celui construit pour la préparation de rencontres — React/Supabase, même identité visuelle).

**Exécution :** Chaque rep de vente gère sa propre check-list, pour ses propres deals.

---

## 2. Structure des priorités globales

1. **Pipeline d'entrée** (inbound) — priorité #1
2. **Pipeline outbound** — priorité #2, après l'inbound

---

## 3. Pipelines couvertes et règles de déclenchement

### 3.1 — PME - Entonnoir de ventes (pipeline ID `2041621`)

Deals déjà rencontrés (après RV inbound). Champs disponibles par contact/deal :
- `notes_last_contacted` — date du dernier appel/courriel/meeting loggé
- `notes_next_activity_date` — date de la prochaine activité planifiée
- `type` — Type A1 / A / B / C / D (segmentation)
- `probabilite_de_vendre_a_ce_prospect` — Élevée / Moyenne / Faible / Aucune (LeadFox)
- `chance_de_closer_lf1` — Élevé (SQL) / Moyen / Faible (Leadfox One)
- `hs_priority` — champ existant mais **non utilisé** par l'équipe, à ignorer
- Le "score" affiché sur les cartes Kanban = score IA HubSpot (boîte noire), **non fiable comme source de vérité**

#### Stage : Négo en cours 🤝 (ID `3377465`)
Deals chauds — priorité #1 pour l'automatisation.

**Logique de déclenchement :**
- Seuil de "jours sans contact" **variable selon la proximité de `closedate`** — plus le closing approche, plus le seuil de tolérance doit être court (formule exacte à raffiner lors du design)
- 🔴 Urgent : pas de contact récent **ET** `notes_next_activity_date` vide ou passée
- 🟡 À surveiller : pas de contact récent mais activité future planifiée
- Pondération par `probabilite_de_vendre_a_ce_prospect` : un deal "Élevée" stagnant = urgence max; un deal "Faible/Aucune" stagnant = à déqualifier plutôt qu'à sauver

**Exemples réels trouvés (8 juillet 2026) :** Patrick Beaulieu (50 jours sans contact, aucune prochaine activité), Benoit Du Peloux (64 jours, aucune prochaine activité) — deals "actifs" en réalité abandonnés.

#### Stage : Remis à plus tard ⏰ (ID `181089388`)
112 deals ouverts — **le plus gros groupe de la pipeline (33%)**.
Signification confirmée : leads qui ont demandé explicitement d'être rappelés dans 2-3 mois (PAS un signe de négligence en soi).

**Logique de déclenchement :**
- Si `notes_next_activity_date` existe → alerte si dépassée
- Si vide → utiliser `hs_v2_date_entered_current_stage` + **60 jours** (seuil validé) comme date de rappel par défaut
- Constat terrain : sur un échantillon de 15 deals, seulement 4 avaient une date de rappel programmée — la majorité repose sur le filet de sécurité par défaut

#### Stage : Bouge pas (ID `59187110`, et équivalents `127152554` en Entonnoir / `1294334843` en Outbound)
136 deals ouverts côté inbound (40% de la pipeline). Signification confirmée : leads **complètement inactifs, à nettoyer/archiver**. Pas un focus de vente actif.

**Logique de déclenchement (finalisée) :**
- Pas de fréquence fixe imposée — un **compteur visible en tout temps** dans le dashboard (pas de rappel hebdomadaire/mensuel forcé), pour que ça reste au radar sans être une corvée programmée
- Action **semi-automatique** : le coach suggère la fermeture (marquer comme perdu), mais **demande toujours confirmation** au rep avant d'agir — jamais de fermeture automatique sans intervention humaine

#### Stage : Ghosting ? ou Pas dispo? (ID `59133512`)
4 deals seulement, mais très révélateur : deals avec 11 à 62 activités passées puis silence total (jusqu'à 316 jours pour le cas extrême "Diana Vital").

**Logique de déclenchement (paliers sur les jours sans contact) :**
| Palier | Délai | Action suggérée |
|---|---|---|
| 1 | 0-30 jours | Relances normales |
| 2 | 30-60 jours | Relance légère et espacée |
| 3 | 60-90 jours | 🎯 Suggérer un courriel de rupture ("breakup email") |
| 4 | 90+ jours | 🔴 Suggérer fermeture/archivage comme perdu |

---

### 3.2 — PME - Deals sans RV réalisé (pipeline ID `3649420`) — Pipeline d'entrée (inbound)

**Découverte importante :** 7 093 deals au total dans cette pipeline, mais la grande majorité (6 750+) sont de vieux deals fermés-perdus datant de 2020-2023 qui traînent sans avoir été archivés. Seulement **341 deals sont réellement ouverts**.

Répartition des 341 deals ouverts :
| Stage | ID | # Deals | % |
|---|---|---|---|
| Bouge pas | `59187110` | 136 | 40% |
| Remis à plus tard | `181089388` | 112 | 33% |
| RV Réalisé (persona no fit) | `234897569` | 43 | 13% |
| 3e suivi et + 📞 | `3649424` | 36 | 11% |
| Meeting 🚷 - séquence démarrée | `24052909` | 8 | 2% |
| 2e suivi 📞 | `3649423` | 3 | 1% |
| RV planifié 👍🏻 | `5246379` | 2 | 1% |

**À retenir pour le design du dashboard :** filtrer sur `hs_is_closed = false` pour ne pas noyer les leads actifs dans l'historique. *(Logique de déclenchement détaillée par stage — encore à définir, en attente de suite de la découverte.)*

---

### 3.3 — 📧 Outbound: Cold Email (pipeline ID `863513235`) — Pipeline outbound

39 deals ouverts. Mapping confirmé via capture d'écran HubSpot :

| Stage | ID | # Deals | Rôle |
|---|---|---|---|
| Email | `1291665788` | 24 | ⚠️ Ne signifie PAS "en attente de réponse" — signifie que le lead **préfère l'écrit, ne veut pas d'appels** |
| En Suivi | `1291665784` | 7 | A répondu → relance active |
| RDV Planifié | `1291665785` | 2 | Meeting confirmé |
| No Show | `1294421337` | 5 | Meeting prévu, prospect absent → à rebooker |
| Bouge Pas | `1294334843` | 1 | Stagnant |
| Réponse Positive | — | 0 | (vide actuellement) |
| RDV Réalisé | — | 0 | (vide actuellement) |
| Pas Intéressé | — | 87 | Fermé-perdu |
| No Fit | — | 20 | Fermé-perdu |

**Logique de déclenchement :**
- **En Suivi** : alerte si `notes_last_contacted` > **48h** (cadence confirmée : appel 1x/jour ou 1x/48h)
- **No Show** : même urgence que "En Suivi" — rebooking traité comme une relance prioritaire
- **Email** (préférence écrite) : cadence de relance par **courriel 1x/semaine** (pas d'appel, cadence plus longue car moins intrusif)
- **Bouge Pas** : nettoyage occasionnel, même logique que côté inbound

---

## 4. Décisions validées (résumé rapide)

- ✅ Livrable = nouvel onglet dans le dashboard existant (pas un outil séparé)
- ✅ Chaque rep gère ses propres deals — **filtré par `hubspot_owner_id`, verrouillé par défaut sur le rep connecté** (bascule "Toute l'équipe" disponible)
- ✅ Score IA HubSpot (boîte noire) écarté comme source de vérité — on construit notre propre logique avec les champs `notes_last_contacted`, `notes_next_activity_date`, `type`, `probabilite_de_vendre_a_ce_prospect`, `chance_de_closer_lf1`
- ✅ Le dashboard doit ignorer l'historique fermé mais permettre de réactiver certains deals fermés au besoin
- ✅ Seuil "Remis à plus tard" (inbound) : 60 jours par défaut
- ✅ Cadence "En Suivi" (outbound) : 48h
- ✅ Cadence "Email" (outbound, préférence écrite) : 1x/semaine
- ✅ Paliers "Ghosting" : 0-30j normal / 30-60j relance légère / 60-90j courriel de rupture / 90j+ fermeture suggérée
- ✅ Boutons d'action : "Ouvrir dans HubSpot" = vrai lien; "Appeler" = vrai lien `tel:` intercepté par l'extension Aircall
- ✅ "Bouge pas" (toutes pipelines) : compteur permanent, pas de fréquence forcée; fermeture semi-automatique avec confirmation du rep

## 4.1 Google Sheet complémentaire — Pipeline vendeur

URL : `docs.google.com/spreadsheets/d/1-TicSgs0Ds6-_6DOZ1m-7Bm2LVCM5eqNcFoe4-lJZBI` (onglet "Pipeline vendeur - juil '26")

Ce sheet est tenu manuellement par les reps et contient des données **plus précises que HubSpot** sur la probabilité de closing :
- Colonnes clés : `Valeur du deal $CAD`, `Taux de chance de closé` (%), `Probabilité de closé d'ici 3 mois`, `Prob. mois en cours`, `Note` (qualitative), `Date Suivi`
- Structure : deals groupés par nom de rep (section header), avec une sous-section "Remis à plus tard" par rep
- ⚠️ Le groupement par rep dans le sheet ne correspond pas toujours en temps réel au `hubspot_owner_id` actuel dans HubSpot (déjà observé : un deal listé sous un autre rep appartient maintenant à Slim dans HubSpot) — à réconcilier lors de l'implémentation (par ex. faire confiance à HubSpot comme source de vérité pour l'ownership, et au sheet seulement pour le % de closing et les notes)

## 4.2 Priorité globale du coach (ordre de traitement de haut en bas)

1. **Deals qu'on est en train de fermer** — tout deal avec `Taux de chance de closé` ≥ 40% dans le sheet (peu importe la pipeline HubSpot). Afficher le %, la note qualitative, et la date de suivi directement depuis le sheet.
2. **Pipeline d'entrée (inbound) — 4 premiers stages** : SQL à contacter → 1er suivi 📞 → 2e suivi 📞 → 3e suivi et + 📞. Déclencheur : `notes_last_contacted` > **48h**, peu importe combien de temps le lead est dans le stage — pas seulement les nouveaux.
   - Constat terrain (8 juillet 2026) : **~20 des 39 deals de Slim en "3e suivi et+" dépassent déjà les 48h**, certains depuis le 13 mai. Le stage "2e suivi" (3 deals) est à jour.
3. **No Show (outbound)** — même règle des 48h sans contact. Constat terrain : les 5 deals actuels sont tous à jour (contactés aujourd'hui) — rien à signaler pour Slim en ce moment.
4. **RV planifié / RDV Planifié sans mise à jour post-rencontre** (inbound ET outbound) — si la date de la rencontre (`closedate`) est passée et le deal est toujours dans un stage "planifié", il faut le flagger pour mise à jour (a eu lieu ? no-show ? reporté ?). Exemple réel trouvé : Stéphane Marcil (`closedate` du 2 juillet dépassée, toujours en "RV planifié" au 8 juillet).
5. **Remis à plus tard + Bouge pas + Tâches en retard** (nettoyage, toutes pipelines) — priorité basse, regroupe :
   - Les leads à rappeler dans le futur ou inactifs (logique déjà définie en sections 3.1)
   - **Toute tâche HubSpot avec `hs_task_is_overdue = true`** assignée au rep — constat terrain : **152 tâches en retard pour Slim**, majoritairement des appels de suivi en priorité HIGH
6. **Pipeline outbound (général)** — En Suivi / Email, cadence normale (48h / 1x semaine)

## 6. Architecture technique (décisions)

- ✅ **Lecture HubSpot** : appels directs à l'API à chaque chargement de page (pas de synchronisation périodique pour l'instant) — filtré par `hubspot_owner_id` et `hs_is_closed=false`, ce qui garde le volume par chargement raisonnable. À revisiter si le déploiement s'étend à toute l'équipe et que la performance devient un enjeu.
- ✅ **Lecture Google Sheet** : API Google Sheets directe — le sheet "Pipeline vendeur" reste la source de vérité pour le % de closing, les notes, et les dates de suivi. Implique une authentification Google en plus de HubSpot.
- ✅ **Déploiement initial** : solo (Slim uniquement). Le filtrage par rep reste dans le design (bascule "Mes deals / Toute l'équipe" déjà dans le mockup) pour faciliter l'ouverture à l'équipe plus tard sans refonte.
- 🔲 **Base de données** : Supabase pressenti (déjà connecté au compte pour ce projet, mentionné dans une session antérieure) — rôle à préciser : probablement pour l'authentification et pour stocker l'état propre à l'app qui n'existe ni dans HubSpot ni dans le Sheet (ex: confirmations de fermeture "Bouge pas", préférences d'affichage).
- 🔲 **Intégration dans le codebase existant** : ce module devient un nouvel onglet dans le dashboard de prep de rencontres déjà en cours de construction (React + Supabase) — reste à voir comment brancher proprement les nouveaux appels HubSpot/Sheets à cette base de code.

## 7. Prochaines étapes (mise à jour)

- [ ] Réconcilier l'ownership du Google Sheet avec `hubspot_owner_id` (source de vérité)
- [ ] Décider si les 152 tâches en retard doivent toutes remonter individuellement ou seulement en résumé chiffré avec accès au détail
- [ ] Formule exacte de pondération "Négo en cours" (urgence temporelle × proximité closing × probabilité de vente) — maintenant en partie remplacée par le % du sheet pour les deals qui y figurent
- [ ] Préciser le rôle de Supabase (auth seulement, ou aussi stockage d'état applicatif)
- [ ] Commencer l'implémentation réelle (React + appels API HubSpot/Sheets en direct) à partir du mockup approuvé

## 8. Fireflies (connecté)

Le connecteur Fireflies est maintenant autorisé. Confirmé fonctionnel via `fireflies_get_transcripts` (recherche par mot-clé, filtrable par participant/organisateur/date). Pour les deals "Sur le point de signer", les insights affichés viennent maintenant de vraies transcriptions :
- **Jessika Fortin** — séance du 2 juillet (68 min) : le vrai point de friction est la validation du budget publicitaire avec Liam, pas un désintérêt pour l'offre
- **JF Larocque** — séance du 3 juin (45 min) : attend la mise en ligne de son nouveau site (2-3 semaines) pour synchroniser le lancement des campagnes

Prochaine étape technique : automatiser le matching deal ↔ transcript (actuellement fait par recherche du nom du contact) — voir si HubSpot a déjà un lien Fireflies enregistré par deal (mentionné par l'utilisateur au début de cette discussion) pour éviter la recherche par mot-clé à chaque fois.
