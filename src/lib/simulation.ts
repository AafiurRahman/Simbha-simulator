export interface AssetParams {
  id: string;
  name: string;
  initialPrice: number;
  drift: number;
  volatility: number;
  color: string;
}

export interface MultiSimulationParams {
  assets: AssetParams[];
  correlations: number[][]; // Symmetric matrix
  timeHorizon: number;
  numSimulations: number;
  stepsPerDay: number;
}

export interface AssetSimulationResult {
  assetId: string;
  paths: number[][];
  meanPath: number[];
  finalPrices: number[];
  stats: {
    mean: number;
    median: number;
    stdDev: number;
    var95: number;
    var99: number;
    min: number;
    max: number;
    annReturn: number;
    annVol: number;
    sharpe: number;
    sortino: number;
    beta: number;
  };
}

export interface MultiSimulationResult {
  results: AssetSimulationResult[];
  days: number[];
  portfolioPaths: number[][]; // Equally weighted for now
  portfolioMeanPath: number[];
  portfolioStats: {
    mean: number;
    var95: number;
    var99: number;
    annReturn: number;
    annVol: number;
    sharpe: number;
    sortino: number;
    beta: number;
  };
}

/**
 * Cholesky Decomposition for generating correlated random variables
 */
function cholesky(matrix: number[][]): number[][] {
  const n = matrix.length;
  const L: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) {
        sum += L[i][k] * L[j][k];
      }

      if (i === j) {
        L[i][j] = Math.sqrt(Math.max(0, matrix[i][i] - sum));
      } else {
        L[i][j] = (1.0 / L[j][j]) * (matrix[i][j] - sum);
      }
    }
  }
  return L;
}

