// ui.js
import { createElement, clearElement } from './utils.js';
import { parseTSV, extractDataFromTable } from './data.js';

// --- Error Handling ---
export function showError(message) {
    const banner = document.getElementById('error-banner');
    if (banner) {
        banner.textContent = message;
        banner.style.display = 'flex';
    }
}

export function clearError() {
    const banner = document.getElementById('error-banner');
    if (banner) {
        banner.textContent = '';
        banner.style.display = 'none';
    }
}

// --- Number Formatting ---
function formatNumber(num, decimals = 4) {
    if (num === null || num === undefined || isNaN(num)) return '-';
    // If very small, use scientific notation
    if (Math.abs(num) < 0.0001 && num !== 0) return num.toExponential(2);
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// --- Variable Selectors ---
export function updateVariableSelectors(headers) {
    const xSelect = document.getElementById('x-var-select');
    const ySelect = document.getElementById('y-var-select');

    clearElement(xSelect);
    clearElement(ySelect);

    headers.forEach((header, index) => {
        const xOption = createElement('option', { value: index }, header || `Column ${index + 1}`);
        const yOption = createElement('option', { value: index }, header || `Column ${index + 1}`);
        xSelect.appendChild(xOption);
        ySelect.appendChild(yOption);
    });

    if (headers.length > 1) {
        ySelect.selectedIndex = 1;
    }
}

// --- Table Paste Logic ---
export function handleTablePaste(event) {
    event.preventDefault();
    const clipboardData = event.clipboardData || window.clipboardData;
    const pastedData = clipboardData.getData('Text');
    
    if (pastedData) {
        const parsedData = parseTSV(pastedData);
        renderTable(parsedData);
    }
}

export function renderTable(data) {
    const tableContainer = document.querySelector('.table-container');
    clearElement(tableContainer);

    if (!data || data.length === 0) return;

    const headers = data[0];
    const rows = data.slice(1);

    const theadChildren = headers.map(h => createElement('th', { contenteditable: "true" }, h));
    const thead = createElement('thead', {}, [createElement('tr', {}, theadChildren)]);

    const tbodyChildren = rows.map(row => {
        const tdChildren = row.map(cell => createElement('td', { contenteditable: "true" }, cell));
        return createElement('tr', {}, tdChildren);
    });
    
    if (tbodyChildren.length === 0) {
        const emptyCells = headers.map(() => createElement('td', { contenteditable: "true" }, ""));
        tbodyChildren.push(createElement('tr', {}, emptyCells));
    }

    const tbody = createElement('tbody', {}, tbodyChildren);
    const table = createElement('table', { id: "data-table", class: "data-table" }, [thead, tbody]);

    tableContainer.appendChild(table);
    updateVariableSelectors(headers);
}

// --- Live Table Behaviors ---

/**
 * Synchronizes dropdown selectors with current table headers.
 */
export function syncHeadersWithSelectors() {
    const table = document.getElementById('data-table');
    if (!table) return;
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    
    const xSelect = document.getElementById('x-var-select');
    const ySelect = document.getElementById('y-var-select');
    
    const currentX = xSelect.value;
    const currentY = ySelect.value;

    updateVariableSelectors(headers);

    // Try to restore previous selections if they still exist
    if (currentX < headers.length) xSelect.value = currentX;
    if (currentY < headers.length) ySelect.value = currentY;
}

/**
 * Validates if a string is numeric and updates UI.
 * @param {HTMLElement} cell 
 */
export function validateCellInput(cell) {
    const value = cell.textContent.trim();
    if (value === '' || !isNaN(Number(value))) {
        cell.classList.remove('invalid-input');
    } else {
        cell.classList.add('invalid-input');
    }
}

/**
 * Adds a new row if the target is in the last row of the table.
 * @param {HTMLElement} cell 
 */
export function handleAutoRowGrowth(cell) {
    const row = cell.closest('tr');
    const tbody = row.closest('tbody');
    if (!tbody) return;

    const isLastRow = row === tbody.lastElementChild;
    const hasValue = cell.textContent.trim() !== '';

    if (isLastRow && hasValue) {
        const colCount = row.children.length;
        const newCells = [];
        for (let i = 0; i < colCount; i++) {
            newCells.push(createElement('td', { contenteditable: "true" }, ""));
        }
        const newRow = createElement('tr', {}, newCells);
        tbody.appendChild(newRow);
    }
}

// --- File Input UI ---
export function updateFileInputUI(file) {
    const nameEl = document.getElementById('file-name-display');
    const metaEl = document.getElementById('file-meta-display');
    const tickEl = document.getElementById('file-success-tick');
    
    if (nameEl) nameEl.textContent = file.name;
    if (metaEl) metaEl.textContent = "Loading data...";
    if (tickEl) tickEl.style.display = 'none';
}

/**
 * Updates the file meta with rows/cols and shows the success tick.
 */
export function updateFileStatusUI(rowCount, colCount) {
    const metaEl = document.getElementById('file-meta-display');
    const tickEl = document.getElementById('file-success-tick');
    
    if (metaEl) {
        metaEl.textContent = `(${rowCount} rows × ${colCount} columns)`;
    }
    if (tickEl) {
        tickEl.style.display = 'block';
    }
}

// --- Displaying Metrics (Dashboard Wiring) ---
export function displayMetrics(metrics, xLabel, yLabel) {
    if (!metrics) {
        showError('Invalid regression data.');
        return;
    }

    // 4. Equation
    document.getElementById('eq-display').innerHTML = `Ŷ = ${formatNumber(metrics.coefficients.intercept.value, 2)} ${metrics.coefficients.slope.value >= 0 ? '+' : '-'} ${formatNumber(Math.abs(metrics.coefficients.slope.value), 2)}X`;

    // 5. Model Summary
    document.getElementById('val-multi-r').textContent = formatNumber(metrics.summary.multipleR);
    document.getElementById('val-r2').textContent = formatNumber(metrics.summary.rSquared);
    document.getElementById('val-adj-r2').textContent = formatNumber(metrics.summary.adjRSquared);
    document.getElementById('val-std-err').textContent = formatNumber(metrics.summary.standardError);
    document.getElementById('val-obs').textContent = metrics.summary.observations;

    // 6. ANOVA
    document.getElementById('anova-reg-df').textContent = metrics.anova.regression.df;
    document.getElementById('anova-reg-ss').textContent = formatNumber(metrics.anova.regression.ss, 2); // often large, use 2
    document.getElementById('anova-reg-ms').textContent = formatNumber(metrics.anova.regression.ms, 2);
    document.getElementById('anova-f').textContent = formatNumber(metrics.anova.regression.f, 2);
    document.getElementById('anova-sig-f').textContent = formatNumber(metrics.anova.regression.sigF);

    document.getElementById('anova-res-df').textContent = metrics.anova.residual.df;
    document.getElementById('anova-res-ss').textContent = formatNumber(metrics.anova.residual.ss, 2);
    document.getElementById('anova-res-ms').textContent = formatNumber(metrics.anova.residual.ms, 2);

    document.getElementById('anova-tot-df').textContent = metrics.anova.total.df;
    document.getElementById('anova-tot-ss').textContent = formatNumber(metrics.anova.total.ss, 2);

    // 7. Coefficients
    document.getElementById('coef-int-val').textContent = formatNumber(metrics.coefficients.intercept.value, 2);
    document.getElementById('coef-int-se').textContent = formatNumber(metrics.coefficients.intercept.se, 2);
    document.getElementById('coef-int-t').textContent = formatNumber(metrics.coefficients.intercept.t, 2);
    document.getElementById('coef-int-p').textContent = formatNumber(metrics.coefficients.intercept.p);
    document.getElementById('coef-int-low').textContent = formatNumber(metrics.coefficients.intercept.lower, 2);
    document.getElementById('coef-int-up').textContent = formatNumber(metrics.coefficients.intercept.upper, 2);

    document.getElementById('coef-x-name').textContent = xLabel;
    document.getElementById('coef-x-val').textContent = formatNumber(metrics.coefficients.slope.value, 2);
    document.getElementById('coef-x-se').textContent = formatNumber(metrics.coefficients.slope.se, 2);
    document.getElementById('coef-x-t').textContent = formatNumber(metrics.coefficients.slope.t, 2);
    document.getElementById('coef-x-p').textContent = formatNumber(metrics.coefficients.slope.p);
    document.getElementById('coef-x-low').textContent = formatNumber(metrics.coefficients.slope.lower, 2);
    document.getElementById('coef-x-up').textContent = formatNumber(metrics.coefficients.slope.upper, 2);

    // Update Predict Label
    document.getElementById('predict-x-label').textContent = `Enter ${xLabel}`;

    // 8. Generate Interpretations
    generateInterpretations(metrics, xLabel, yLabel);
}

function generateInterpretations(metrics, xLabel, yLabel) {
    const isSig = metrics.anova.regression.sigF < 0.05;
    const sigText = isSig 
        ? `The model is statistically significant (Significance F = ${formatNumber(metrics.anova.regression.sigF)} < 0.05). This means <strong>${xLabel}</strong> is a significant predictor of <strong>${yLabel}</strong>.`
        : `The model is NOT statistically significant (Significance F = ${formatNumber(metrics.anova.regression.sigF)} > 0.05). There is no reliable linear relationship detected.`;
    document.getElementById('interp-sig').innerHTML = sigText;

    const r2Pct = (metrics.summary.rSquared * 100).toFixed(2);
    let fitDesc = "weak";
    if (metrics.summary.rSquared > 0.7) fitDesc = "strong";
    else if (metrics.summary.rSquared > 0.4) fitDesc = "moderate";
    document.getElementById('interp-fit').innerHTML = `R² = ${formatNumber(metrics.summary.rSquared)} indicates that ${r2Pct}% of the variation in <strong>${yLabel}</strong> is explained by <strong>${xLabel}</strong>. This suggests a ${fitDesc} relationship.`;

    const m = formatNumber(metrics.coefficients.slope.value, 2);
    const b = formatNumber(metrics.coefficients.intercept.value, 2);
    document.getElementById('interp-coef').innerHTML = `
        <ul style="margin:0; padding-left: 1rem;">
            <li><strong>Intercept (${b}):</strong> The estimated ${yLabel} when ${xLabel} is 0.</li>
            <li><strong>${xLabel} (${m}):</strong> For every additional 1 unit of ${xLabel}, the ${yLabel} is expected to ${metrics.coefficients.slope.value >= 0 ? 'increase' : 'decrease'} by ${Math.abs(metrics.coefficients.slope.value).toFixed(2)} on average.</li>
        </ul>
    `;

    // Practical example
    const exampleIncrease = 10;
    const expectedImpact = formatNumber(metrics.coefficients.slope.value * exampleIncrease, 2);
    document.getElementById('interp-prac').innerHTML = `Higher ${xLabel} is associated with ${metrics.coefficients.slope.value >= 0 ? 'higher' : 'lower'} ${yLabel}. On average, an increase of ${exampleIncrease} in ${xLabel} is associated with a change of ${expectedImpact} in ${yLabel}.`;
}

export function displayPrediction(xVal, yPred, intervalLower, intervalUpper) {
    document.getElementById('pred-y-val').textContent = formatNumber(yPred, 2);
    if (intervalLower !== null && intervalUpper !== null) {
        document.getElementById('pred-interval-val').textContent = `(${formatNumber(intervalLower, 2)} – ${formatNumber(intervalUpper, 2)})`;
    } else {
        document.getElementById('pred-interval-val').textContent = '(- / -)';
    }
}

export function exportResults(metrics) {
    if (!metrics) return;
    
    // Create a JSON blob containing the metrics
    // Exclude the 'lineFunction' because it's not serializable
    const dataToExport = {
        equation: metrics.equation,
        summary: metrics.summary,
        anova: metrics.anova,
        coefficients: metrics.coefficients,
        residuals: metrics.residuals
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "regression_results.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}