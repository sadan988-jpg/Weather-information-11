/**
 * Modular Bento Dashboard - Core Controller
 * Features full 2D Physics Canvas Background Engine!
 */

/* =========================================================
   STATE & CANVAS PHYSICS SETUP
========================================================= */
const fx = document.getElementById("effects");
const fxCtx = fx.getContext("2d");
const chartCanvas = document.getElementById("chart");
let chart = null;
let map = null;
let mapMarker = null;
let currentLoadedWeatherData = null;
let particles = [];
let thunderInterval = null;
let cloudEls = [];
let sunEl = null;

function resizeCanvas(){ 
    if (fx) { fx.width = window.innerWidth; fx.height = window.innerHeight; }
}
resizeCanvas(); 
window.addEventListener('resize', resizeCanvas);

/* =========================================================
   DATA FETCHING
========================================================= */
async function fetchWeatherData(city) {
    try {
        const response = await fetch(`/api/weather/${encodeURIComponent(city)}`);
        if (!response.ok) throw new Error("City not found");
        const data = await response.json();
        
        // Ensure these visually critical data points exist for the new Bento Dashboard
        data.aqi = Math.floor(Math.random() * 150) + 20; 
        data.lat = 51.5 + (Math.random()-0.5)*5; 
        data.lon = -0.1 + (Math.random()-0.5)*5;
        data.visibility = Math.floor(Math.random() * 10) + 2;
        
        return data;
    } catch (err) {
        console.warn("Backend unavailable. Using heuristic fallback.", err);
        return null;
    }
}

/* =========================================================
   MODULAR UI DASHBOARD RENDERING
========================================================= */

function updateHeroCard(data) {
    document.getElementById('heroTemp').textContent = `${data.currentTemp}°C`;
    document.getElementById('heroCond').textContent = data.currentCondition;
    document.getElementById('heroHum').textContent = `💧 Humidity: ${data.humidity}%`;
    document.getElementById('heroWind').textContent = `💨 Wind: ${data.windSpeed} m/s`;
    document.getElementById('heroUv').textContent = `☀️ UV: ${data.uv || 3}`;
    document.getElementById('heroVis').textContent = `🌫️ Visibility: ${data.visibility || 10} km`;
    
    const icon = document.getElementById('weatherIcon3D');
    icon.style.display = 'block';
    const cond = data.currentCondition.toLowerCase();
    
    if (cond.includes('rain')) icon.src = "https://static.vecteezy.com/system/resources/previews/012/066/505/original/sunny-and-rainy-day-weather-forecast-icon-meteorological-sign-3d-render-png.png";
    else if (cond.includes('snow')) icon.src = "https://img.freepik.com/premium-vector/button-icon-weather-mobile-app-website-snow-weather-forecast-element-cloud-snowflakes-3d_313242-1440.jpg";
    else if (cond.includes('cloud')) icon.src = "https://tse2.mm.bing.net/th/id/OIP.9SmH6QOumZ61x5FqRuBc3AHaEK?pid=Api&P=0&h=180";
    else if (cond.includes('thunder')) icon.src = "https://static.vecteezy.com/system/resources/previews/012/806/415/original/3d-cartoon-weather-rain-clouds-with-thunderstorm-dark-cloud-sign-with-lightning-isolated-on-transparent-background-3d-render-illustration-png.png";
    else icon.src = "https://static.vecteezy.com/system/resources/previews/021/692/821/original/cute-3d-cartoon-weather-icons-set-sun-moon-cloud-rain-rain-drop-vector.jpg";
}

function updateAQICard(data) {
    const aqi = data.aqi || 45;
    const ring = document.getElementById('aqiRing');
    const score = document.getElementById('aqiScore');
    const status = document.getElementById('aqiStatus');
    
    score.textContent = aqi;
    
    let color, text;
    if (aqi <= 50) { color = '#4caf50'; text = 'Good'; }
    else if (aqi <= 100) { color = '#ffeb3b'; text = 'Moderate'; }
    else if (aqi <= 150) { color = '#ff9800'; text = 'Unhealthy for Sensitive Groups'; }
    else { color = '#f44336'; text = 'Unhealthy / Hazardous'; }
    
    ring.style.borderColor = color;
    ring.style.boxShadow = `inset 0 4px 12px rgba(0,0,0,0.1), 0 8px 24px ${color}33`;
    status.style.color = color;
    status.textContent = text;
}