export function runMultiMonteCarlo(params: MultiSimulationParams): MultiSimulationResult {
  const { assets, correlations, timeHorizon, numSimulations, stepsPerDay } = params;
  const n = assets.length;
  const dt = 1 / (252 * stepsPerDay);
  const totalSteps = timeHorizon * stepsPerDay;
  
  const L = cholesky(correlations);
  
  const results: AssetSimulationResult[] = assets.map(asset => ({
    assetId: asset.id,
    paths: Array.from({ length: numSimulations }, () => [asset.initialPrice]),
    meanPath: [],
    finalPrices: [],
    stats: { mean: 0, median: 0, stdDev: 0, var95: 0, var99: 0, min: 0, max: 0, annReturn: 0, annVol: 0, sharpe: 0, sortino: 0, beta: 0 }
  }));

  const days: number[] = Array.from({ length: totalSteps + 1 }, (_, i) => i / stepsPerDay);

  for (let s = 0; s < numSimulations; s++) {
    for (let t = 1; t <= totalSteps; t++) {
      // Generate n independent normal variables
      const z_indep = Array.from({ length: n }, () => {
        const u1 = Math.random();
        const u2 = Math.random();
        return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      });

      // Transform to correlated normal variables: Z = L * z_indep
      const z_corr = Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
          z_corr[i] += L[i][j] * z_indep[j];
        }
      }

      // Update each asset price
      for (let i = 0; i < n; i++) {
        const asset = assets[i];
        const driftTerm = (asset.drift - 0.5 * asset.volatility ** 2) * dt;
        const diffusionTerm = asset.volatility * Math.sqrt(dt) * z_corr[i];
        const prevPrice = results[i].paths[s][t - 1];
        results[i].paths[s].push(prevPrice * Math.exp(driftTerm + diffusionTerm));
      }
    }
  }

  const RFR = 0.02; // 2% Risk Free Rate
  const w = 1 / n;

  // Calculate Portfolio Variance for Beta
  let portVar = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      portVar += w * w * correlations[i][j] * assets[i].volatility * assets[j].volatility;
    }
  }
  const portAnnVol = Math.sqrt(portVar);

  // Calculate stats for each asset
  results.forEach((res, i) => {
    const finalPrices = res.paths.map(path => path[path.length - 1]).sort((a, b) => a - b);
    const mean = finalPrices.reduce((a, b) => a + b, 0) / numSimulations;
    const median = finalPrices[Math.floor(numSimulations / 2)];
    const variance = finalPrices.reduce((a, b) => a + (b - mean) ** 2, 0) / numSimulations;
    
    const meanPath = Array(totalSteps + 1).fill(0);
    for (let t = 0; t <= totalSteps; t++) {
      let sum = 0;
      for (let s = 0; s < numSimulations; s++) {
        sum += res.paths[s][t];
      }
      meanPath[t] = sum / numSimulations;
    }

    // New Metrics
    let cov_i_p = 0;
    for (let j = 0; j < n; j++) {
      cov_i_p += w * correlations[i][j] * assets[i].volatility * assets[j].volatility;
    }
    const beta = portVar > 0 ? cov_i_p / portVar : 1;

    const ret = (mean / assets[i].initialPrice) - 1;
    const annReturn = Math.pow(1 + Math.max(ret, -0.999), 252 / timeHorizon) - 1;
    const annVol = (Math.sqrt(variance) / assets[i].initialPrice) * Math.sqrt(252 / timeHorizon);
    const sharpe = annVol > 0 ? (annReturn - RFR) / annVol : 0;

    const targetPrice = assets[i].initialPrice * (1 + RFR * (timeHorizon / 252));
    const downsidePrices = finalPrices.filter(p => p < targetPrice);
    let downsideVar = 0;
    if (downsidePrices.length > 0) {
      downsideVar = downsidePrices.reduce((sum, p) => sum + Math.pow(targetPrice - p, 2), 0) / numSimulations;
    }
    const annDownsideVol = (Math.sqrt(downsideVar) / assets[i].initialPrice) * Math.sqrt(252 / timeHorizon);
    const sortino = annDownsideVol > 0 ? (annReturn - RFR) / annDownsideVol : sharpe * 2;

    res.meanPath = meanPath;
    res.finalPrices = finalPrices;
    res.stats = {
      mean,
      median,
      stdDev: Math.sqrt(variance),
      var95: assets[i].initialPrice - finalPrices[Math.floor(numSimulations * 0.05)],
      var99: assets[i].initialPrice - finalPrices[Math.floor(numSimulations * 0.01)],
      min: finalPrices[0],
      max: finalPrices[numSimulations - 1],
      annReturn,
      annVol,
      sharpe,
      sortino,
      beta
    };
  });

  // Portfolio paths (equally weighted normalized returns)
  const portfolioPaths: number[][] = Array.from({ length: numSimulations }, () => [100]);
  for (let s = 0; s < numSimulations; s++) {
    for (let t = 1; t <= totalSteps; t++) {
      let dailyReturn = 0;
      for (let i = 0; i < n; i++) {
        const p_t = results[i].paths[s][t];
        const p_prev = results[i].paths[s][t - 1];
        dailyReturn += (p_t / p_prev - 1) / n;
      }
      portfolioPaths[s].push(portfolioPaths[s][t - 1] * (1 + dailyReturn));
    }
  }

  const portfolioMeanPath: number[] = Array(totalSteps + 1).fill(0);
  for (let t = 0; t <= totalSteps; t++) {
    let sum = 0;
    for (let s = 0; s < numSimulations; s++) {
      sum += portfolioPaths[s][t];
    }
    portfolioMeanPath[t] = sum / numSimulations;
  }

  // Calculate portfolio stats
  const portfolioFinalValues = portfolioPaths.map(path => path[path.length - 1]).sort((a, b) => a - b);
  const portMean = portfolioFinalValues.reduce((a, b) => a + b, 0) / numSimulations;
  
  const portRet = (portMean / 100) - 1;
  const portAnnReturn = Math.pow(1 + Math.max(portRet, -0.999), 252 / timeHorizon) - 1;
  const portSharpe = portAnnVol > 0 ? (portAnnReturn - RFR) / portAnnVol : 0;

  const portTarget = 100 * (1 + RFR * (timeHorizon / 252));
  const portDownside = portfolioFinalValues.filter(p => p < portTarget);
  let portDownsideVar = 0;
  if (portDownside.length > 0) {
    portDownsideVar = portDownside.reduce((sum, p) => sum + Math.pow(portTarget - p, 2), 0) / numSimulations;
  }
  const portAnnDownsideVol = (Math.sqrt(portDownsideVar) / 100) * Math.sqrt(252 / timeHorizon);
  const portSortino = portAnnDownsideVol > 0 ? (portAnnReturn - RFR) / portAnnDownsideVol : portSharpe * 2;

  const portfolioStats = {
    mean: portMean,
    var95: 100 - portfolioFinalValues[Math.floor(numSimulations * 0.05)],
    var99: 100 - portfolioFinalValues[Math.floor(numSimulations * 0.01)],
    annReturn: portAnnReturn,
    annVol: portAnnVol,
    sharpe: portSharpe,
    sortino: portSortino,
    beta: 1.0
  };

  return { results, days, portfolioPaths, portfolioMeanPath, portfolioStats };
}
