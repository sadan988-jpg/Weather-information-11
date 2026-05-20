# 🌦️ Weather Trend Visualizer — Smart AI Dashboard
### Complete Project Documentation & Tech Stack Explanation

---

## 📌 Project Overview

The **Weather Trend Visualizer** is a full-stack, AI-powered weather intelligence dashboard. It combines live weather forecasts, AI voice assistance, interactive mapping, physics-based background animations, and an automated flood-avoidance routing engine inside a modern, responsive Bento-grid glassmorphism user interface.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  FRONTEND (Browser)                 │
│  index.html  ←→  app.js  ←→  voiceService.js       │
│  (Glassmorphism Bento UI + Physics Canvas Engine)   │
└───────────────────┬─────────────────────────────────┘
                    │ HTTP REST (fetch / axios)
┌───────────────────▼─────────────────────────────────┐
│               BACKEND (Node.js + Express)           │
│  server.js — API Gateway & AI Orchestration Layer   │
└────────┬──────────────────────────┬─────────────────┘
         │                          │
┌────────▼────────┐       ┌─────────▼──────────────┐
│  OpenWeather    │       │   Google Gemini AI /    │
│  API (Forecast) │       │   OpenAI GPT-4o-mini    │
└─────────────────┘       └────────────────────────┘
         │
┌────────▼────────┐
│    MongoDB      │
│  (Search History│
│   persistence)  │
└─────────────────┘
```

---

## 🛠️ Tech Stack

### 🔷 Backend

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | v18+ | JavaScript runtime environment |
| **Express.js** | v5.1.0 | HTTP server framework, REST API routing |
| **Mongoose** | v9.0.0 | ODM (Object Data Mapper) for MongoDB |
| **Axios** | v1.13.2 | HTTP client for external API calls (OpenWeather, Gemini) |
| **CORS** | v2.8.5 | Cross-Origin Resource Sharing middleware |
| **dotenv** | v17.2.3 | Environment variable loader from `.env` file |

**Entry point:** `server.js`  
**Port:** `5000` (default)

---

### 🔶 Frontend

| Tool | Purpose |
|------|---------|
| **Vanilla HTML5** | Semantic page structure |
| **Vanilla CSS3** | Glassmorphism cards, Bento Grid layout, animations |
| **Vanilla JavaScript (ES6+)** | Interactivity, map handling, canvas physics, logic |
| **Google Fonts (Poppins)** | Premium typography |

**Key frontend files:**
- `weather/Public/index.html` — Main layout, style declarations, HTML structure
- `weather/Public/app.js` — Core frontend controller & all engines
- `weather/Public/voiceService.js` — Voice assistant speech engine

---

### 🌐 External Libraries (CDN)

| Library | Version | Purpose |
|---------|---------|---------|
| **Chart.js** | Latest | Animated temperature trend line chart |
| **Leaflet.js** | v1.9.4 | Interactive map rendering (OpenStreetMap) |
| **Leaflet Routing Machine** | Latest | Turn-by-turn route calculation on map |

---

### ☁️ External APIs

| API | Provider | Usage |
|-----|----------|-------|
| **OpenWeatherMap Forecast API** | OpenWeather | 5-day / 3-hourly weather forecast data |
| **Google Gemini Flash** | Google AI | Live LLM-powered AI voice assistant responses |
| **OpenAI GPT-4o-mini** | OpenAI | Fallback LLM if Gemini is unavailable |
| **Nominatim Geocoding API** | OpenStreetMap | City name → lat/lon conversion for routing |
| **CARTO Voyager Tile Layer** | CARTO | Premium map tile styling |

---

### 🗄️ Database

| Tool | Purpose |
|------|---------|
| **MongoDB** | NoSQL document store for search history persistence |
| **Mongoose Schema** | `Weather` model stores `city`, `temperatures[]`, `times[]`, `createdAt` |

> ⚠️ MongoDB is optional — the app runs fully without it. DB errors are gracefully caught and the API continues serving weather data.

---

## 🎛️ Features Explained

### 1. 🌡️ Real-Time Weather Dashboard (Hero Card)
- Fetches live forecast from **OpenWeatherMap `/forecast` endpoint**
- Displays: temperature, weather condition, humidity, wind speed, UV index, visibility
- Dynamic 3D weather icon changes based on current condition (rain/snow/cloud/thunder/sun)

### 2. 📈 Hourly Trend Analytics Chart
- Powered by **Chart.js** — animated line chart
- Plots 16 × 3-hour intervals (48 hours ahead)
- Gradient fill, smooth curves, responsive sizing
- Auto-redraws on dark/light mode toggle

### 3. 🍃 Air Quality Index (AQI) Ring
- Visual radial ring with dynamic color coding:
  - 🟢 Green: Good (≤50)
  - 🟡 Yellow: Moderate (≤100)
  - 🟠 Orange: Unhealthy for Sensitive Groups (≤150)
  - 🔴 Red: Unhealthy/Hazardous (>150)

### 4. 🗺️ Radar Map with Danger Zones
- Interactive **Leaflet.js** map with CARTO Voyager tiles
- Pre-loaded with **4 hardcoded India danger zones** (Mumbai floods, Chennai cyclone, Delhi AQI, Kolkata storms) shown as pulsing red circle markers
- City search auto-pans the map

### 5. 🚦 Smart Flood-Avoidance Routing Engine
- **Origin + Destination** input fields inside the map card header
- Three ways to set the route:
  1. **Type city names** (geocoded via Nominatim API)
  2. **Type coordinates** (lat, lon format)
  3. **Click on the map** — first click = origin (green), second click = destination (red)
- Route drawn using **Leaflet Routing Machine** (OSRM engine)
- **Flood Detection Algorithm:**
  - After route calculation, all waypoints are checked against active danger zones
  - Uses point-to-line-segment distance geometry
  - If route passes within ~25km of a flood/cyclone/storm zone → detour calculated
  - Detour waypoint offset ~35km perpendicular to original route direction
  - Safe routes: **cyan line** | Detoured routes: **green line**
  - Alert banner overlay: `🚨 Flood Alert: [Zone]. Detoured!`

### 6. 🎙️ AI Voice Assistant
- Powered by **Web Speech API** (SpeechRecognition + SpeechSynthesis)
- Click the 🎙️ mic button → speak a question
- Assistant transcribes speech, sends context to backend `/api/chat`
- Backend passes weather context + question to **Google Gemini** (primary) or **GPT-4o-mini** (fallback)
- Offline fallback: heuristic rule-based response engine
- **Voice Routing Interception:** If you say *"navigate from Pune to Mumbai"* or *"route from Delhi to Chennai"* — the assistant **skips the LLM** and directly triggers the map routing engine

### 7. 🕰️ Smart Departure Optimizer
- Embedded inside the AI Recommendations card
- Analyzes the **next 3 hours** of forecast data
- Checks for: temperature drops >2°C, precipitation increases, visibility drops
- **If deteriorating:** `🚦 Heads up: Conditions expected to worsen by [Time].`
- **If clearing:** `🕰️ Great time to head out! Conditions are clearing.`

### 8. ⚠️ Weather Alerts Banner
- Auto-generated alerts based on live conditions:
  - Severe Thunderstorm Warning (thunderstorm detected)
  - Extreme Heat Warning (temp > 38°C)
  - High Wind Alert (wind > 15 m/s)

### 9. 🎨 2D Physics Background Engine (Canvas)
- Full-screen `<canvas>` with real-time particle systems:
  - 🌧️ **Rain:** 220 diagonal rain streaks, wind drift applied
  - ❄️ **Snow:** 140 floating snowflakes with sinusoidal drift
  - 🌫️ **Fog:** 60 soft radial fog blobs drifting slowly
  - 💨 **Wind:** 70 horizontal wind lines
  - ⚡ **Lightning:** Random DOM flash overlays with opacity animation
  - ☁️ **Clouds:** SVG-based cloud elements animated across screen
  - ☀️ **Sun pulse:** Fixed radial gradient orb with glow animation

### 10. 🌗 Dark/Light Mode Toggle
- Light: pastel pink-blue gradient, white glass cards
- Dark (Neon): deep purple-black radial gradient, glowing neon accents
- Chart, AQI, and UI all rerender in sync

---

## 📁 Project File Structure

```
Fsd/
├── .env                          # API Keys (OPENWEATHER_KEY, GEMINI_API_KEY)
├── server.js                     # Main Node.js backend server
├── package.json                  # npm dependencies manifest
├── node_modules/                 # Installed npm packages
└── weather/
    ├── models/
    │   └── Weather.js            # Mongoose schema for search history
    └── Public/
        ├── index.html            # Full UI — layout, styles, HTML markup
        ├── app.js                # Core frontend controller & all engines
        └── voiceService.js       # AI Voice Assistant service module
