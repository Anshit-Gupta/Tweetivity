// app.js — main orchestration

// ── Demo data generator ──────────────────────────────────────────────────────
function generateDemoData() {
  const rows = [];
  const now = new Date();
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  for (let i = 89; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    // 70% chance of tweeting on a given day
    const numTweets = Math.random() < 0.3 ? 0 : Math.floor(Math.random() * 4) + 1;

    for (let t = 0; t < numTweets; t++) {
      const hour = Math.floor(Math.random() < 0.6
        ? 8 + Math.random() * 14  // peak hours 8am-10pm
        : Math.random() * 24);
      const tweetDate = new Date(d);
      tweetDate.setHours(hour, Math.floor(Math.random()*60));

      const impressions = Math.floor(200 + Math.random() * 8000);
      const engagements = Math.floor(impressions * (0.01 + Math.random() * 0.08));
      const likes = Math.floor(engagements * 0.4 * Math.random());
      const retweets = Math.floor(engagements * 0.1 * Math.random());
      const replies = Math.floor(engagements * 0.05 * Math.random());
      const engRate = impressions > 0 ? (engagements / impressions * 100).toFixed(2) : '0';

      const sampleTexts = [
        'Just shipped a new feature that I\'m really proud of. The details matter.',
        'Hot take: the best code is the code you don\'t have to write.',
        'Three years ago I had no idea how to code. Now I build things every day.',
        'The best way to learn is to build something you actually care about.',
        'Reminder that your past work doesn\'t define your future output.',
        'Reading documentation is a skill. Most people skip it. Don\'t be most people.',
        'The gap between junior and senior devs isn\'t knowledge — it\'s judgment.',
        'Consistency beats intensity every single time.',
        'You don\'t need permission to start. Just start.',
        'Feedback is a gift even when it doesn\'t feel like one.',
      ];

      rows.push({
        date: tweetDate.toISOString().replace('T', ' ').split('.')[0],
        tweet_text: sampleTexts[Math.floor(Math.random() * sampleTexts.length)],
        impressions,
        engagements,
        engagement_rate: engRate + '%',
        likes,
        retweets,
        replies,
        url_clicks: Math.floor(engagements * 0.2 * Math.random()),
        user_profile_clicks: Math.floor(engagements * 0.1 * Math.random()),
      });
    }
  }

  // Build CSV string
  const headers = ['date','tweet_text','impressions','engagements','engagement_rate','likes','retweets','replies','url_clicks','user_profile_clicks'];
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${r[h]}"`).join(','))
  ].join('\n');

  return csv;
}

