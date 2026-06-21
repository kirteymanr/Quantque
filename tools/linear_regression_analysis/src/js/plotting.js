// plotting.js

const baseLayout = {
    font: {
        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    },
    plot_bgcolor: '#ffffff',
    paper_bgcolor: '#ffffff',
    margin: { t: 40, r: 20, b: 40, l: 60 },
    showlegend: true,
    legend: {
        x: 0,
        y: 1.1,
        orientation: 'h',
        bgcolor: 'rgba(255,255,255,0.8)'
    }
};

const baseConfig = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d', 'hoverCompareCartesian'],
    toImageButtonOptions: {
        format: 'svg', 
        filename: 'regression_plot'
    }
};

/**
 * Draws the scatter plot matching the dashboard style.
 */
export function drawScatterPlot(xData, yData, metrics, xLabel = 'X', yLabel = 'Y', showRegLine = true, showConfInt = false, showPredInt = false, confLevel = 0.95) {
    const plotDiv = document.getElementById('scatter-plot');

    const traces = [];

    // 1. Scatter trace
    traces.push({
        x: xData,
        y: yData,
        mode: 'markers',
        type: 'scatter',
        name: 'Observed Data',
        marker: { size: 6, color: '#0044cc', opacity: 0.8 } // Match dashboard blue
    });

    // Min and Max for lines
    const minX = Math.min(...xData);
    const maxX = Math.max(...xData);
    const range = maxX - minX;
    
    // Generate line points
    const lineX = [];
    for (let i = 0; i <= 100; i++) {
        lineX.push(minX + (range * (i / 100)));
    }
    const lineY = lineX.map(x => metrics.lineFunction(x));

    // 2. Regression Line
    if (showRegLine) {
        traces.push({
            x: [minX, maxX],
            y: [metrics.lineFunction(minX), metrics.lineFunction(maxX)],
            mode: 'lines',
            type: 'scatter',
            name: 'Regression Line',
            line: { color: '#ff0000', width: 2 } // Match dashboard red
        });
    }

    // Calculate Intervals if requested
    if (showConfInt || showPredInt) {
        const dfRes = metrics.summary.observations - 2;
        const tCrit = jStat.studentt.inv(1 - (1 - confLevel) / 2, dfRes);
        const se = metrics.summary.standardError;
        const n = metrics.summary.observations;
        const meanX = metrics.summary.meanX;
        const ssxx = metrics.summary.ssxx;

        const confLower = [];
        const confUpper = [];
        const predLower = [];
        const predUpper = [];

        lineX.forEach(x => {
            const yHat = metrics.lineFunction(x);
            // Margin of error for mean (confidence interval)
            const moMean = tCrit * se * Math.sqrt((1/n) + (Math.pow(x - meanX, 2) / ssxx));
            // Margin of error for individual observation (prediction interval)
            const moPred = tCrit * se * Math.sqrt(1 + (1/n) + (Math.pow(x - meanX, 2) / ssxx));

            confLower.push(yHat - moMean);
            confUpper.push(yHat + moMean);
            predLower.push(yHat - moPred);
            predUpper.push(yHat + moPred);
        });

        if (showConfInt) {
            traces.push({ x: lineX, y: confLower, mode: 'lines', line: { dash: 'dot', color: '#888', width: 1 }, name: 'Lower CI', showlegend: false });
            traces.push({ x: lineX, y: confUpper, mode: 'lines', line: { dash: 'dot', color: '#888', width: 1 }, name: 'Upper CI', fill: 'tonexty', fillcolor: 'rgba(0,0,0,0.05)', showlegend: false });
        }

        if (showPredInt) {
            traces.push({ x: lineX, y: predLower, mode: 'lines', line: { dash: 'dash', color: '#ff9999', width: 1 }, name: 'Lower PI', showlegend: false });
            traces.push({ x: lineX, y: predUpper, mode: 'lines', line: { dash: 'dash', color: '#ff9999', width: 1 }, name: 'Upper PI', fill: 'tonexty', fillcolor: 'rgba(255,0,0,0.05)', showlegend: false });
        }
    }

    const layout = {
        ...baseLayout,
        title: `${yLabel} vs ${xLabel}`,
        xaxis: { 
            title: xLabel, 
            showgrid: true, 
            gridcolor: '#e2e8f0', 
            gridwidth: 1,
            zeroline: false,
            gridpattern: 'independent' // looks like dotted/dashed in dashboard
        },
        yaxis: { 
            title: yLabel, 
            showgrid: true, 
            gridcolor: '#e2e8f0', 
            gridwidth: 1,
            zeroline: false 
        }
    };

    Plotly.newPlot(plotDiv, traces, layout, baseConfig);
}

/**
 * Draws the residuals plot (Residuals vs X).
 */
export function drawResidualsPlot(xData, residuals, xLabel = 'X') {
    const plotDiv = document.getElementById('residuals-plot');
    
    const traces = [{
        x: xData,
        y: residuals,
        mode: 'markers',
        type: 'scatter',
        name: 'Residuals',
        marker: { size: 6, color: '#ff9900', opacity: 0.8 }
    }];
    
    const layout = {
        ...baseLayout,
        title: `Residuals vs ${xLabel}`,
        xaxis: { 
            title: xLabel, 
            showgrid: true, 
            gridcolor: '#e2e8f0', 
            gridwidth: 1,
            zeroline: false 
        },
        yaxis: { 
            title: 'Residuals', 
            showgrid: true, 
            gridcolor: '#e2e8f0', 
            gridwidth: 1,
            zeroline: true, 
            zerolinecolor: '#000000', 
            zerolinewidth: 1 
        }
    };
    
    const config = {
        ...baseConfig,
        toImageButtonOptions: {
            format: 'svg', 
            filename: 'residuals_plot'
        }
    };

    Plotly.newPlot(plotDiv, traces, layout, config);
}
