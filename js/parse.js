// parse.js — handles X analytics CSV parsing and data transformation

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV appears empty');

  // Parse header — handle quoted fields
  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    if (vals.length < 2) continue;
    const row = {};
    headers.forEach((h, idx) => { row[h] = (vals[idx] || '').trim(); });
    rows.push(row);
  }

  return { headers, rows };
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// Resolve column names flexibly (X changes them sometimes)
function resolveColumns(headers) {
  const find = (...candidates) => {
    for (const c of candidates) {
      const h = headers.find(h => h.includes(c));
      if (h) return h;
    }
    return null;
  };

  return {
    date:         find('date', 'tweet_date', 'created_at', 'timestamp', 'time'),
    timeOfDay:    find('hour', 'time_of_day', 'posted_time', 'tweet_time', 'time'),
    text:         find('tweet_text', 'text', 'tweet'),
    posts:        find('tweets', 'tweet_count', 'posts', 'post_count', 'create_post'),
    impressions:  find('impressions'),
    engagements:  find('engagements', 'total_engagements'),
    engRate:      find('engagement_rate', 'eng._rate'),
    likes:        find('likes', 'favorites'),
    retweets:     find('retweets'),
    replies:      find('replies'),
    clicks:       find('url_clicks', 'link_clicks', 'clicks'),
    profileClicks:find('user_profile_clicks', 'profile_clicks'),
  };
}

function parseHourFromValue(val) {
  if (val === null || val === undefined) return null;
  const raw = String(val).trim().toLowerCase();
  if (!raw) return null;

  // HH:MM or HH:MM:SS (24h)
  let m = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m) {
    const h = Number(m[1]);
    return h >= 0 && h <= 23 ? h : null;
  }

  // HH.MM (24h)
  m = raw.match(/^(\d{1,2})\.(\d{2})$/);
  if (m) {
    const h = Number(m[1]);
    return h >= 0 && h <= 23 ? h : null;
  }

  // 3:00pm / 3:00 pm / 03:00 PM
  m = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)$/);
  if (m) {
    let h = Number(m[1]);
    const meridiem = m[3];
    if (h < 1 || h > 12) return null;
    if (meridiem === 'am') return h === 12 ? 0 : h;
    return h === 12 ? 12 : h + 12;
  }

  // 1am / 1 pm / 12AM style
  m = raw.match(/^(\d{1,2})\s*(am|pm)$/);
  if (m) {
    let h = Number(m[1]);
    const meridiem = m[2];
    if (h < 1 || h > 12) return null;
    if (meridiem === 'am') return h === 12 ? 0 : h;
    return h === 12 ? 12 : h + 12;
  }

  // Plain hour number
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 0 && n <= 23) return n;

  return null;
}

function extractHourFromRow(row, headers, cols, parsedDateHour) {
  if (Number.isInteger(parsedDateHour) && parsedDateHour >= 0 && parsedDateHour <= 23) {
    return parsedDateHour;
  }

  const explicitTimeColHour = parseHourFromValue(row[cols.timeOfDay]);
  if (explicitTimeColHour !== null) return explicitTimeColHour;

  // Fallback: scan time-like columns for values that parse to an hour.
  const timeLikeCols = headers.filter(h => /(time|hour|posted_at|created_at|timestamp)/.test(h));
  for (const col of timeLikeCols) {
    const h = parseHourFromValue(row[col]);
    if (h !== null) return h;
  }

  return null;
}

function parseNum(val) {
  if (!val || val === '' || val === '-') return 0;
  return parseFloat(val.replace(/,/g, '').replace(/%/, '')) || 0;
}

function parseDateTimeInfo(val) {
  if (!val) return { date: null, hour: null, hasExplicitTime: false };

  const raw = String(val).trim();

  // YYYY-MM-DD or YYYY-MM-DD HH:MM[:SS]
  let m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]) - 1;
    const day = Number(m[3]);
    const hour = m[4] !== undefined ? Number(m[4]) : 0;
    const min = m[5] !== undefined ? Number(m[5]) : 0;
    const sec = m[6] !== undefined ? Number(m[6]) : 0;
    return {
      date: new Date(year, month, day, hour, min, sec),
      hour: m[4] !== undefined ? hour : null,
      hasExplicitTime: m[4] !== undefined,
    };
  }

  // DD/MM/YYYY or DD/MM/YYYY HH:MM[:SS]
  m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]) - 1;
    const year = Number(m[3]);
    const hour = m[4] !== undefined ? Number(m[4]) : 0;
    const min = m[5] !== undefined ? Number(m[5]) : 0;
    const sec = m[6] !== undefined ? Number(m[6]) : 0;
    return {
      date: new Date(year, month, day, hour, min, sec),
      hour: m[4] !== undefined ? hour : null,
      hasExplicitTime: m[4] !== undefined,
    };
  }

  // Fallback parser for other valid date-time strings
  const d = new Date(raw);
  if (!isNaN(d)) {
    const hasExplicitTime = /\d{1,2}:\d{2}/.test(raw);
    return {
      date: d,
      hour: hasExplicitTime ? d.getHours() : null,
      hasExplicitTime,
    };
  }

  return { date: null, hour: null, hasExplicitTime: false };
}

