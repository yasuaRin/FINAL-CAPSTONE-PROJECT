// #!/usr/bin/env node
// require('dotenv').config();
// const sheets = require('../backend/src/services/sheets');

// (async () => {
//   const SPECS_ID = '1qUP1Cgr3RsTLBS3GacUtCQXpWmJDKNvZkclDeDrICg4'; // ← Replace with actual ID
  
//   console.log(' Scanning SPECS PERIODE 11 for malformed dates...\n');
  
//   const rows = await sheets.getSheetData(SPECS_ID, 'PERIODE 11');
  
//   // Scan for problematic date patterns
//   rows.forEach((row, idx) => {
//     if (!row) return;
    
//     // Check all cells for malformed dates
//     row.forEach((cell, colIdx) => {
//       if (!cell) return;
      
//       const str = cell.toString().trim();
      
//       // Patterns to detect malformed dates
//       const patterns = [
//         /\\$/,          // Ends with backslash
//         /"$/,           // Ends with quote
//         /^\d{1,2}[\/\-]\d{1,2}\d{4}$/, // Missing separator (e.g., "04/082025")
//         /202[5-9]"?$/   // Future year with quote/backslash
//       ];
      
//       if (patterns.some(p => p.test(str))) {
//         const colLetter = String.fromCharCode(65 + colIdx);
//         console.log(`⚠️ Row ${idx + 1}, Col ${colLetter}: "${str}"`);
//       }
//     });
//   });
  
//   console.log('\n✅ Scan complete. Check output above for malformed dates.');
// })().catch(console.error);