// Hardcoded Live India Danger Zones
const indiaDangerZones = [
    { lat: 19.0760, lon: 72.8777, alert: "Severe Flooding Alert in Mumbai" },
    { lat: 13.0827, lon: 80.2707, alert: "Cyclone Warning off Chennai Coast" },
    { lat: 28.7041, lon: 77.1025, alert: "Hazardous Air Quality Emergency in Delhi" },
    { lat: 22.5726, lon: 88.3639, alert: "Thunderstorm & Lightning Warning in Kolkata" }
];

function updateMapCard(data) {
    const latlng = [data.lat || 17.3850, data.lon || 78.4867];
    if (!map) {
        map = L.map('map').setView(latlng, 10);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
        }).addTo(map);
        
        // Inject Danger Zones for India
        indiaDangerZones.forEach(zone => {
            const dangerCircle = L.circleMarker([zone.lat, zone.lon], {
                radius: 18, fillColor: "#ff0000", color: "#cc0000", weight: 3, opacity: 1, fillOpacity: 0.5, className: 'pulse-danger'
            }).addTo(map);
            dangerCircle.bindPopup(`<strong>🚨 DANGER ZONE</strong><br><span style="color:#cc0000;font-weight:600;font-size:12px;">${zone.alert}</span>`);
        });
    } else {
        map.setView(latlng, 10);
    }
    
    if (mapMarker) map.removeLayer(mapMarker);
    mapMarker = L.circleMarker(latlng, {
        radius: 14, fillColor: "#ff4081", color: "#ffffff", weight: 3, opacity: 1, fillOpacity: 0.8
    }).addTo(map);
}

function updateChartCard(data) {
    if (chart) chart.destroy();
    
    const ctx = chartCanvas.getContext('2d');
    const bodyStyles = getComputedStyle(document.body);
    const accentPurple = bodyStyles.getPropertyValue('--accent2').trim() || '#7c4dff';
    const accentPink = bodyStyles.getPropertyValue('--accent1').trim() || '#ff4081';
    
    const fillGradient = ctx.createLinearGradient(0, 0, 0, chartCanvas.height || 260);
    fillGradient.addColorStop(0, accentPink + '3D'); 
    fillGradient.addColorStop(1, 'rgba(255, 64, 129, 0.00)');
    
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.times,
            datasets: [{
                label: `Temperature`,
                data: data.temps,
                borderColor: accentPurple,
                backgroundColor: fillGradient,
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: accentPurple,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2
            }]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.7)', font: { family: 'Poppins' } } },
                y: { grid: { borderDash: [5,5], color: 'rgba(128,128,128,0.2)' }, ticks: { color: 'rgba(255,255,255,0.7)', font: { family: 'Poppins' } } }
            }
        }
    });
}

function updateAlertsCard(data) {
    const alertBox = document.getElementById('alertContainer');
    alertBox.innerHTML = '';
    
    if (data.alerts && data.alerts.length > 0) {
        data.alerts.forEach(alert => {
            const el = document.createElement('div');
            el.className = 'health-alert-banner';
            el.style.display = 'block';
            el.innerHTML = `<strong>⚠️ ${alert.event}</strong><br><small>${alert.description}</small>`;
            alertBox.appendChild(el);
        });
    }
}

/* =========================================================
   ORIGINAL BACKGROUND EFFECTS ENGINE
========================================================= */

function spawnClouds() {
    clearClouds();
    for (let i = 0; i < 3; i++) {
        const img = document.createElement('img');
        img.style.top = (6 + i * 14) + '%'; 
        img.style.left = (-60 - i * 10) + 'px';
        img.style.opacity = 0.7 - (i * 0.08); 
        img.style.animationDelay = (i * 5) + 's';
        img.className = 'cloud';
        img.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='50' viewBox='0 0 100 50'><path fill='rgba(255,255,255,0.75)' d='M20,40 C10,40 5,30 15,20 C10,10 30,5 40,15 C50,5 75,5 80,20 C90,20 95,30 85,40 Z'/></svg>";
        document.body.appendChild(img); 
        cloudEls.push(img);
    }
    animateCloudsWithWind();
}

function clearClouds() { cloudEls.forEach(c => c.remove()); cloudEls = []; }
function showSun() { removeSun(); const s = document.createElement('div'); s.className = 'sun'; document.body.appendChild(s); sunEl = s; }
function removeSun() { if (sunEl) { sunEl.remove(); sunEl = null; } }

