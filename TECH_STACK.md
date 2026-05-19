# 🚀 Tech Stack — Weather Trend Visualizer

This document details the technologies, frameworks, APIs, and libraries used to build the **Smart AI Weather Dashboard**.

## 🎨 Frontend (UI/UX & Client Logic)
*   **Vanilla HTML5 & CSS3:** Core markup and styling structure.
*   **Vanilla JavaScript (ES6):** Client-side application logic, DOM manipulation, and dynamic data rendering.
*   **CSS Grid & Flexbox:** Used to architect the responsive, highly-modular "Bento Box" dashboard layout.
*   **Glassmorphism CSS Engine:** Custom styling system utilizing CSS Variables (`:root`), `backdrop-filter: blur()`, and multi-layered radial/linear gradients for a premium visual aesthetic.
*   **HTML5 Canvas API:** Drives a custom-built 2D physics loop (inside `app.js`) to render ambient, interactive background animations (Rain, Snow, Lightning flashes, Wind, and Parallax Clouds).
*   **Chart.js:** Robust charting library utilized for plotting the interactive temperature trend analytics graph.
*   **Leaflet.js:** Lightweight and interactive geospatial mapping library rendering the radar map and danger zone overlays.
*   **Web Speech API:** Browser-native API utilizing `SpeechRecognition` (Voice-to-Text) and `SpeechSynthesis` (Text-to-Speech) to power the hands-free AI voice assistant interface.

## ⚙️ Backend (Server Architecture)
*   **Node.js:** The underlying JavaScript runtime environment powering the backend.
*   **Express.js:** Lightweight web application framework managing static file delivery and routing for the `/api/chat` and `/api/weather` endpoints.
*   **MongoDB & Mongoose:** NoSQL database schema and object modeling system used to persistently store and retrieve the user's city search history.
*   **Axios:** Promise-based server-side HTTP client used for robust communication with external AI providers.
*   **Dotenv:** Environment variable manager used to securely load and protect private API keys (`.env`).
*   **CORS:** Middleware configured to securely handle Cross-Origin Resource Sharing.

## 🤖 Artificial Intelligence & External APIs
*   **Google Gemini AI API (`gemini-flash-latest`):** The primary generative language model powering the AI assistant. It dynamically consumes localized weather context to return real-time, natural language health and activity recommendations.
*   **OpenAI API (`gpt-4o-mini`):** Configured as a fallback LLM integration within the routing architecture.
*   **OpenStreetMap Nominatim API:** Open-source geocoding API utilized to translate user-typed map searches (city/country names) into raw GPS coordinates to dynamically re-center the map interface.
*   **OpenWeatherMap API:** Live meteorological dataset provider, driving the core logic for temperature, humidity, wind, and forecast conditions.

## 🛠️ Environment & Version Control
*   **Git / GitHub:** Distributed version control and remote repository hosting.
*   **NPM (Node Package Manager):** Dependency resolution and script execution engine.
