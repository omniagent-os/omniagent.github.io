# Corrections appliquées — OmniAgent Synergy OS (round 2)

Ce patch corrige les bugs trouvés après l'analyse complète du dépôt
[`omniagent-os/omniagent.github.io`](https://github.com/omniagent-os/omniagent.github.io)
et de son déploiement sur GitHub Pages.

## 🐛 Bugs identifiés et corrigés

### 1. `src/lib/keyValidator.ts` — regex cassée (bug critique)

L'expression régulière chargée d'extraire les clés depuis le README de
`free-llm-api-keys` avait perdu **tous** ses anti-slashs :

```js
// AVANT (cassé) — interprété comme une alternance vide
const rowRegex = /|s*`(sk-[A-Za-z0-9]+)`s*|s*([^|]+)|s*[^|]+|.../g;
```

Résultat : `fetchFreeLLMKeys()` renvoyait toujours `[]`, donc l'écran
"Charger les clés gratuites depuis GitHub" ne montrait jamais rien.

✅ Réécrit en parseur ligne-par-ligne robuste qui tolère les variations
de colonnes du README.

### 2. `src/pages/ApiKeys.tsx` — page jamais routée + indentation cassée

La page existait dans le code source mais n'était **pas enregistrée**
dans `src/App.tsx`, donc inaccessible. De plus, tout le fichier était
indenté de 2 espaces de trop, ce qui ne posait pas de problème
fonctionnel mais cassait la lisibilité.

✅ Indentation nettoyée + route `/api-keys` ajoutée + lien dans la barre
latérale (`AppLayout.tsx`).

### 3. `src/pages/Settings.tsx` — fournisseurs non gérés dans le bouton "Test"

Le bouton "Test" ne savait pas comment appeler `cerebras`, `pekpik`,
`xai` ou `kimi` (il jetait silencieusement). Les descriptions
`PROVIDER_DESCRIPTIONS` étaient également incomplètes.

✅ Routage du test vers `PEKPIK_BASE_URL` pour `pekpik` / `xai` / `kimi`,
endpoint Cerebras ajouté, descriptions complètes pour tous les providers.

### 4. `src/lib/synergyEngine.ts` — `synthesisProvider` ignoré

Le réglage "Synthesis Model" du panneau Settings n'avait aucun effet :
`processSynergy` choisissait toujours Groq → Cerebras → … sans
considérer la préférence utilisateur.

✅ Nouveau paramètre `options.synthesisProviderId` honoré quand le
provider correspondant a réussi sa réponse, fallback sur l'ordre
de robustesse sinon. La page Chat passe maintenant
`settings.synthesisProvider`.

### 5. `src/lib/synergyEngine.ts` — `data.choices[0]` non protégé

Plusieurs accès directs à `data.choices[0].message.content` plantaient
si l'API renvoyait un objet inattendu (provoquant l'erreur "Cannot read
properties of undefined").

✅ Tous les accès passent par `?.` avec un fallback chaîne vide.

### 6. `src/components/AppLayout.tsx` — sidebar visible sur la page Share

La page Share est conçue pour être autonome (lien partageable). Or la
sidebar s'affichait quand même, ce qui rendait le partage moche.
La détection de l'onglet actif pour `/chat/:id` ne fonctionnait pas
non plus (le `Synergy Chat` ne s'illuminait que sur `/chat` exact).

✅ Layout sans sidebar quand le path commence par `/share`. Détection
d'onglet active corrigée (`/chat/:id` matche bien `/chat`).

### 7. `src/App.tsx` — petit refactor robustesse

`import.meta.env.BASE_URL` peut être `undefined` dans certains
environnements de test ; ajouté un fallback `?? "/"` avant le
`replace(/\/$/, "")`.

### 8. `public/favicon.svg` — favicon générique

L'ancien favicon était un simple rectangle orange uni avec un saut
de ligne en tête de fichier (parsing SVG strict en échec dans certains
navigateurs).

✅ Remplacé par un favicon dégradé violet→bleu cohérent avec
l'identité visuelle "Synergy OS" (cercle blanc central). Aucun saut de
ligne parasite.

## 📦 Fichiers modifiés

| Fichier | Type |
| --- | --- |
| `src/lib/keyValidator.ts` | Réécriture (regex cassée) |
| `src/lib/synergyEngine.ts` | Honor synthesisProvider + accès safe |
| `src/pages/ApiKeys.tsx` | Indentation + nettoyage |
| `src/pages/Settings.tsx` | Test multi-provider + descriptions |
| `src/pages/Chat.tsx` | Passe synthesisProvider au moteur |
| `src/components/AppLayout.tsx` | Lien API Keys + bypass sidebar Share |
| `src/App.tsx` | Route `/api-keys` + fallback BASE_URL |
| `public/favicon.svg` | Nouveau favicon, sans BOM |

## 🚀 Pour appliquer

1. Décompresser `omniagent-fixes.zip` à la racine du repo (les chemins
   sont préservés).
2. `git status` puis `git add -A && git commit -m "fix: round 2 bug fixes"`.
3. `git push` — le workflow GitHub Pages reconstruit et redéploie.

## 🧪 Vérification

```bash
npm install
npm run typecheck   # 0 erreur attendu
npm run build       # build clean
npm run preview     # http://localhost:5000/omniagent.github.io/
```

- Le bouton "Charger les clés gratuites depuis GitHub" doit maintenant
  remplir le tiroir avec des dizaines de clés `sk-…`.
- Le menu de gauche doit afficher 5 entrées (Overview / Synergy Chat /
  History / API Keys / Settings).
- La page `/share#…` doit s'afficher en plein écran sans la sidebar.
- Le bouton "Test" sur Cerebras / FreeLLM Hub / xAI / Kimi doit
  retourner OK quand la clé est valide.
