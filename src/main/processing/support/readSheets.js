/* load 'fs' for readFile and writeFile support */
import * as XLSX from 'xlsx';
import * as fs from 'fs';
XLSX.set_fs(fs);

export async function readWorkbook(filePath) {
    const workbook = XLSX.readFile(filePath, { cellDates: true, raw: false });
    return workbook
}

//used for multi-sheet files taking in the workbook and sheetName
export async function getSheetData(workbook, sheetName) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new Error(`File is missing the following sheet: ${sheetName}`)

    const data = XLSX.utils.sheet_to_json(sheet)
    if (data.length == 0) throw new Error(`No data on the following sheet: ${sheetName}`)
    return data
}

//used for CSVs / single sheet files
export async function getFirstSheet(workbook) {
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    if (!sheet) throw new Error(`File is missing wastes`)
    return XLSX.utils.sheet_to_json(sheet)
}