// data.js

/**
 * Parses TSV string (e.g., from Excel paste) into a 2D array.
 * @param {string} tsv 
 * @returns {string[][]}
 */
export function parseTSV(tsv) {
    return tsv.trim().split(/\r?\n/).map(row => row.split('\t'));
}

/**
 * Parses a basic CSV string into a 2D array.
 * @param {string} csv 
 * @returns {string[][]}
 */
export function parseCSV(csv) {
    return csv.trim().split(/\r?\n/).map(row => row.split(',').map(cell => cell.trim()));
}

/**
 * Extracts data from an HTML table element.
 * @param {HTMLTableElement} table 
 * @returns {object} { headers: string[], rows: number[][] }
 */
export function extractDataFromTable(table) {
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');

    const headers = Array.from(thead.querySelectorAll('th')).map(th => th.textContent.trim());
    
    const rows = Array.from(tbody.querySelectorAll('tr')).map(tr => {
        return Array.from(tr.querySelectorAll('td')).map(td => {
            const val = td.textContent.trim();
            return val === '' ? null : Number(val);
        });
    });

    return { headers, rows };
}

/**
 * Validates extracted data.
 * @param {object} data 
 * @returns {boolean}
 */
export function validateData(data) {
    if (data.headers.length < 2) return false;
    if (data.rows.length === 0) return false;
    
    // Ensure all columns have the same number of rows and are numerical
    const expectedCols = data.headers.length;
    for (const row of data.rows) {
        if (row.length !== expectedCols) return false;
    }
    return true;
}

/**
 * Extracts a specific column by index, filtering out rows with null values in that column.
 * @param {number[][]} rows 
 * @param {number} colIndex 
 * @returns {number[]}
 */
export function getColumnData(rows, colIndex) {
    return rows.map(row => row[colIndex]).filter(val => val !== null && !isNaN(val));
}
