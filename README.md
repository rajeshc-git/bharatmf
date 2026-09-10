# 🇮🇳 Bharat MF NAV Tracker & EOD Notifier

An ultra-lightweight, blazing-fast Indian Mutual Fund Portfolio Tracker built with **Bun 1.4**, **Next.js 16**, **Redis 7 (Alpine)**, **MFapi.in REST API**, and automated **Gmail SMTP Email Notifications**.

Featuring a **Bharat Hunt inspired vibrant Orange & Black meshy grid UI**, passwordless **Email OTP login** with persistent browser sessions, and **interactive SVG historical NAV charts** cached in Redis (<15ms response times).

---

## 🎨 Design & Visual Features

- **Meshy Grid Pattern Backdrop**: Subtle, high-contrast grid lines with warm amber lighting inspired by modern Indian tech platforms.
- **Vibrant Orange Theme**: Signature accents (`#FF5B00` / `#FF7700`) with glowing action buttons and pill tags (`🇮🇳 Built for India`, `⚡ Bun 1.4 Native`).
- **INDmoney 3-Column Portfolio Cards**: Complete breakdown per fund:
  - **Invested**: (e.g. ₹100K)
  - **Current Value**: (e.g. ₹1.01L with units & latest NAV)
  - **Gain / Loss**: (e.g. ₹1.08K ▲1.08% with 1-day change)
- **Interactive Historical Performance Graphs**: Zero heavyweight charting dependencies. Pure responsive SVG vector curves with hover crosshairs, area gradients, high/low points, and timeframe selectors (**1M**, **3M**, **6M**, **1Y**, **ALL**).

---

## 🔐 Passwordless Email OTP Authentication

1. Open the application.
2. Enter your authorized email and click **"Send Login OTP via Gmail"**.
3. A 6-digit verification code is instantly generated and delivered to your Gmail inbox via SMTP.
4. Enter the 6-digit code.
5. **Persistent Session**: Your session is securely stored in an HTTP cookie and local storage, keeping you logged in across browser restarts until you explicitly click **Logout**.

---

## 📊 Pre-Configured Portfolio (INDmoney)

| Mutual Fund Scheme | AMC | AMFI Code | Invested | Current Value |
| :--- | :--- | :--- | :--- | :--- |
| **HDFC Flexi Cap Fund** | HDFC Mutual Fund | `118955` | ₹1,00,000 (₹100K) | ~₹1.01L |
| **Invesco India Small Cap Fund** | Invesco Mutual Fund | `145137` | ₹50,000 (₹50K) | ~₹52.12K |
| **Motilal Oswal Nifty Midcap 150 Index Fund** | Motilal Oswal MF | `147622` | ₹45,000 (₹45K) | ~₹45.31K |
| **Kotak Mid Cap Fund** | Kotak Mahindra MF | `119775` | ₹4,100 (₹4.1K) | ~₹4.1K |
| **ICICI Prudential Gold ETF FOF** | ICICI Prudential MF | `120685` | ₹100 | ~₹102.07 |

---

## 🐳 Linux Docker & Docker Compose Deployment

Run both the **Next.js Bun application** and the **ultra-compact Redis cache** with a single command:

```bash
docker compose up -d --build
```

### Unique Non-Conflicting Ports:
- **Web App**: Port **`3200:3200`** (Avoids standard `3000` collisions with other web apps).
- **Redis Cache**: Host Port **`3279:6379`** (Avoids all standard `6379` and `6389` Redis collisions).
- **RAM Footprint**: Restricted to **32MB max** for Redis, minimal ~50MB for Bun.
- **Persistent Storage**: All data saved to `./data` and `redis_data`.

To check running containers:
```bash
docker compose ps
docker compose logs -f
```

---

## 🚀 Running Locally with Bun

```bash
# 1. Install dependencies
bun install

# 2. Build production bundle
bun run build

# 3. Start production server on port 3200
PORT=3200 bun .next/standalone/server.js
```
Open [http://localhost:3200](http://localhost:3200) in your browser.

---

## 🛠️ API Reference

- `POST /api/auth/otp`: Generate and dispatch 6-digit OTP to Gmail.
- `POST /api/auth/verify`: Validate OTP and issue 30-day session token.
- `GET /api/auth/session`: Validate current browser session.
- `POST /api/auth/session` (`action: "logout"`): Invalidate session.
- `GET /api/history?schemeCode=<code&timeframe=<1M|3M|6M|1Y|ALL>`: Redis-cached historical NAV timeseries.
- `GET /api/portfolio`: Current portfolio valuation and live NAVs.
- `POST /api/portfolio`: Update or modify holdings.
- `POST /api/email`: Test email dispatch (`{ "action": "test" }`) or template preview (`{ "action": "preview" }`).
- `GET /api/search?q=<query>`: Search 40,000+ mutual fund schemes on MFapi.in.
