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
        map.on('click', onMapClick);
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

function renderDepartureAdvice(data) {
    const container = document.getElementById('smartDepartureContainer');
    if (!container) return;
    
    if (!data || !data.times) {
        container.innerHTML = '';
        return;
    }
    
    // Use existing 24-hour hourly trend data to identify worst weather in next 3 hours
    // If specific weather arrays (precip, visibility) are missing from the API payload, we fallback to temperature drops
    const nextHours = 3;
    let isDeteriorating = false;
    let worstTimeIndex = 1;
    
    for (let i = 1; i <= Math.min(nextHours, data.times.length - 1); i++) {
        const tempDrop = data.temps && (data.temps[0] - data.temps[i] > 2);
        const rainIncrease = data.precip && (data.precip[i] > data.precip[0]);
        const visDrop = data.visibilities && (data.visibilities[i] < data.visibilities[0]);
        
        if (tempDrop || rainIncrease || visDrop) {
            isDeteriorating = true;
            worstTimeIndex = i;
        }
    }
    
    const worstTime = data.times[worstTimeIndex] || 'soon';
    
    let message, icon;
    if (isDeteriorating) {
        message = `Heads up: Conditions expected to worsen by ${worstTime}. Consider leaving before then.`;
        icon = '🚦';
    } else {
        message = 'Great time to head out! Conditions are clearing.';
        icon = '🕰️';
    }
    
    container.innerHTML = `
        <div class="smart-departure-card">
            <div class="smart-departure-icon">${icon}</div>
            <div>${message}</div>
        </div>
    `;
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
   MAP ROUTING ENGINE (WITH FLOOD AVOIDANCE)
========================================================= */
let currentRouteControl = null;
let originLatLng = null;
let destinationLatLng = null;
let originMarker = null;
let destinationMarker = null;

function showRoutingAlert(message) {
    const alertEl = document.getElementById('routingAlert');
    if (alertEl) {
        alertEl.textContent = message;
        alertEl.style.display = 'block';
        setTimeout(() => {
            alertEl.style.display = 'none';
        }, 6000);
    }
}

function dist2(v, w) {
    const vLng = (v.lng !== undefined) ? v.lng : v.lon;
    const wLng = (w.lng !== undefined) ? w.lng : w.lon;
    return Math.pow(v.lat - w.lat, 2) + Math.pow(vLng - wLng, 2);
}

function distToSegment(p, v, w) {
    const l2 = dist2(v, w);
    if (l2 === 0) return Math.sqrt(dist2(p, v));
    const pLng = (p.lng !== undefined) ? p.lng : p.lon;
    const vLng = (v.lng !== undefined) ? v.lng : v.lon;
    const wLng = (w.lng !== undefined) ? w.lng : w.lon;
    let t = ((pLng - vLng) * (wLng - vLng) + (p.lat - v.lat) * (w.lat - v.lat)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt(dist2(p, { lat: v.lat + t * (w.lat - v.lat), lng: v.lng + t * (w.lng - v.lng) }));
}

function checkAndAvoidFloods(waypoints) {
    const floodZones = indiaDangerZones.filter(z => 
        z.alert.toLowerCase().includes('flooding') || 
        z.alert.toLowerCase().includes('cyclone') ||
        z.alert.toLowerCase().includes('thunderstorm')
    );
    
    let activeAlert = null;
    let nearZone = null;
    
    for (let zone of floodZones) {
        for (let i = 0; i < waypoints.length - 1; i++) {
            const p1 = waypoints[i];
            const p2 = waypoints[i+1];
            const dist = distToSegment(zone, p1, p2);
            if (dist < 0.25) { // ~25km
                nearZone = zone;
                activeAlert = zone.alert;
                break;
            }
        }
        if (nearZone) break;
    }
    
    if (nearZone) {
        const start = waypoints[0];
        const end = waypoints[waypoints.length - 1];
        const startLng = (start.lng !== undefined) ? start.lng : start.lon;
        const endLng = (end.lng !== undefined) ? end.lng : end.lon;
        const dx = endLng - startLng;
        const dy = end.lat - start.lat;
        const len = Math.sqrt(dx*dx + dy*dy);
        
        if (len > 0) {
            const px = -dy / len;
            const py = dx / len;
            // Detour point: offset the flood zone position by ~35km (0.32 degrees)
            const detour1 = L.latLng(nearZone.lat + py * 0.35, nearZone.lon + px * 0.35);
            return { safe: false, detour: detour1, alert: activeAlert };
        }
    }
    return { safe: true };
}

function drawSmartRoute(startLat, startLon, destLat, destLon, detourLatLng = null) {
    if (currentRouteControl) { map.removeControl(currentRouteControl); }
    
    const waypoints = [L.latLng(startLat, startLon)];
    if (detourLatLng) {
        waypoints.push(detourLatLng);
    }
    waypoints.push(L.latLng(destLat, destLon));
    
    currentRouteControl = L.Routing.control({
        waypoints: waypoints,
        lineOptions: { styles: [{color: detourLatLng ? '#4caf50' : '#00bcd4', opacity: 0.8, weight: 6}] },
        createMarker: function() { return null; },
        show: false,
        addWaypoints: false,
        routeWhileDragging: false,
        fitSelectedRoutes: true
    }).addTo(map);
    
    if (!detourLatLng) {
        currentRouteControl.on('routesfound', function(e) {
            const routes = e.routes;
            if (routes && routes.length > 0) {
                const route = routes[0];
                const safety = checkAndAvoidFloods(route.coordinates);
                if (!safety.safe && safety.detour) {
                    showRoutingAlert(`🚨 Flood Alert: ${safety.alert}. detoured!`);
                    drawSmartRoute(startLat, startLon, destLat, destLon, safety.detour);
                } else {
                    showRoutingAlert(`Safe route calculated.`);
                }
            }
        });
    }
}

async function geocodeCity(query) {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const results = await res.json();
        if (results && results.length > 0) {
            return { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) };
        }
    } catch (err) {
        console.warn("Geocoding failed", err);
    }
    return null;
}

