# ⬡ Gear Checklist

Uitrustingschecklist met categorieën, opties, aanbieders, budgetbeheer en AI-beschrijvingen.

## Lokaal draaien

```bash
npm install
npm run dev
```

## Deployen naar GitHub Pages

1. Maak een repository op GitHub (bijv. `gear-checklist`)
2. Pas `base` aan in `vite.config.js` naar je repo-naam: `'/gear-checklist/'`
3. Push de code:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/JOUW-USERNAME/gear-checklist.git
git branch -M main
git push -u origin main
```

4. Ga naar **Settings → Pages → Source** en kies **GitHub Actions**
5. De workflow bouwt en deployt automatisch bij elke push naar `main`

## AI Beschrijvingen

De AI-functie gebruikt de Anthropic API. Op de gehoste versie:
- Klik op **⋮ → API Key** om je Anthropic API key in te stellen
- De key wordt lokaal opgeslagen in je browser (localStorage)
