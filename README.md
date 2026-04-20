# X Analytics Dashboard

A clean, dark-mode analytics dashboard for your X (Twitter) activity.
No backend, no API keys, no data sent anywhere — runs entirely in your browser.

## Features

- **Activity heatmap** — GitHub-style contribution grid showing your tweet frequency
- **8 stat cards** — total tweets, impressions, engagements, avg engagement rate, max streak, most active day, peak hour, total likes
- **Impressions over time** — line chart of daily impression totals
- **Engagement rate trend** — weekly engagement rate over time
- **Tweets by hour** — bar chart showing your most active posting hours
- **Tweets by day of week** — bar chart of your weekday patterns
- **Top 10 tweets** — your highest-impression tweets ranked

## How to use

### 1. Get your CSV from X Analytics

1. Go to [analytics.twitter.com](https://analytics.twitter.com)
2. Click **Export data** in the top right
3. Choose your date range and download the CSV

### 2. Open the dashboard

Just open `index.html` in any modern browser — no server needed.

### 3. Upload your CSV

Drag and drop the CSV onto the upload zone, or click to browse.

You can also click **"Try with demo data"** to see the dashboard with generated data.

## File structure

```
xstats/
├── index.html          # Main app shell
├── css/
│   └── style.css       # All styles (dark theme)
└── js/
    ├── parse.js        # CSV parsing + data processing
    ├── heatmap.js      # Heatmap rendering
    ├── charts.js       # Chart.js chart rendering
    └── app.js          # App orchestration + demo data
```

## CSV format compatibility

The dashboard auto-detects column names and works with the standard X Analytics export.
Expected columns (names may vary slightly):

| Column | Used for |
|--------|----------|
| `date` / `time` | Tweet timestamp |
| `tweet_text` | Tweet content |
| `impressions` | Impression count |
| `engagements` | Engagement count |
| `engagement_rate` | Engagement % |
| `likes` / `favorites` | Like count |
| `retweets` | Retweet count |
| `replies` | Reply count |
| `url_clicks` | Link click count |
| `user_profile_clicks` | Profile click count |

## Browser support

Works in all modern browsers (Chrome, Firefox, Safari, Edge).
No build step, no npm, no dependencies to install.
