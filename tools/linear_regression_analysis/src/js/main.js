// main.js
import { 
    handleTablePaste, 
    updateVariableSelectors, 
    displayMetrics, 
    showError, 
    clearError, 
    updateFileInputUI, 
    displayPrediction, 
    renderTable, 
    exportResults,
    syncHeadersWithSelectors,
    validateCellInput,
    handleAutoRowGrowth
} from './ui.js';
import { extractDataFromTable, validateData, parseCSV } from './data.js';
import { calculateRegression } from './regression.js';
import { drawScatterPlot, drawResidualsPlot } from './plotting.js';

let currentMetrics = null;
let currentConfLevel = 0.95;

console.log("Statistical Analysis Dashboard: Script Loaded.");

document.addEventListener('DOMContentLoaded', () => {
    console.log("Statistical Analysis Dashboard: DOM Ready.");

    // Setup initial variable selectors
    const initialTable = document.getElementById('data-table');
    if (initialTable) {
        const initialHeaders = Array.from(initialTable.querySelectorAll('th')).map(th => th.textContent);
        updateVariableSelectors(initialHeaders);
    }

    // Toggle Data Source
    const dataSourceSelect = document.getElementById('data-source-select');
    const fileDropZone = document.getElementById('file-drop-zone');
    const pasteArea = document.getElementById('paste-area');
    
    if (dataSourceSelect) {
        dataSourceSelect.addEventListener('change', (e) => {
            if (e.target.value === 'Upload CSV File') {
                fileDropZone.style.display = 'flex';
                pasteArea.style.display = 'none';
            } else {
                fileDropZone.style.display = 'none';
                pasteArea.style.display = 'block';
            }
        });
    }

    // File Upload Logic
    const fileInput = document.getElementById('csv-file-input');
    if (fileInput) {
        console.log("File Input Listener: Attached.");
        
        // Stop click bubbling from input to drop-zone
        fileInput.addEventListener('click', (e) => e.stopPropagation());

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            console.log("File Selection Event Fired.");
            
            if (file) {
                console.log("File Selected:", file.name, "(" + file.size + " bytes)");
                
                // Update UI Labels immediately
                updateFileInputUI(file);
                
                const reader = new FileReader();
                reader.onload = (event) => {
                    console.log("File Read Complete.");
                    const text = event.target.result;
                    const parsedData = parseCSV(text);
                    console.log("CSV Parsed. Row count:", parsedData.length);
                    
                    renderTable(parsedData);
                    
                    // Update meta with dimensions and show success tick
                    const rowCount = parsedData.length > 0 ? parsedData.length - 1 : 0;
                    const colCount = parsedData.length > 0 ? parsedData[0].length : 0;
                    import('./ui.js').then(ui => ui.updateFileStatusUI(rowCount, colCount));

                    clearError();
                    
                    // Reset input value so the same file can be uploaded again
                    fileInput.value = '';
                };
                
                reader.onerror = (err) => {
                    console.error("FileReader Error:", err);
                    showError("Error reading the CSV file.");
                };

                reader.readAsText(file);
            } else {
                console.log("No file selected or selection cancelled.");
            }
        });
    } else {
        console.error("Critical Error: #csv-file-input not found in DOM.");
    }

    // Paste Listener
    const tableContainer = document.querySelector('.table-container');
    if (tableContainer) {
        tableContainer.addEventListener('paste', handleTablePaste);

        // Live Table Behaviors (Delegation)
        tableContainer.addEventListener('input', (e) => {
            const target = e.target;
            
            // 1. Header Sync
            if (target.tagName === 'TH') {
                syncHeadersWithSelectors();
            }

            // 2. Numeric Validation & Row Growth
            if (target.tagName === 'TD') {
                validateCellInput(target);
                handleAutoRowGrowth(target);
            }
        });
    }

    // Handle Calculate Button Click
    const calculateBtn = document.getElementById('calculate-btn');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', () => {
            clearError(); 

            const currentTable = document.getElementById('data-table');
            const data = extractDataFromTable(currentTable);
            
            if (!validateData(data)) {
                showError("Please provide valid numerical data via CSV or Paste.");
                return;
            }

            const xSelect = document.getElementById('x-var-select');
            const ySelect = document.getElementById('y-var-select');
            
            const xColIndex = parseInt(xSelect.value, 10);
            const yColIndex = parseInt(ySelect.value, 10);

            const xLabel = xSelect.options[xSelect.selectedIndex].text;
            const yLabel = ySelect.options[ySelect.selectedIndex].text;

            let xData = [];
            let yData = [];
            
            for (let i = 0; i < data.rows.length; i++) {
                const xVal = data.rows[i][xColIndex];
                const yVal = data.rows[i][yColIndex];
                if (xVal !== null && !isNaN(xVal) && yVal !== null && !isNaN(yVal)) {
                    xData.push(xVal);
                    yData.push(yVal);
                }
            }

            if (xData.length < 3) {
                showError("Need at least 3 valid data pairs to perform advanced regression analysis.");
                return;
            }

            // Get confidence level
            const confLevelSelect = document.getElementById('confidence-level');
            currentConfLevel = parseInt(confLevelSelect.value, 10) / 100.0;

            currentMetrics = calculateRegression(xData, yData, currentConfLevel);
            
            if (currentMetrics) {
                displayMetrics(currentMetrics, xLabel, yLabel);
                
                // Get display options
                const showRegLine = document.getElementById('show-reg-line').checked;
                const showConfInt = document.getElementById('show-conf-int').checked;
                const showPredInt = document.getElementById('show-pred-int').checked;
                const showResPlot = document.getElementById('show-res-plot').checked;
                
                drawScatterPlot(xData, yData, currentMetrics, xLabel, yLabel, showRegLine, showConfInt, showPredInt, currentConfLevel);
                
                const resPlotDiv = document.getElementById('residuals-plot');
                if (showResPlot) {
                    resPlotDiv.style.display = 'block';
                    drawResidualsPlot(xData, currentMetrics.residuals, xLabel);
                } else {
                    resPlotDiv.style.display = 'none';
                }
                
                // Reset Prediction Box
                document.getElementById('predict-x-input').value = '';
                displayPrediction(0, null, null, null);
            }
        });
    }

    // Toggle residuals plot independently without recalculating
    const resPlotCheckbox = document.getElementById('show-res-plot');
    if (resPlotCheckbox) {
        resPlotCheckbox.addEventListener('change', (e) => {
            const resPlotDiv = document.getElementById('residuals-plot');
            if (e.target.checked) {
                resPlotDiv.style.display = 'block';
                if (currentMetrics) {
                    const xSelect = document.getElementById('x-var-select');
                    const xLabel = xSelect.options[xSelect.selectedIndex].text;
                    const currentTable = document.getElementById('data-table');
                    const data = extractDataFromTable(currentTable);
                    const xColIndex = parseInt(xSelect.value, 10);
                    
                    let xData = [];
                    for (let i = 0; i < data.rows.length; i++) {
                         const xVal = data.rows[i][xColIndex];
                         if (xVal !== null && !isNaN(xVal)) {
                             xData.push(xVal);
                         }
                    }
                    drawResidualsPlot(xData, currentMetrics.residuals, xLabel);
                }
            } else {
                resPlotDiv.style.display = 'none';
            }
        });
    }

    // Handle Export Button Click
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (!currentMetrics) {
                alert("Please run the analysis first.");
                return;
            }
            exportResults(currentMetrics);
        });
    }

    // Handle Prediction
    const predictBtn = document.getElementById('predict-btn');
    if (predictBtn) {
        predictBtn.addEventListener('click', () => {
            if (!currentMetrics) {
                alert("Please run the analysis first before predicting.");
                return;
            }
            
            const xValStr = document.getElementById('predict-x-input').value;
            const xVal = parseFloat(xValStr);
            if (isNaN(xVal)) {
                alert("Please enter a valid numeric X value.");
                return;
            }

            // Calculate Prediction
            const yPred = currentMetrics.lineFunction(xVal);

            // Calculate Prediction Interval
            // t_crit for the given confidence level and degrees of freedom
            const dfRes = currentMetrics.summary.observations - 2;
            const tCrit = jStat.studentt.inv(1 - (1 - currentConfLevel) / 2, dfRes);
            const se = currentMetrics.summary.standardError;
            const n = currentMetrics.summary.observations;
            const meanX = currentMetrics.summary.meanX;
            const ssxx = currentMetrics.summary.ssxx;

            // Margin of error for prediction interval (new individual observation)
            const marginOfError = tCrit * se * Math.sqrt(1 + (1/n) + (Math.pow(xVal - meanX, 2) / ssxx));
            
            displayPrediction(xVal, yPred, yPred - marginOfError, yPred + marginOfError);
        });
    }
});
