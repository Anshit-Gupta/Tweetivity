// heatmap.js — GitHub-style contribution heatmap

function renderHeatmap(dayMap, minDate, maxDate, summary = {}) {
  const grid = document.getElementById('heatmap-grid');
  const monthsEl = document.getElementById('heatmap-months');
  const tooltip = document.getElementById('heatmap-tooltip');
  const activeDaysEl = document.getElementById('heatmap-active-days');
  const maxStreakEl = document.getElementById('heatmap-max-streak');
  const dayDetails = summary.dayDetails || {};

  grid.innerHTML = '';
  monthsEl.innerHTML = '';

  // Find max for scaling
  const counts = Object.values(dayMap);
  const maxCount = Math.max(...counts, 1);
  const minKey = toDateKey(minDate);
  const maxKey = toDateKey(maxDate);
  const cellSize = 10;
  const gap = 3;

  if (activeDaysEl) activeDaysEl.textContent = String(summary.totalActiveDays || 0);
  if (maxStreakEl) maxStreakEl.textContent = String(summary.maxStreak || 0);

  // Build a range for the last year ending on maxDate, aligned to weeks
  const endDate = new Date(maxDate);
  // Snap to the end of the week (Saturday)
  const dayOfWeek = endDate.getDay();
  endDate.setDate(endDate.getDate() + (6 - dayOfWeek));

  // Start: 52 weeks before, snapped to Sunday
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 52 * 7 + 1);
  // Snap to Sunday
  const startDay = startDate.getDay();
  startDate.setDate(startDate.getDate() - startDay);

  // Build columns (each = one week, Sun-Sat)
  const totalDays = Math.ceil((endDate - startDate) / 86400000) + 1;
  const totalWeeks = Math.ceil(totalDays / 7);

  const positiveInRange = Object.entries(dayMap)
    .filter(([key, value]) => key >= minKey && key <= maxKey && value > 0)
    .map(([, value]) => value)
    .sort((a, b) => a - b);

  function quantile(values, q) {
    if (values.length === 0) return 0;
    const pos = (values.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    const next = values[base + 1] !== undefined ? values[base + 1] : values[base];
    return values[base] + rest * (next - values[base]);
  }

  const q1 = quantile(positiveInRange, 0.25);
  const q2 = quantile(positiveInRange, 0.5);
  const q3 = quantile(positiveInRange, 0.75);

  function ordinalDay(day) {
    const mod10 = day % 10;
    const mod100 = day % 100;
    if (mod10 === 1 && mod100 !== 11) return `${day}st`;
    if (mod10 === 2 && mod100 !== 12) return `${day}nd`;
    if (mod10 === 3 && mod100 !== 13) return `${day}rd`;
    return `${day}th`;
  }

  function formatGithubDate(date) {
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    return `${month} ${ordinalDay(date.getDate())}`;
  }

  function getLevel(count) {
    if (!count) return 0;
    if (count <= q1) return 1;
    if (count <= q2) return 2;
    if (count <= q3) return 3;
    return 4;
  }

  function positionTooltip(cell) {
    const panel = cell.closest('.heatmap-panel');
    if (!panel) return;

    const panelRect = panel.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const tooltipWidth = tooltip.offsetWidth || 180;
    const tooltipHeight = tooltip.offsetHeight || 34;

    let x = cellRect.left - panelRect.left + (cellRect.width / 2);
    const minX = (tooltipWidth / 2) + 8;
    const maxX = panelRect.width - (tooltipWidth / 2) - 8;
    x = Math.max(minX, Math.min(maxX, x));

    let y = cellRect.top - panelRect.top - 8;
    const canShowAbove = y >= tooltipHeight + 6;
    if (canShowAbove) {
      tooltip.classList.remove('below');
    } else {
      y = cellRect.bottom - panelRect.top + 8;
      tooltip.classList.add('below');
    }

    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  }

  const monthStarts = [];
  let prevMonth = null;

  for (let w = 0; w < totalWeeks; w++) {
    const col = document.createElement('div');
    col.className = 'heatmap-col';

    const weekDate = new Date(startDate);
    weekDate.setDate(weekDate.getDate() + w * 7);
    const weekMonth = weekDate.getMonth();
    if (prevMonth === null || weekMonth !== prevMonth) {
      monthStarts.push({
        week: w,
        label: weekDate.toLocaleDateString('en-US', { month: 'short' })
      });
      prevMonth = weekMonth;
    }

    for (let d = 0; d < 7; d++) {
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';

      const date = new Date(startDate);
      date.setDate(date.getDate() + w * 7 + d);

      const key = toDateKey(date);
      const count = dayMap[key] || 0;
      const details = dayDetails[key] || { posts: 0, replies: 0, activity: count };
      const inRange = key >= minKey && key <= maxKey;
      const level = inRange ? getLevel(count) : 0;
      cell.dataset.level = level;

      // Tooltip
      cell.addEventListener('mouseenter', () => {
        const dateLabel = formatGithubDate(date);
        const postCount = Math.round(details.posts);
        const label = postCount === 0
          ? `No posts on ${dateLabel}.`
          : `${postCount} post${postCount === 1 ? '' : 's'} on ${dateLabel}.`;
        tooltip.textContent = label;
        tooltip.classList.add('visible');
        positionTooltip(cell);
      });

      cell.addEventListener('mousemove', () => {
        positionTooltip(cell);
      });

      cell.addEventListener('mouseleave', () => {
        tooltip.classList.remove('below');
        tooltip.classList.remove('visible');
      });

      col.appendChild(cell);
    }
    grid.appendChild(col);
  }

  // Match months row width to heatmap grid width
  const gridWidth = totalWeeks * cellSize + (totalWeeks - 1) * gap;
  grid.style.width = `${gridWidth}px`;
  monthsEl.style.width = `${gridWidth}px`;

  // Render month labels aligned to week columns and avoid text overlap.
  let lastLabelRight = -Infinity;
  for (const { week, label } of monthStarts) {
    const left = week * (cellSize + gap);
    const estWidth = label.length * 7;
    if (left < lastLabelRight + 8) continue;

    const span = document.createElement('span');
    span.className = 'heatmap-month-label';
    span.textContent = label;
    span.style.left = `${left}px`;
    monthsEl.appendChild(span);
    lastLabelRight = left + estWidth;
  }
}
