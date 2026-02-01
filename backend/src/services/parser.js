const parseDate = (str, year = 2024, previousDate = null) => {
  if (!str || !str.trim()) return previousDate;
  
  const s = str.trim().toLowerCase();
  
  const specialEvents = [
    'twindate', 'payday', 'weekend', 'outing', '10.10', '11.11', '12.12',
    'double', 'promo', 'flash', 'sale', 'harbolnas', 'midnight'
  ];
  
  if (specialEvents.some(event => s.includes(event))) {
    return previousDate;
  }
  
  const skipWords = ['rekap', 'nama', 'summary', 'chart', 'graph', 'total', 'libur', 'week', 'g'];
  if (skipWords.some(word => s.includes(word))) return null;
  
  const indoMonths = {
    'januari': '01', 'jan': '01',
    'februari': '02', 'feb': '02',
    'maret': '03', 'mar': '03',
    'april': '04', 'apr': '04',
    'mei': '05', 'may': '05',
    'juni': '06', 'jun': '06',
    'juli': '07', 'jul': '07',
    'agustus': '08', 'agu': '08', 'agust': '08', 'agutus': '08',
    'september': '09', 'sep': '09', 'sept': '09',
    'oktober': '10', 'okt': '10', 'oct': '10', 'okt-': '10',
    'november': '11', 'nov': '11', 'nov-': '11',
    'desember': '12', 'des': '12', 'dec': '12'
  };
  
  const indoMatch = s.match(/^(\d{1,2})[\s\-\/\.]?[\s]?([a-z]+)[\s\-\/\.]?[\s]?(\d{4})$/i);
  if (indoMatch) {
    const [, day, monthName, yr] = indoMatch;
    const month = indoMonths[monthName.toLowerCase()];
    if (month) {
      return `${yr}-${month}-${day.padStart(2, '0')}`;
    }
  }
  
  const parts = s.split(/\s+/);
  if (parts.length >= 2) {
    const day = parts[0].replace(/\D/g, '').padStart(2, '0');
    const monthAbbr = parts[1].toLowerCase().slice(0, 3);
    const month = indoMonths[monthAbbr];
    if (month && day !== '00') {
      return `${year}-${month}-${day}`;
    }
  }
  
  const dateMatch = s.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})$/);
  if (dateMatch) {
    const [, day, month, yr] = dateMatch;
    return `${yr}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  
  const malformedMatch = s.match(/^(\d{1,2})[\/\.\-]?(\d{1,2})(\d{4})$/);
  if (malformedMatch) {
    const [, day, month, yr] = malformedMatch;
    return `${yr}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  if (previousDate) {
    return previousDate;
  }
  
  return null;
};

const parseTime = (str) => {
  if (!str || !str.trim()) return '12:00:00';
  
  const firstPart = str.trim().split(/[-–]/)[0].trim();
  const digits = firstPart.match(/\d+/g);
  
  if (!digits || digits.length === 0) return '12:00:00';
  
  let hours = parseInt(digits[0], 10);
  let minutes = digits.length > 1 ? parseInt(digits[1], 10) : 0;
  
  if (hours > 23) hours = hours % 24;
  if (minutes > 59) minutes = 59;
  
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  
  return `${hh}:${mm}:00`;
};

const cleanCurrency = (val) => {
  if (!val) return 0.0;
  const num = parseFloat((val || '').toString().replace(/[^\d]/g, ''));
  return isNaN(num) ? 0.0 : num;
};

const cleanNumber = (val) => {
  if (!val) return 0;
  const num = parseInt((val || '').toString().replace(/[^\d]/g, ''));
  return isNaN(num) ? 0 : num;
};

exports.parseSessions = (rows, periodId) => {
  let currentDate = null;
  const sessions = [];
  
  let headerIdx = rows.findIndex(row => row?.[0]?.toString().toLowerCase().includes('no'));
  if (headerIdx === -1) {
    headerIdx = rows.findIndex(row => 
      row?.[1]?.toString().toLowerCase().includes('tanggal') && 
      row?.[2]?.toString().toLowerCase().includes('jam')
    );
  }
  if (headerIdx === -1) {
    headerIdx = 4;
  }
  
  const headers = rows[headerIdx]?.map(h => h?.toString().toLowerCase().replace(/\n/g, ' ') || '') || [];
  
  const cols = {
    date: headers.findIndex(h => h.includes('tanggal') && !h.includes('jam') && !h.includes('time') && !h.includes('hours')),
    time: headers.findIndex(h => h.includes('jam') && h.includes('live')),
    host: headers.findIndex(h => h.includes('host') || h.includes('presenter') || h.includes('pic')),
    tiktok: headers.findIndex(h => h.includes('tiktok') && h.includes('revenue')),
    shopee: headers.findIndex(h => h.includes('shopee') && h.includes('revenue'))
  };
  
  if (cols.date === -1) cols.date = 1;
  if (cols.time === -1) cols.time = 2;
  if (cols.host === -1) cols.host = 4;
  if (cols.tiktok === -1) cols.tiktok = 5;
  if (cols.shopee === -1) cols.shopee = 8;
  
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const num = row[0]?.toString().trim();
    
    if (!num || num.toLowerCase().includes('libur') || num.toLowerCase().includes('summary')) continue;
    
    if (row[cols.date]?.trim()) {
      const parsed = parseDate(row[cols.date], 2024, currentDate);
      if (parsed) currentDate = parsed;
    }
    
    const hasRevenue = 
      cleanCurrency(row[cols.tiktok]) > 0 || 
      cleanCurrency(row[cols.shopee]) > 0;
    
    if (!currentDate && !hasRevenue) continue;
    
    let start = '12:00:00', end = '14:00:00', duration = 2.0;
    if (row[cols.time]?.trim()) {
      const timeStr = row[cols.time].trim();
      const parts = timeStr.split(/[-–]/);
      if (parts.length >= 2) {
        start = parseTime(parts[0]);
        end = parseTime(parts[1]);
        const s = new Date(`2000-01-01T${start}`);
        let e = new Date(`2000-01-01T${end}`);
        if (e <= s) e.setDate(e.getDate() + 1);
        duration = parseFloat(((e - s) / 3600000).toFixed(1));
      }
    }
    
    sessions.push({
      period_id: periodId,
      host: (row[cols.host] || 'UNKNOWN').toString().trim().toUpperCase(),
      date: currentDate || '2024-01-01',
      start_time: start,
      end_time: end,
      duration_hours: duration,
      platform: (row[3] || 'MULTI').toString().trim() || 'MULTI',
      tiktok_revenue: cleanCurrency(row[cols.tiktok]),
      shopee_revenue: cleanCurrency(row[cols.shopee]),
      tiktok_viewers: cleanNumber(row[cols.tiktok + 1] || '0'),
      shopee_viewers: cleanNumber(row[cols.shopee + 1] || '0')
    });
  }
  
  return sessions;
};