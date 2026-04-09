# SIMBHA Simulator - Advanced Portfolio Risk Engine

A real-time Monte Carlo simulation tool for portfolio analysis, risk assessment, and AI-powered investment advice.

## Features

- **Portfolio Simulator**: Run multi-asset Monte Carlo simulations with customizable parameters
- **Risk Analytics**: Calculate Sharpe ratio, Sortino ratio, beta, and other metrics
- **Correlation Matrix**: Visualize and adjust asset correlations
- **AI Advisor**: Get portfolio recommendations powered by Gemini AI
- **Stock Entry Analysis**: Get AI-driven valuation and entry point analysis
- **Dark Mode**: Beautiful dark/light theme toggle
- **Data Export**: Download simulation results as CSV

## Quick Start

### Local Development

Prerequisites: Node.js 18+

```bash
# Install dependencies
npm install

# Set your Gemini API key (optional, for AI features)
# Edit .env and add: GEMINI_API_KEY=your_key_here

# Run development server
npm run dev
```

App runs at `http://localhost:3000`

**Login Credentials:**
- Username: `Aafiurrahmanbarek`
- Password: `895811`

### Deploy to GitHub Pages

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete GitHub Pages deployment instructions.

Quick steps:
1. Create a public GitHub repo
2. Push your code
3. GitHub Actions will automatically build and deploy
4. Your app will be live at `https://username.github.io/simbha-simulator/`

## Environment Setup

Create a `.env` file in the project root:

```env
# Your Gemini API key (get from https://ai.google.dev/)
GEMINI_API_KEY=your_key_here

# App URL
APP_URL=http://localhost:3000
```

## Build for Production

```bash
# Build
npm run build

# Preview build locally
npm run preview
```

Build output goes to `dist/` folder.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Simulation**: Custom Monte Carlo engine
- **Charts**: Recharts
- **UI**: Lucide React icons, Framer Motion
- **Build**: Vite
- **AI**: Google Gemini 3 Flash API
- **Styling**: Tailwind CSS 4 with custom variants

## Project Structure

```
src/
├── App.tsx              # Main app component
├── main.tsx             # Entry point
├── index.css            # Global styles
├── lib/
│   ├── simulation.ts    # Monte Carlo engine
│   └── utils.ts         # Utility functions
└── services/
    └── geminiService.ts # Gemini AI integration
```

## License

Apache-2.0