function processData(raw) {
  const { headers, rows } = raw;
  const cols = resolveColumns(headers);

  const tweets = rows.map(r => {
    const dt = parseDateTimeInfo(r[cols.date]);
    const extractedHour = extractHourFromRow(r, headers, cols, dt.hour);
    const parsedPosts = parseNum(r[cols.posts]);
    const posts = cols.posts ? parsedPosts : 1;
    return {
      date:         dt.date,
      hour:         extractedHour,
      hasExplicitTime: dt.hasExplicitTime,
      text:         r[cols.text] || '',
      posts,
      impressions:  parseNum(r[cols.impressions]),
      engagements:  parseNum(r[cols.engagements]),
      engRate:      parseNum(r[cols.engRate]),
      likes:        parseNum(r[cols.likes]),
      retweets:     parseNum(r[cols.retweets]),
      replies:      parseNum(r[cols.replies]),
      clicks:       parseNum(r[cols.clicks]),
      profileClicks:parseNum(r[cols.profileClicks]),
    };
  }).filter(t => t.date !== null);

  if (tweets.length === 0) throw new Error('No valid tweet rows found. Check your CSV format.');

  // Sort oldest first
  tweets.sort((a, b) => a.date - b.date);

  return tweets;
}

function buildStats(tweets) {
  const total = tweets.reduce((s, t) => s + (t.posts || 1), 0);
  const totalImpressions = tweets.reduce((s, t) => s + t.impressions, 0);
  const totalEngagements = tweets.reduce((s, t) => s + t.engagements, 0);
  const totalLikes = tweets.reduce((s, t) => s + t.likes, 0);
  const avgEngRate = totalImpressions > 0 ? (totalEngagements / totalImpressions * 100) : 0;

  // Day of week counts (0=Sun, 1=Mon, ...)
  const dowCounts = Array(7).fill(0);
  const hourCounts = Array(24).fill(0);
  const dowImpressions = Array(7).fill(0);
  const hourImpressions = Array(24).fill(0);

  // Map of YYYY-MM-DD => tweet count
  const dayMap = {};
  const dayDetails = {};

  tweets.forEach(t => {
    const key = toDateKey(t.date);
    if (!dayDetails[key]) {
      dayDetails[key] = { posts: 0, replies: 0, activity: 0 };
    }
    dayDetails[key].posts += (t.posts || 1);
    dayDetails[key].replies += t.replies;
    dayDetails[key].activity += (t.posts || 1) + t.replies;
    dayMap[key] = dayDetails[key].activity;
    dowCounts[t.date.getDay()] += (t.posts || 1);
    dowImpressions[t.date.getDay()] += t.impressions;
    if (Number.isInteger(t.hour) && t.hour >= 0 && t.hour <= 23) {
      hourCounts[t.hour] += (t.posts || 1);
      hourImpressions[t.hour] += t.impressions;
    }
  });

  // Max streak (consecutive days with at least 1 tweet)
  const sortedDays = Object.keys(dayMap).sort();
  const totalActiveDays = sortedDays.length;
  let maxStreak = 0, curStreak = 0, prevDate = null;
  for (const key of sortedDays) {
    const d = new Date(key + 'T00:00:00');
    if (prevDate) {
      const diff = (d - prevDate) / 86400000;
      if (diff === 1) { curStreak++; }
      else { curStreak = 1; }
    } else { curStreak = 1; }
    if (curStreak > maxStreak) maxStreak = curStreak;
    prevDate = d;
  }

  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const mostActiveDow = dowCounts.indexOf(Math.max(...dowCounts));
  const maxHourCount = Math.max(...hourCounts);
  const peakHour = maxHourCount > 0 ? hourCounts.indexOf(maxHourCount) : null;

  // Exact date with highest number of posts (if tie, prefer latest date)
  let mostPostedDateKey = null;
  let maxPostsOnOneDay = -1;
  for (const key of Object.keys(dayDetails).sort()) {
    const posts = dayDetails[key].posts || 0;
    if (posts > maxPostsOnOneDay || (posts === maxPostsOnOneDay && key > mostPostedDateKey)) {
      maxPostsOnOneDay = posts;
      mostPostedDateKey = key;
    }
  }
  const mostPostedDate = mostPostedDateKey ? fmtDateCompact(new Date(`${mostPostedDateKey}T00:00:00`)) : '—';

  const minDate = tweets[0].date;
  const maxDate = tweets[tweets.length - 1].date;

  // Daily time-series maps (for charts)
  const impressionsByDay = {};
  const dailyEngagementTotals = {};
  const postsByDay = {};
  tweets.forEach(t => {
    const key = toDateKey(t.date);
    impressionsByDay[key] = (impressionsByDay[key] || 0) + t.impressions;
    dailyEngagementTotals[key] = (dailyEngagementTotals[key] || 0) + t.engagements;
    postsByDay[key] = (postsByDay[key] || 0) + (t.posts || 0);
  });

  const engRateByDay = {};
  const impressionsPerPostByDay = {};
  for (const key of Object.keys(impressionsByDay)) {
    const imp = impressionsByDay[key] || 0;
    const eng = dailyEngagementTotals[key] || 0;
    const posts = postsByDay[key] || 0;
    engRateByDay[key] = imp > 0 ? parseFloat((eng / imp * 100).toFixed(2)) : 0;
    impressionsPerPostByDay[key] = posts > 0 ? parseFloat((imp / posts).toFixed(2)) : null;
  }

  return {
    total,
    totalImpressions,
    totalEngagements,
    totalLikes,
    avgEngRate,
    totalActiveDays,
    maxStreak,
    mostActiveDay: dayNames[mostActiveDow],
    mostPostedDate,
    peakHour,
    dayMap,
    dayDetails,
    dowCounts,
    hourCounts,
    dowImpressions,
    hourImpressions,
    minDate,
    maxDate,
    impressionsByDay,
    engRateByDay,
    impressionsPerPostByDay,
  };
}

function toDateKey(d) {
  return d.toISOString().split('T')[0];
}

function getWeekKey(d) {
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2,'0')}`;
}

function fmtNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return Math.round(n).toString();
}

function fmtDate(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateCompact(d) {
  const yy = String(d.getFullYear()).slice(-2);
  return `${d.getDate()}-${d.getMonth() + 1}-${yy}`;
}
