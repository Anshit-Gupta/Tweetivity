// charts.js — all Chart.js chart rendering

let charts = {};

function destroyCharts() {
  Object.values(charts).forEach(c => c.destroy());
  charts = {};
}

const GRID_COLOR = 'rgba(255,255,255,0.05)';
const TICK_COLOR = '#444';
const ACCENT = '#1d9bf0';
const GREEN = '#00ba7c';

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 600, easing: 'easeOutQuart' },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#161616',
      borderColor: '#222',
      borderWidth: 1,
      titleColor: '#f0f0f0',
      bodyColor: '#888',
      padding: 10,
      cornerRadius: 8,
    }
  },
  scales: {
    x: {
      grid: { color: GRID_COLOR },
      ticks: { color: TICK_COLOR, font: { family: 'GeistMono', size: 10 } },
    },
    y: {
      grid: { color: GRID_COLOR },
      ticks: { color: TICK_COLOR, font: { family: 'GeistMono', size: 10 } },
      beginAtZero: true,
    }
  }
};

function renderImpressionsChart(impressionsByDay) {
  const ctx = document.getElementById('impressions-chart').getContext('2d');
  const keys = Object.keys(impressionsByDay).sort();
  const labels = keys;
  const data = keys.map(k => impressionsByDay[k]);

  charts.impressions = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: ACCENT,
        backgroundColor: 'rgba(29,155,240,0.08)',
        fill: true,
        tension: 0.25,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 1.5,
      }]
    },
    options: {
      ...baseOptions,
      scales: {
        x: {
          ...baseOptions.scales.x,
          ticks: {
            ...baseOptions.scales.x.ticks,
            autoSkip: true,
            maxTicksLimit: 12,
            callback: function(value) {
              const key = this.getLabelForValue(value);
              const d = new Date(`${key}T00:00:00`);
              return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
          }
        },
        y: {
          ...baseOptions.scales.y,
          ticks: {
            ...baseOptions.scales.y.ticks,
            callback: value => Number(value).toLocaleString('en-US')
          }
        }
      },
      plugins: {
        ...baseOptions.plugins,
        tooltip: {
          ...baseOptions.plugins.tooltip,
          callbacks: {
            title: items => {
              const key = items[0].label;
              const d = new Date(`${key}T00:00:00`);
              return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            },
            label: ctx => `${Number(ctx.parsed.y).toLocaleString('en-US')} impressions`
          }
        }
      }
    }
  });
}

function renderEngRateChart(engRateByDay) {
  const ctx = document.getElementById('engrate-chart').getContext('2d');
  const keys = Object.keys(engRateByDay).sort();
  const labels = keys;
  const data = keys.map(k => engRateByDay[k]);

  charts.engRate = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: GREEN,
        backgroundColor: 'rgba(0,186,124,0.08)',
        fill: true,
        tension: 0.25,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 1.5,
      }]
    },
    options: {
      ...baseOptions,
      scales: {
        x: {
          ...baseOptions.scales.x,
          ticks: {
            ...baseOptions.scales.x.ticks,
            autoSkip: true,
            maxTicksLimit: 12,
            callback: function(value) {
              const key = this.getLabelForValue(value);
              const d = new Date(`${key}T00:00:00`);
              return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
          }
        },
        y: {
          ...baseOptions.scales.y,
          ticks: {
            ...baseOptions.scales.y.ticks,
            callback: value => `${value}%`
          }
        }
      },
      plugins: {
        ...baseOptions.plugins,
        tooltip: {
          ...baseOptions.plugins.tooltip,
          callbacks: {
            title: items => {
              const key = items[0].label;
              const d = new Date(`${key}T00:00:00`);
              return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            },
            label: ctx => `${ctx.parsed.y.toFixed(2)}% engagement rate`
          }
        }
      }
    }
  });
}

function renderReachEfficiencyChart(impressionsPerPostByDay) {
  const ctx = document.getElementById('hour-chart').getContext('2d');
  const keys = Object.keys(impressionsPerPostByDay).sort();
  const labels = keys;
  const data = keys.map(k => impressionsPerPostByDay[k]);

  charts.hour = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: ACCENT,
        backgroundColor: 'rgba(29,155,240,0.08)',
        fill: true,
        tension: 0.25,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 1.5,
      }]
    },
    options: {
      ...baseOptions,
      plugins: {
        ...baseOptions.plugins,
        tooltip: {
          ...baseOptions.plugins.tooltip,
          callbacks: {
            title: items => {
              const key = items[0].label;
              const d = new Date(`${key}T00:00:00`);
              return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            },
            label: ctx => {
              if (ctx.parsed.y === null || ctx.parsed.y === undefined) {
                return 'No posts on this day';
              }
              return `${Number(ctx.parsed.y).toLocaleString('en-US')} impressions per post`;
            }
          }
        }
      },
      scales: {
        x: {
          ...baseOptions.scales.x,
          ticks: {
            ...baseOptions.scales.x.ticks,
            autoSkip: true,
            maxTicksLimit: 12,
            callback: function(value) {
              const key = this.getLabelForValue(value);
              const d = new Date(`${key}T00:00:00`);
              return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
          }
        },
        y: {
          ...baseOptions.scales.y,
          ticks: {
            ...baseOptions.scales.y.ticks,
            callback: value => Number(value).toLocaleString('en-US')
          }
        }
      }
    }
  });
}

function renderDowChart(dowImpressions) {
  const ctx = document.getElementById('dow-chart').getContext('2d');
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const max = Math.max(...dowImpressions);

  charts.dow = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: dowImpressions,
        backgroundColor: dowImpressions.map(v => {
          if (max === 0) return 'rgba(0,186,124,0.2)';
          return v === max ? GREEN : 'rgba(0,186,124,0.2)';
        }),
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      ...baseOptions,
      plugins: {
        ...baseOptions.plugins,
        tooltip: {
          ...baseOptions.plugins.tooltip,
          callbacks: {
            title: items => `${items[0].label}`,
            label: ctx => `${Number(ctx.parsed.y).toLocaleString('en-US')} impressions`
          }
        }
      },
      scales: {
        x: { ...baseOptions.scales.x },
        y: {
          ...baseOptions.scales.y,
          ticks: {
            ...baseOptions.scales.y.ticks,
            callback: value => Number(value).toLocaleString('en-US')
          }
        }
      }
    }
  });
}
