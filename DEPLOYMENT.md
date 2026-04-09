# SIMBHA Simulator - Deployment Guide

## Deploy to GitHub Pages

Follow these steps to deploy your app to GitHub Pages:

### Step 1: Create a GitHub Repository
1. Go to [github.com/new](https://github.com/new)
2. Create a new repository named `simbha-simulator` (or your preferred name)
3. **Important**: Choose "Public" so it can be hosted on GitHub Pages
4. Do NOT initialize with README, .gitignore, or license (you already have files)

### Step 2: Push Code to GitHub
```bash
cd "e:\Simbha simulator"

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Simbha Simulator"

# Add remote (replace USERNAME with your GitHub username)
git remote add origin https://github.com/USERNAME/simbha-simulator.git

# Push to main branch
git branch -M main
git push -u origin main
```

### Step 3: Enable GitHub Pages
1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under "Build and deployment":
   - **Source**: Select "GitHub Actions"
   - The deploy workflow will run automatically on every push

### Step 4: Configure the Base URL (if needed)
If your repository name is NOT `simbha-simulator`, update the base URL:

**Option A: Via environment variable (automatic)**
- The GitHub Actions workflow automatically uses your repo name ✓

**Option B: Manual configuration**
- Edit `vite.config.ts` line 9:
```typescript
const repoName = 'your-repo-name'; // Change this
```

### Step 5: Wait for Deployment
1. After pushing, go to your repo's **Actions** tab
2. Wait for the "Deploy to GitHub Pages" workflow to complete
3. It usually takes 1-2 minutes

### Step 6: View Your App
Your app will be live at:
```
https://USERNAME.github.io/simbha-simulator/
```
(Replace USERNAME with your GitHub username and simbha-simulator with your repo name)

---

## Local Build & Testing

To test the build locally before pushing:

```bash
# Build for production
npm run build

# Preview the production build
npm run preview
```

The `dist` folder contains the production files that get deployed.

## Important Notes

### Environment Variables
- The app **requires** `GEMINI_API_KEY` for AI features
- For GitHub Pages, use **GitHub Secrets**:
  1. Go to Settings → Secrets and variables → Actions
  2. Click "New repository secret"
  3. Add `GEMINI_API_KEY` with your key
  4. Update `.github/workflows/deploy.yml` to include:
     ```yaml
     env:
       GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
     ```

### Without API Key
- The app will work, but AI Advisor and Stock Entry Analyzer features will be disabled
- You can still use the Portfolio Simulator

## Troubleshooting

**White blank page after deployment?**
- Check the browser console (F12) for errors
- Verify the base path in vite.config.ts matches your repo name
- Clear browser cache and hard refresh (Ctrl+Shift+R)

**Build fails on GitHub?**
- Check the Actions tab to see error logs
- Make sure `node_modules` is not committed
- Verify `.gitignore` contains `node_modules`

**404 errors on assets?**
- The base path is likely wrong
- Edit vite.config.ts and update the `repoName` variable
- Rebuild and push

---

## Local Development

While developing, use:
```bash
npm run dev
```
This runs on `http://localhost:3000` with hot reload enabled.
