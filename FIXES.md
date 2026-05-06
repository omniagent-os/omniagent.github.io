# Corrections appliquées — OmniAgent Synergy OS

Ce document liste les corrections apportées au repo
`omniagent-os/omniagent.github.io` pour résoudre la **page blanche** sur
GitHub Pages et nettoyer la configuration de déploiement.

## 🔴 Cause racine de la page blanche

Le `index.html` à la racine du repo référence `/src/main.tsx`, qui est le
**fichier source TypeScript** de Vite. GitHub Pages sert le repo tel quel,
sans build, donc le navigateur tente de charger un module TypeScript qui
n'existe pas en tant que ressource statique → écran blanc, erreur dans la
console : *Failed to load module script*.

De plus :
- Aucun workflow GitHub Actions n'existait (le README l'annonçait pourtant).
- Le dossier `dist/` commité contenait `dist/public/index.html` (chemin imbriqué)
  avec des liens absolus `/assets/...` ne tenant pas compte du `base`
  `/omniagent.github.io/` → second cas de page blanche même si servi.
- Pas de `.nojekyll`, donc Jekyll pouvait filtrer certains fichiers.

## ✅ Fichiers corrigés / ajoutés

| Fichier | Action | Rôle |
|--------|--------|------|
| `.github/workflows/deploy.yml` | **Ajouté** | Build automatique via Vite avec `BASE_PATH=/omniagent.github.io/` puis déploiement vers GitHub Pages. |
| `index.html` | Corrigé | `href="%BASE_URL%favicon.svg"` (au lieu de `/favicon.svg`), bloc try/catch sur le SPA-redirect, `<noscript>` ajouté. |
| `vite.config.ts` | Corrigé | Ajout explicite de `publicDir`, commentaire sur `base`, `assetsDir: "assets"`, output **plat** vers `./dist` (plus de `dist/public/` imbriqué). |
| `public/404.html` | Corrigé | Détection automatique du `repoBase` à partir de l'URL au lieu d'un hardcode → fonctionne aussi si le repo est renommé. |
| `public/.nojekyll` | **Ajouté** | Empêche Jekyll de filtrer les fichiers/dossiers commençant par `_`. |
| `package.json` | Corrigé | Ajout de `typescript` en devDep, script `deploy:check`, version bumpée. |
| `.gitignore` | **Ajouté** | Exclut `dist/`, `node_modules/`, logs, `.env`, etc. |

## 🚀 Étapes côté GitHub à effectuer

1. Pousser ces fichiers sur la branche `main`.
2. **Supprimer** le dossier `dist/` du repo (il sera recréé par le workflow) :
   ```bash
   git rm -rf dist
   git commit -m "chore: drop committed build, deployed via Actions"
   ```
3. Aller dans **Settings → Pages → Build and deployment → Source = GitHub Actions**.
4. Le workflow se déclenche au premier push, puis à chaque push sur `main`.

## 🧪 Vérification locale

```bash
npm install
npm run typecheck
npm run build
npm run preview     # http://localhost:3000/omniagent.github.io/
```

Le `dist/index.html` final doit contenir des chemins du type :
```html
<script type="module" crossorigin src="/omniagent.github.io/assets/index-XXXX.js"></script>
```
…et plus jamais `/src/main.tsx`.
