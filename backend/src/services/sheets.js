const { google } = require('googleapis');
require('dotenv').config();

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});
const sheets = google.sheets({ version: 'v4', auth });

exports.listPeriods = async (spreadsheetId) => {
  const res = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title'
  });
  
  return res.data.sheets
    .map(s => s.properties.title)
    // Skip charts/graphs/summary tabs
    .filter(name => 
      !name.toLowerCase().includes('chart') && 
      !name.toLowerCase().includes('graph') &&
      !name.toLowerCase().includes('summary') &&
      !name.toLowerCase().includes('total') &&
      !name.toLowerCase().includes('dashboard') &&
      name.trim() !== ''
    )
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0]) || 0;
      const numB = parseInt(b.match(/\d+/)?.[0]) || 0;
      return numA - numB || a.localeCompare(b);
    });
};

exports.getSheetData = async (spreadsheetId, sheetName) => {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'`
  });
  return res.data.values || [];
};