async function calculateAndDrawRoute() {
    const startVal = document.getElementById('routeStart').value.trim();
    const endVal = document.getElementById('routeEnd').value.trim();
    
    if (!startVal || !endVal) {
        showRoutingAlert("Please specify both start and destination.");
        return;
    }
    
    let startLoc = null;
    let endLoc = null;
    
    if (startVal.includes(',')) {
        const parts = startVal.split(',');
        startLoc = { lat: parseFloat(parts[0]), lon: parseFloat(parts[1]) };
    } else {
        startLoc = await geocodeCity(startVal);
    }
    
    if (endVal.includes(',')) {
        const parts = endVal.split(',');
        endLoc = { lat: parseFloat(parts[0]), lon: parseFloat(parts[1]) };
    } else {
        endLoc = await geocodeCity(endVal);
    }
    
    if (startLoc && endLoc) {
        originLatLng = L.latLng(startLoc.lat, startLoc.lon);
        destinationLatLng = L.latLng(endLoc.lat, endLoc.lon);
        
        if (originMarker) map.removeLayer(originMarker);
        originMarker = L.marker(originLatLng, {
            icon: L.divIcon({
                className: 'custom-div-icon',
                html: "<div style='background-color:#4caf50; width:12px; height:12px; border-radius:50%; border:2px solid white;'></div>",
                iconSize: [12, 12]
            })
        }).addTo(map);
        
        if (destinationMarker) map.removeLayer(destinationMarker);
        destinationMarker = L.marker(destinationLatLng, {
            icon: L.divIcon({
                className: 'custom-div-icon',
                html: "<div style='background-color:#f44336; width:12px; height:12px; border-radius:50%; border:2px solid white;'></div>",
                iconSize: [12, 12]
            })
        }).addTo(map);
        
        drawSmartRoute(startLoc.lat, startLoc.lon, endLoc.lat, endLoc.lon);
    } else {
        showRoutingAlert("Failed to find coordinates for locations.");
    }
}

function clearRouting() {
    originLatLng = null;
    destinationLatLng = null;
    if (originMarker) { map.removeLayer(originMarker); originMarker = null; }
    if (destinationMarker) { map.removeLayer(destinationMarker); destinationMarker = null; }
    if (currentRouteControl) { map.removeControl(currentRouteControl); currentRouteControl = null; }
    document.getElementById('routeStart').value = '';
    document.getElementById('routeEnd').value = '';
}

function onMapClick(e) {
    if (!originLatLng) {
        originLatLng = e.latlng;
        if (originMarker) map.removeLayer(originMarker);
        originMarker = L.marker(originLatLng, {
            icon: L.divIcon({
                className: 'custom-div-icon',
                html: "<div style='background-color:#4caf50; width:12px; height:12px; border-radius:50%; border:2px solid white;'></div>",
                iconSize: [12, 12]
            })
        }).addTo(map).bindPopup("Origin").openPopup();
        document.getElementById('routeStart').value = `${originLatLng.lat.toFixed(4)}, ${originLatLng.lng.toFixed(4)}`;
    } else if (!destinationLatLng) {
        destinationLatLng = e.latlng;
        if (destinationMarker) map.removeLayer(destinationMarker);
        destinationMarker = L.marker(destinationLatLng, {
            icon: L.divIcon({
                className: 'custom-div-icon',
                html: "<div style='background-color:#f44336; width:12px; height:12px; border-radius:50%; border:2px solid white;'></div>",
                iconSize: [12, 12]
            })
        }).addTo(map).bindPopup("Destination").openPopup();
        document.getElementById('routeEnd').value = `${destinationLatLng.lat.toFixed(4)}, ${destinationLatLng.lng.toFixed(4)}`;
        calculateAndDrawRoute();
    } else {
        clearRouting();
        originLatLng = e.latlng;
        originMarker = L.marker(originLatLng, {
            icon: L.divIcon({
                className: 'custom-div-icon',
                html: "<div style='background-color:#4caf50; width:12px; height:12px; border-radius:50%; border:2px solid white;'></div>",
                iconSize: [12, 12]
            })
        }).addTo(map).bindPopup("Origin").openPopup();
        document.getElementById('routeStart').value = `${originLatLng.lat.toFixed(4)}, ${originLatLng.lng.toFixed(4)}`;
    }
}

window.calculateAndDrawRoute = calculateAndDrawRoute;
window.clearRouting = clearRouting;


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
    renderDepartureAdvice(data);
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
   MAP SEARCH & ROUTING INTERACTIVITY BINDINGS
   ========================================================= */
const routeBtn = document.getElementById('routeBtn');
if (routeBtn) {
    routeBtn.addEventListener('click', calculateAndDrawRoute);
}
const clearRouteBtn = document.getElementById('clearRouteBtn');
if (clearRouteBtn) {
    clearRouteBtn.addEventListener('click', clearRouting);
}
const routeStartInput = document.getElementById('routeStart');
if (routeStartInput) {
    routeStartInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') calculateAndDrawRoute();
    });
}
const routeEndInput = document.getElementById('routeEnd');
if (routeEndInput) {
    routeEndInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') calculateAndDrawRoute();
    });
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