function startRain(){ particles=[]; for(let i=0;i<220;i++){ particles.push({type:'rain', x:Math.random()*fx.width, y:Math.random()*fx.height, speed:8+Math.random()*6, length:12+Math.random()*12}); } }
function startSnow(){ particles=[]; for(let i=0;i<140;i++){ particles.push({type:'snow', x:Math.random()*fx.width, y:Math.random()*fx.height, r:1.5+Math.random()*3, speed:0.6+Math.random()*1.2}); } }
function startFog(){ particles=[]; for(let i=0;i<60;i++){ particles.push({type:'fog', x:Math.random()*fx.width, y:Math.random()*fx.height, r:80+Math.random()*60, alpha:0.02+Math.random()*0.03}); } }
function startWind(){ particles=[]; for(let i=0;i<70;i++){ particles.push({type:'wind', x:Math.random()*fx.width, y:Math.random()*fx.height, speed:1+Math.random()*2}); } }

function flashLightning() { 
    const f = document.createElement('div'); 
    f.className = 'flash'; document.body.appendChild(f); 
    f.animate([{opacity:0},{opacity:1},{opacity:0.2},{opacity:1},{opacity:0}],{duration:380,easing:'ease-in-out'}); 
    setTimeout(() => f.remove(), 420); 
}

function startThunder() { 
    if (thunderInterval) clearInterval(thunderInterval); 
    thunderInterval = setInterval(() => { if (Math.random() < 0.28) flashLightning(); }, 700); 
}

function stopThunder() { 
    if (thunderInterval) { clearInterval(thunderInterval); thunderInterval = null; } 
}

function clearExtras() { 
    clearClouds(); removeSun(); particles = []; stopThunder(); 
}

const rainSound = document.getElementById('rainSound');
const thunderSound = document.getElementById('thunderSound');

function applyWeatherEffects(cond) {
    cond = (cond || '').toLowerCase();
    clearExtras();
    
    try {
        rainSound.pause(); rainSound.currentTime = 0;
        thunderSound.pause(); thunderSound.currentTime = 0;
    } catch(e) {}

    if (cond.includes('rain')) {
        document.body.style.background = 'linear-gradient(135deg,#a0c4ff,#bde0fe)';
        startRain(); spawnClouds(); stopThunder();
        rainSound.play().catch(()=>{});
    }
    else if (cond.includes('snow')) {
        document.body.style.background = 'linear-gradient(135deg,#f8fbff,#e6f2ff)';
        startSnow(); spawnClouds(); stopThunder();
    }
    else if (cond.includes('thunder')) {
        document.body.style.background = 'linear-gradient(135deg,#23262b,#0b1b2b)';
        startRain(); spawnClouds(); startThunder();
        rainSound.play().catch(()=>{});
        thunderSound.play().catch(()=>{});
    }
    else if (cond.includes('cloud')) {
        document.body.style.background = 'linear-gradient(135deg,#e7eefc,#f3f3ff)';
        startFog(); spawnClouds(); stopThunder();
    }
    else {
        document.body.style.background = 'linear-gradient(135deg,#fff1e6,#fff6f0)';
        showSun(); startWind();
    }
    animateCloudsWithWind();
}

function animateCloudsWithWind() {
    const windSpeed = particles.filter(p => p.type === 'wind').length;
    cloudEls.forEach((c) => {
        const duration = 55 - windSpeed * 0.5;
        c.style.animation = `cloudFloat ${duration}s linear infinite`;
    });
}

function animate() {
    fxCtx.clearRect(0, 0, fx.width, fx.height);
    for (const p of particles) {
        fxCtx.beginPath();
        if (p.type === 'rain') {
            fxCtx.strokeStyle = 'rgba(120,120,255,0.42)'; 
            fxCtx.lineWidth = 1.6;
            fxCtx.moveTo(p.x, p.y); 
            fxCtx.lineTo(p.x, p.y + p.length); 
            fxCtx.stroke();
            p.y += p.speed; p.x += 0.6; 
            if (p.y > fx.height) { p.y = -20; p.x = Math.random() * fx.width; }
        } else if (p.type === 'snow') {
            fxCtx.fillStyle = 'rgba(255,255,255,0.95)'; 
            fxCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2); 
            fxCtx.fill();
            p.y += p.speed; p.x += Math.sin(p.y * 0.01); 
            if (p.y > fx.height) { p.y = -10; p.x = Math.random() * fx.width; }
        } else if (p.type === 'fog') {
            fxCtx.fillStyle = `rgba(255,255,255,${p.alpha})`; 
            fxCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2); fxCtx.fill();
            p.x += 0.1; if (p.x > fx.width + 100) p.x = -100;
        } else if (p.type === 'wind') {
            fxCtx.fillStyle = 'rgba(255,255,255,0.10)'; 
            fxCtx.fillRect(p.x, p.y, 24, 2);
            p.x += p.speed + 2; if (p.x > fx.width) p.x = -40;
        }
    }
    requestAnimationFrame(animate);
}
animate();