// ── UI helpers ───────────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function setCard(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function formatHour(h) {
  if (h === null || h === undefined || Number.isNaN(h)) return '—';
  if (h === 0) return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h-12}pm`;
}

async function exportHeatmapAsImage() {
  const panel = document.getElementById('heatmap-panel');
  const shareBtn = document.getElementById('share-map-btn');
  const cells = panel ? Array.from(panel.querySelectorAll('.heatmap-cell')) : [];
  if (!panel) {
    alert('Heatmap panel not found.');
    return;
  }
  if (typeof html2canvas === 'undefined') {
    alert('Image export library failed to load. Please refresh and try again.');
    return;
  }

  try {
    if (shareBtn) {
      shareBtn.disabled = true;
      shareBtn.querySelector('span').textContent = 'Preparing...';
    }

    const panelComputedBg = getComputedStyle(panel).backgroundColor || '#111111';
    panel.style.backgroundColor = panelComputedBg;

    for (const cell of cells) {
      const computed = getComputedStyle(cell);
      cell.style.backgroundColor = computed.backgroundColor;
      cell.style.borderColor = computed.borderColor;
    }

    const canvas = await html2canvas(panel, {
      backgroundColor: '#111111',
      scale: 2,
      useCORS: true,
      logging: false,
      onclone: (doc) => {
        const freezeStyle = doc.createElement('style');
        freezeStyle.textContent = `
          *, *::before, *::after {
            animation: none !important;
            transition: none !important;
          }
          #heatmap-panel {
            opacity: 1 !important;
            filter: none !important;
          }
        `;
        doc.head.appendChild(freezeStyle);
      },
    });

    const ctx = canvas.getContext('2d');
    if (ctx) {
      const pad = Math.max(12, Math.round(canvas.width * 0.015));
      const fontSize = Math.max(18, Math.round(canvas.width * 0.018));
      ctx.save();
      ctx.font = `500 ${fontSize}px Outfit, sans-serif`;
      ctx.fillStyle = 'rgba(240,240,240,0.72)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('tweetivity.app', canvas.width - pad, canvas.height - pad);
      ctx.restore();
    }

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'tweetivity-map.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err) {
    alert('Could not export heatmap image. Please try again.');
  } finally {
    panel.style.backgroundColor = '';

    for (const cell of cells) {
      cell.style.backgroundColor = '';
      cell.style.borderColor = '';
    }

    if (shareBtn) {
      shareBtn.disabled = false;
      shareBtn.querySelector('span').textContent = 'Share my map';
    }
  }
}

// ── Main render ──────────────────────────────────────────────────────────────
function renderDashboard(csvText) {
  let tweets, stats;
  try {
    const raw = parseCSV(csvText);
    tweets = processData(raw);
    stats = buildStats(tweets);
  } catch (e) {
    alert('Error parsing CSV: ' + e.message + '\n\nMake sure you uploaded an X Analytics CSV export.');
    return;
  }

  destroyCharts();

  // Stat cards
  setCard('s-tweets', fmtNum(stats.total));
  setCard('s-impressions', fmtNum(stats.totalImpressions));
  setCard('s-engagements', fmtNum(stats.totalEngagements));
  setCard('s-engrate', stats.avgEngRate.toFixed(2) + '%');
  setCard('s-streak', stats.maxStreak + (stats.maxStreak === 1 ? ' day' : ' days'));
  setCard('s-activeday', stats.mostActiveDay);
  setCard('s-peakhour', formatHour(stats.peakHour));
  setCard('s-postday', stats.mostPostedDate);
  setCard('s-likes', fmtNum(stats.totalLikes));

  // Date range header
  const rangeEl = document.getElementById('dash-date-range');
  if (rangeEl) rangeEl.textContent = `${fmtDate(stats.minDate)} → ${fmtDate(stats.maxDate)}`;

  // Heatmap
  renderHeatmap(stats.dayMap, stats.minDate, stats.maxDate, {
    totalActiveDays: stats.totalActiveDays,
    maxStreak: stats.maxStreak,
    dayDetails: stats.dayDetails,
  });

  // Charts
  renderImpressionsChart(stats.impressionsByDay);
  renderEngRateChart(stats.engRateByDay);
  renderReachEfficiencyChart(stats.impressionsPerPostByDay);
  renderDowChart(stats.dowImpressions);

  showScreen('dashboard-screen');
}

// ── File input ───────────────────────────────────────────────────────────────
function handleFile(file) {
  if (!file) return;
  if (!file.name.endsWith('.csv')) {
    alert('Please upload a .csv file from X Analytics.');
    return;
  }
  const reader = new FileReader();
  reader.onload = e => renderDashboard(e.target.result);
  reader.readAsText(file);
}

// ── Event listeners ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const demoBtn = document.getElementById('demo-btn');
  const resetBtn = document.getElementById('reset-btn');
  const shareMapBtn = document.getElementById('share-map-btn');

  fileInput.addEventListener('change', e => handleFile(e.target.files[0]));

  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    handleFile(e.dataTransfer.files[0]);
  });

  demoBtn.addEventListener('click', () => {
    renderDashboard(generateDemoData());
  });

  resetBtn.addEventListener('click', () => {
    showScreen('upload-screen');
  });

  if (shareMapBtn) {
    shareMapBtn.addEventListener('click', exportHeatmapAsImage);
  }
});
