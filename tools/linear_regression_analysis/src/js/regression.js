// regression.js

/**
 * Calculates advanced linear regression metrics including ANOVA, t-stats, p-values.
 * @param {number[]} xData 
 * @param {number[]} yData 
 * @param {number} confLevel Confidence level (e.g., 0.95 for 95%)
 * @returns {object|null} Regression metrics
 */
export function calculateRegression(xData, yData, confLevel = 0.95) {
    if (!xData || !yData || xData.length !== yData.length || xData.length < 3) {
        return null; // Need at least 3 points for valid df_res
    }

    const n = xData.length;
    
    // Calculate Means
    const meanX = ss.mean(xData);
    const meanY = ss.mean(yData);

    // Sum of Squares
    let ssxx = 0;
    let ssyy = 0;
    let ssxy = 0;

    for (let i = 0; i < n; i++) {
        const dx = xData[i] - meanX;
        const dy = yData[i] - meanY;
        ssxx += dx * dx;
        ssyy += dy * dy;
        ssxy += dx * dy;
    }

    // Coefficients
    const slope = ssxy / ssxx;
    const intercept = meanY - slope * meanX;

    // Create line function
    const lineFunction = x => slope * x + intercept;

    // Calculate SS Regression and SS Residual
    let ssReg = 0;
    let ssRes = 0;
    const residuals = [];

    for (let i = 0; i < n; i++) {
        const yPred = lineFunction(xData[i]);
        const yObs = yData[i];
        
        ssReg += Math.pow(yPred - meanY, 2);
        
        const res = yObs - yPred;
        residuals.push(res);
        ssRes += Math.pow(res, 2);
    }

    const ssTot = ssyy; // Total Sum of Squares

    // Degrees of Freedom
    const dfReg = 1; // 1 independent variable
    const dfRes = n - 2;
    const dfTot = n - 1;

    // Mean Squares
    const msReg = ssReg / dfReg;
    const msRes = ssRes / dfRes;

    // F-Statistic
    const fStat = msReg / msRes;
    
    // Significance F (p-value for F-statistic)
    // For 1 predictor, F is t^2, we can calculate from jStat F-distribution
    const sigF = 1 - jStat.centralF.cdf(fStat, dfReg, dfRes);

    // Standard Error of Estimate
    const standardError = Math.sqrt(msRes);

    // R Squared and variations
    const rSquared = ssReg / ssTot;
    const multipleR = Math.sqrt(rSquared); // For simple linear, |r|
    const adjRSquared = 1 - (1 - rSquared) * ((n - 1) / (n - 2));

    // Standard Error of Coefficients
    const seSlope = standardError / Math.sqrt(ssxx);
    const seIntercept = standardError * Math.sqrt((1 / n) + (Math.pow(meanX, 2) / ssxx));

    // t-Statistics
    const tSlope = slope / seSlope;
    const tIntercept = intercept / seIntercept;

    // P-values for Coefficients (Two-tailed)
    const pSlope = 2 * (1 - jStat.studentt.cdf(Math.abs(tSlope), dfRes));
    const pIntercept = 2 * (1 - jStat.studentt.cdf(Math.abs(tIntercept), dfRes));

    // Confidence Intervals
    // alpha = 1 - confLevel (e.g., 0.05). two-tailed critical probability = 1 - alpha/2 = 0.975
    const tCrit = jStat.studentt.inv(1 - (1 - confLevel) / 2, dfRes);
    
    const slopeLower = slope - tCrit * seSlope;
    const slopeUpper = slope + tCrit * seSlope;
    
    const interceptLower = intercept - tCrit * seIntercept;
    const interceptUpper = intercept + tCrit * seIntercept;

    return {
        equation: `Ŷ = ${intercept.toLocaleString('en-US', {maximumFractionDigits:4})} ${slope >= 0 ? '+' : '-'} ${Math.abs(slope).toLocaleString('en-US', {maximumFractionDigits:4})}X`,
        lineFunction,
        residuals,
        summary: {
            multipleR,
            rSquared,
            adjRSquared,
            standardError,
            observations: n,
            meanX,
            ssxx
        },
        anova: {
            regression: { df: dfReg, ss: ssReg, ms: msReg, f: fStat, sigF: sigF },
            residual: { df: dfRes, ss: ssRes, ms: msRes },
            total: { df: dfTot, ss: ssTot }
        },
        coefficients: {
            intercept: {
                value: intercept,
                se: seIntercept,
                t: tIntercept,
                p: pIntercept,
                lower: interceptLower,
                upper: interceptUpper
            },
            slope: {
                value: slope,
                se: seSlope,
                t: tSlope,
                p: pSlope,
                lower: slopeLower,
                upper: slopeUpper
            }
        }
    };
}
