/* load 'fs' for readFile and writeFile support */
import * as XLSX from 'xlsx';
import * as fs from 'fs';
XLSX.set_fs(fs);

//read the workbook for a given file path
export function readWorkbook(filePath) {
    const workbook = XLSX.readFile(filePath, { cellDates: true, raw: false });
    return workbook
}

//used for multi-sheet files taking in the workbook and sheetName
export function getSheetData(workbook, sheetName) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
        const err = new Error(`File is missing the following sheet: ${sheetName}`);
        err.code = 'E_MissingSheet';
        err.sheetName = sheetName;
        throw err;
    }

    const data = XLSX.utils.sheet_to_json(sheet)
    if (data.length === 0) {
        const err = new Error(`No data on the following sheet: ${sheetName}`);
        err.code = 'E_EmptySheet';
        err.sheetName = sheetName;
        throw err;
    }
    return data
}