```

---

## 🔐 Environment Variables (`.env`)

```env
OPENWEATHER_KEY=your_openweathermap_api_key
GEMINI_API_KEY=your_google_gemini_api_key
OPENAI_API_KEY=your_openai_api_key     # optional fallback
MONGO_URI=mongodb://127.0.0.1:27017/weatherDB
PORT=5000
```

---

## 🚀 How to Run

```bash
# Navigate to project root
cd "C:\Users\Sadan A\OneDrive\Desktop\Fsd"

# Start server using Playwright's bundled Node.js runtime
& "C:\Users\Sadan A\AppData\Local\ms-playwright-go\1.57.0\node.exe" server.js

# App available at:
# http://localhost:5000
```

---

## 🔄 Data Flow Summary

```
User types city → app.js fetchWeatherData() → GET /api/weather/:city
  → server.js hits OpenWeatherMap API
  → Returns: temps[], times[], currentTemp, condition, humidity, wind, UV, alerts
  → Frontend renders: Hero card, Chart, AQI, Alert banners
  → renderDepartureAdvice() analyzes next 3 hours → Smart Suggestion card

User clicks Mic → voiceService.js SpeechRecognition starts
  → Transcribed text checked for routing keywords → if match: map routing triggered
  → Otherwise: POST /api/chat with weather context
  → server.js calls Gemini API → reply text
  → voiceService.js speaks reply + renders to AI card

User sets Origin + Destination → calculateAndDrawRoute()
  → Nominatim geocoding → lat/lon coordinates
  → Leaflet Routing Machine draws route via OSRM
  → routesfound event → checkAndAvoidFloods(waypoints)
  │   → If route passes through Mumbai floods (or another active warning)
  │   → Automatically shifts path perpendicular to the flood zone using a calculated detour
  │   → Renders the corrected detour route in green (Safe route: cyan)
```