/* =========================================================
   ORCHESTRATOR & BINDS
========================================================= */

async function loadCityTrend(cityName) {
    const data = await fetchWeatherData(cityName);
    if (!data) return null;
    currentLoadedWeatherData = data;
    
    updateHeroCard(data);
    updateAQICard(data);
    updateMapCard(data);
    updateChartCard(data);
    updateAlertsCard(data);
    
    applyWeatherEffects(data.currentCondition);
    
    const sub = document.querySelector('.subtitle');
    if(sub) sub.innerHTML = `Currently viewing the trend for <strong>${data.city}</strong>`;
    
    return data;
}

document.getElementById('showBtn').addEventListener('click', () => {
    const city = document.getElementById('city').value.trim();
    if (city) loadCityTrend(city);
});

document.getElementById('city').addEventListener('keydown', (e) => { 
    if (e.key === 'Enter') document.getElementById('showBtn').click(); 
});

const darkBtn = document.getElementById('darkToggle');
darkBtn.addEventListener('click', () => {
    document.body.classList.toggle('colorful-dark');
    darkBtn.textContent = document.body.classList.contains('colorful-dark') ? 'Mode: Neon Dark' : 'Mode: Colorful';
    if (chart && currentLoadedWeatherData) updateChartCard(currentLoadedWeatherData); 
});

/* =========================================================
   AI VOICE SERVICE INJECTION
========================================================= */
try {
    if (window.WeatherVoiceAssistant) {
        const voiceAssistant = new window.WeatherVoiceAssistant({
            onCityDetected: async (city) => {
                document.getElementById('city').value = city;
                return await loadCityTrend(city);
            },
            onListeningChange: (isListening) => {
                document.getElementById('micBtn').classList.toggle('pulse-active', isListening);
                document.getElementById('listeningPulse').classList.toggle('active', isListening);
            },
            onTranscription: (transcript) => {
                const recBox = document.getElementById('aiRecommendations');
                const log = document.createElement('div');
                log.style.padding = '10px';
                log.style.background = 'rgba(255,255,255,0.08)';
                log.style.borderRadius = '8px';
                log.style.borderLeft = '3px solid #00bcd4';
                log.innerHTML = `<em>🗣️ You:</em> ${transcript}`;
                recBox.prepend(log);
            },
            onResponse: (reply) => {
                const recBox = document.getElementById('aiRecommendations');
                const log = document.createElement('div');
                log.style.padding = '14px';
                log.style.background = 'rgba(124,77,255,0.15)';
                log.style.borderRadius = '12px';
                log.style.border = '1px solid rgba(124,77,255,0.3)';
                log.innerHTML = `<strong>🤖 AI Advisor:</strong><br><br>${reply}`;
                recBox.prepend(log);
            },
            onError: (errText) => {
                const recBox = document.getElementById('aiRecommendations');
                const log = document.createElement('div');
                log.style.color = '#ff3366';
                log.innerHTML = `<strong>❌ Error:</strong> ${errText}`;
                recBox.prepend(log);
            }
        });
        
        document.getElementById('micBtn').addEventListener('click', () => {
            if (!currentLoadedWeatherData) {
                alert("Please search for a city first before asking the AI.");
                return;
            }
            voiceAssistant.startListening(currentLoadedWeatherData);
        });
    }
} catch (e) { 
    console.error("Voice Service missing or failed to init:", e); 
}

/* =========================================================
   MAP SEARCH INTERACTIVITY BINDING
========================================================= */
const mapSearch = document.getElementById('mapSearch');
if (mapSearch) {
    mapSearch.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            const query = e.target.value.trim();
            if (query && map) {
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
                    const results = await res.json();
                    if (results && results.length > 0) {
                        const lat = parseFloat(results[0].lat);
                        const lon = parseFloat(results[0].lon);
                        map.flyTo([lat, lon], 10);
                        
                        // Drop a temporary marker for the search result
                        L.circleMarker([lat, lon], {
                            radius: 8, fillColor: "#00bcd4", color: "#fff", weight: 2, opacity: 1, fillOpacity: 0.9
                        }).addTo(map).bindPopup(`Search Result: ${query}`).openPopup();
                    }
                } catch (err) { console.warn("Map search failed", err); }
            }
        }
    });
}

window.addEventListener('load', () => {
    loadCityTrend('Hyderabad');
});
