/**
 * WeatherTrendVisualizer - Core Frontend Application Controller
 * Manages weather state, Chart.js trends, Canvas weather effects,
 * Health Risk advisories, Emergency Alerts, and AI Voice Assistant integration.
 */

/* ============================
   State & Canvas Setup
   ============================ */
const fx = document.getElementById("effects");
const fxCtx = fx.getContext("2d");
const loader = document.getElementById("loader");
const chartCanvas = document.getElementById("chart");
let chart = null;
let particles = [];
let thunderInterval = null;
let cloudEls = [];
let sunEl = null;
let currentLoadedWeatherData = null; // Storing active context for AI voice consultation

function resizeCanvas(){ 
    if (fx) {
        fx.width = window.innerWidth; 
        fx.height = window.innerHeight; 
    }
}
resizeCanvas(); 
window.addEventListener('resize', resizeCanvas);

/* localStorage history key */
const HISTORY_KEY = 'wtv_history_colorful_v1';

/* ============================
   Upgraded Demo Data Heuristics
   ============================ */
function demoData(city) {
    const times = []; 
    const temps = []; 
    const conditions = [];
    const now = new Date();
    const conds = ["Clear", "Clouds", "Rain", "Snow", "Thunderstorm"];
    
    // Choose weather condition. Allow specific overrides for alerts testing!
    let randomCond = conds[Math.floor(Math.random() * conds.length)];
    const lCity = city.toLowerCase();
    
    if (lCity.includes("storm") || lCity.includes("emergency")) {
        randomCond = "Thunderstorm";
    } else if (lCity.includes("snow") || lCity.includes("cold")) {
        randomCond = "Snow";
    } else if (lCity.includes("rain") || lCity.includes("wet")) {
        randomCond = "Rain";
    } else if (lCity.includes("cloud") || lCity.includes("gray")) {
        randomCond = "Clouds";
    } else if (lCity.includes("sun") || lCity.includes("hot") || lCity.includes("dry")) {
        randomCond = "Clear";
    }

    for (let i = 0; i < 16; i++) { 
        const d = new Date(now.getTime() + i * 3 * 3600 * 1000);
        times.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + 
                   ", " + 
                   d.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }));
        
        let baseTemp = 16 + 6 * Math.sin(i / 2) + (Math.random() * 2 - 1) * 2;
        if (lCity.includes("hot")) baseTemp += 22; // Extreme hot (>35°C)
        if (lCity.includes("cold")) baseTemp -= 18; // Cold
        temps.push(Math.round(baseTemp));
        conditions.push(randomCond);
    }

    // Dynamic metrics for health risk engine
    let uv = Math.floor(Math.random() * 5); // Default safe UV
    let humidity = Math.floor(Math.random() * 50) + 30; // 30-80%
    let windSpeed = Math.floor(Math.random() * 12) + 2;

    if (lCity.includes("sun") || lCity.includes("hot")) uv = 8;     // UV > 6 trigger
    if (lCity.includes("dry") || lCity.includes("hot")) humidity = 15; // Humidity < 20% trigger
    
    // Inject emergency alerts
    let alerts = [];
    if (randomCond === "Thunderstorm" || lCity.includes("storm")) {
        alerts.push({
            event: "Severe Thunderstorm Warning",
            description: "Severe thunderstorm detected. High lightning risk and torrential downpours. Seek shelter immediately!"
        });
    }
    if (lCity.includes("cyclone")) {
        alerts.push({
            event: "Cyclone Emergency Alert",
            description: "Violent winds and extreme weather warnings in effect. Evacuate low-lying areas and remain indoors!"
        });
    }
    if (lCity.includes("flood")) {
        alerts.push({
            event: "Flash Flood Warning",
            description: "Rapid flooding detected in surrounding low-lying areas. Do not cross floodwaters on foot or by vehicle!"
        });
    }

    return {
        city: city.charAt(0).toUpperCase() + city.slice(1),
        times,
        temps,
        conditions,
        currentTemp: temps[0],
        currentCondition: randomCond,
        uv,
        humidity,
        windSpeed,
        alerts
    };
}

/* ============================
   Fetch Weather (Server Router or Demo Fallback)
   ============================ */
async function fetchWeatherData(city) {
    try {
        const response = await fetch(`/api/weather/${encodeURIComponent(city)}`);
        if (!response.ok) {
            const errorData = await response.json();
            flashTiny(errorData.error || "City not found on server.");
            return null;
        }
        const data = await response.json();
        return data;
    } catch (err) {
        console.warn("Express backend API unavailable. Swerving to client-side demonstration data generator.", err);
        return demoData(city);
    }
}

/* ============================
   Chart Drawing
   ============================ */
function drawChart(city, times, temps) {
    if (chart) {
        chart.destroy();
        chart = null;
    }
    
    const ctx = chartCanvas.getContext('2d');
    const bodyStyles = getComputedStyle(document.body);
    const accentPurple = bodyStyles.getPropertyValue('--accent2').trim() || '#7c4dff';
    const accentPink = bodyStyles.getPropertyValue('--accent1').trim() || '#ff4081';
    const textColor = bodyStyles.getPropertyValue('--text').trim() || '#0f1720';
    const mutedColor = bodyStyles.getPropertyValue('--muted').trim() || 'rgba(15, 23, 32, 0.55)';
    const gridColor = bodyStyles.getPropertyValue('--history-border').trim() || 'rgba(15, 23, 32, 0.06)';
    
    const fillGradient = ctx.createLinearGradient(0, 0, 0, chartCanvas.height || 300);
    fillGradient.addColorStop(0, accentPink + '3D'); // 24% opacity accent
    fillGradient.addColorStop(1, 'rgba(255, 64, 129, 0.00)');
    
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: times,
            datasets: [{
                label: `Temperature in ${city}`,
                data: temps,
                borderWidth: 4,
                borderColor: accentPurple,
                backgroundColor: fillGradient,
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: accentPurple,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointHoverRadius: 7,
                pointHoverBackgroundColor: accentPink,
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: bodyStyles.getPropertyValue('--glass').trim() || 'rgba(15, 23, 32, 0.85)',
                    titleColor: textColor,
                    bodyColor: textColor,
                    titleFont: { size: 14, weight: 'bold', family: 'Poppins' },
                    bodyFont: { size: 13, family: 'Poppins' },
                    padding: 12,
                    cornerRadius: 10,
                    displayColors: false,
                    borderColor: gridColor,
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) { return ` ${context.parsed.y} °C`; }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: mutedColor,
                        font: { family: 'Poppins', size: 11 }
                    }
                },
                y: {
                    grid: {
                        color: gridColor,
                        borderDash: [5, 5]
                    },
                    ticks: {
                        color: mutedColor,
                        font: { family: 'Poppins', size: 11 },
                        callback: function(value) { return value + '°C'; }
                    }
                }
            }
        }
    });
}

/* ============================
   Health Risk & Emergency Alert Engine
   ============================ */
function evaluateHealthAndEmergencyAlerts(data) {
    const healthContainer = document.getElementById("healthAdvisory");
    const emergencyOverlay = document.getElementById("emergencyModal");
    const emergencyTitle = document.getElementById("emergencyTitle");
    const emergencyDesc = document.getElementById("emergencyDesc");
    
    // Clear previous advisories
    healthContainer.innerHTML = "";
    healthContainer.style.display = "none";
    
    let advisories = [];
    
    // Core conditional advisory logic
    if (data.uv > 6) {
        advisories.push({
            type: "uv",
            class: "advisory-uv",
            icon: "☀️",
            label: "UV Alert",
            text: "High UV — Avoid direct sunlight from 1 PM–3 PM."
        });
    }
    
    if (data.humidity < 20) {
        advisories.push({
            type: "humidity",
            class: "advisory-humidity",
            icon: "💧",
            label: "Dehydration Advisory",
            text: "Low Humidity — Stay hydrated to prevent dehydration."
        });
    }
    
    if (data.currentTemp > 35) {
        advisories.push({
            type: "temp",
            class: "advisory-temp",
            icon: "🥵",
            label: "Extreme Heat advisory",
            text: "Heatstroke Risk — Seek shade and limit physical activity."
        });
    }
    
    // Render health advisories in glassmorphic top banner grid if applicable
    if (advisories.length > 0) {
        healthContainer.style.display = "grid";
        advisories.forEach(adv => {
            const card = document.createElement("div");
            card.className = `health-card ${adv.class}`;
            card.innerHTML = `
                <div class="health-card-header">
                    <span class="health-card-icon">${adv.icon}</span>
                    <strong class="health-card-label">${adv.label}</strong>
                </div>
                <div class="health-card-body">${adv.text}</div>
            `;
            healthContainer.appendChild(card);
        });
    }
    
    // Severe emergency popup overlay trigger
    if (data.alerts && data.alerts.length > 0) {
        const severeAlert = data.alerts[0]; // Capture highest priority
        emergencyTitle.textContent = severeAlert.event;
        emergencyDesc.textContent = severeAlert.description;
        
        // Unhide overlay and trigger CSS entry scaling
        emergencyOverlay.classList.add("active");
        
        // Play severe emergency sound cue (standard Thunder chimes!)
        try {
            const thunderSound = document.getElementById('thunderSound');
            if (thunderSound) {
                thunderSound.volume = 0.8;
                thunderSound.play().catch(e => console.log("Sound chimes deferred:", e));
            }
        } catch (e) {
            console.warn("Emergency chimes aborted:", e);
        }
    }
}

// Bind emergency modal dismissal button
document.getElementById("dismissEmergency").addEventListener("click", () => {
    const emergencyOverlay = document.getElementById("emergencyModal");
    emergencyOverlay.classList.remove("active");
    flashTiny("Emergency warning acknowledged");
});

/* ============================
   Local Storage Search History
   ============================ */
function loadHistoryData() { 
    try { 
        const r = localStorage.getItem(HISTORY_KEY); 
        return r ? JSON.parse(r) : []; 
    } catch(e) { 
        return []; 
    } 
}

function saveHistoryData(arr) { 
    localStorage.setItem(HISTORY_KEY, JSON.stringify(arr)); 
}

function addToHistory(city, temp, condition) {
    let hist = loadHistoryData();
    hist = hist.filter(h => h.city.toLowerCase() !== city.toLowerCase());
    
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 
                    ' (' + new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }) + ')';
    
    hist.unshift({ city, temp, condition, time: timeStr });
    if (hist.length > 5) hist = hist.slice(0, 5);
    
    saveHistoryData(hist);
}

const historyOverlay = document.getElementById('historyOverlay');
const historyPanel = document.getElementById('historyPanel');
const historyGrid = document.getElementById('historyGrid');

function openHistory() {
    const items = loadHistoryData();
    historyGrid.innerHTML = '';
    
    if (items.length === 0) {
        historyGrid.innerHTML = `<div style="padding:24px;color:var(--muted);text-align:center;width:100%">No history yet — search a city to save results.</div>`;
    } else {
        items.forEach((it, idx) => {
            const card = document.createElement('div');
            card.className = 'hist-card';
            card.style.background = `linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))`;
            card.style.border = `1px solid var(--history-border)`;
            card.style.cursor = 'pointer';
            card.innerHTML = `
                <div class="hist-city">${escapeHtml(it.city)}</div>
                <div class="hist-meta">${escapeHtml(it.time)}</div>
                <div class="hist-temp">${it.temp}°C • ${escapeHtml(it.condition)}</div>
                <div class="card-actions">
                    <button class="small-btn load-btn" style="background:linear-gradient(135deg,var(--accent2),#651fff);color:white;border:none;padding:4px 10px;border-radius:6px;font-weight:bold;cursor:pointer;">Search</button>
                </div>
            `;
            historyGrid.appendChild(card);
            setTimeout(() => card.classList.add('show'), 60 * idx);

            const handleSelect = (e) => {
                e.stopPropagation();
                document.getElementById('city').value = it.city;
                closeHistory();
                document.getElementById('showBtn').click();
            };
            card.addEventListener('click', handleSelect);
            card.querySelector('.load-btn').addEventListener('click', handleSelect);
        });
    }
    historyOverlay.classList.add('active');
    setTimeout(() => historyPanel.classList.add('show'), 20);
}

function closeHistory() { 
    historyPanel.classList.remove('show'); 
    setTimeout(() => historyOverlay.classList.remove('active'), 340); 
}

document.getElementById('historyBtn').addEventListener('click', openHistory);
document.getElementById('closeHistory').addEventListener('click', closeHistory);
historyOverlay.addEventListener('click', (e) => { if (e.target === historyOverlay) closeHistory(); });

document.getElementById('exportHistory').addEventListener('click', () => {
    if (!chart) {
        alert("No active weather trend chart to export. Please search for a city first.");
        return;
    }
    
    const labels = chart.data.labels;
    const temps = chart.data.datasets[0].data;
    let cityName = "City";
    if (chart.data.datasets[0] && chart.data.datasets[0].label) {
        cityName = chart.data.datasets[0].label.replace('Temperature in ', '').trim();
    }
    
    let csvContent = "Timestamp,Temperature (°C)\n";
    for (let i = 0; i < labels.length; i++) {
        const escapedLabel = String(labels[i]).replace(/"/g, '""');
        csvContent += `"${escapedLabel}",${temps[i]}\n`;
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeCityName = cityName.replace(/[^a-zA-Z0-9]/g, '_');
    
    link.setAttribute("href", url);
    link.setAttribute("download", `Weather_Trend_Report_${safeCityName}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    flashTiny('CSV Report exported successfully!');
});

document.getElementById('clearHistory').addEventListener('click', () => {
    localStorage.removeItem(HISTORY_KEY); 
    historyGrid.innerHTML = `<div style="padding:24px;color:var(--muted);text-align:center;width:100%">No history yet — search a city to save results.</div>`; 
    flashTiny('History cleared'); 
});

/* Helper Toasts */
function flashTiny(msg) {
    const t = document.createElement('div'); 
    t.textContent = msg;
    Object.assign(t.style, {
        position: 'fixed',
        left: '50%',
        top: '12%',
        transform: 'translateX(-50%)',
        padding: '10px 16px',
        borderRadius: '10px',
        background: 'rgba(0,0,0,0.85)',
        color: '#fff',
        zIndex: 1200,
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        fontSize: '13px',
        fontWeight: '600',
        transition: 'opacity 0.5s ease'
    });
    document.body.append(t);
    setTimeout(() => t.style.opacity = 0, 1500);
    setTimeout(() => t.remove(), 2100);
}

function escapeHtml(s) { 
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); 
}

/* ============================
   Sun / Clouds Management
   ============================ */
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

function clearClouds() { 
    cloudEls.forEach(c => c.remove()); 
    cloudEls = []; 
}

function showSun() { 
    removeSun(); 
    const s = document.createElement('div'); 
    s.className = 'sun'; 
    document.body.appendChild(s); 
    sunEl = s; 
}

function removeSun() { 
    if (sunEl) { 
        sunEl.remove(); 
        sunEl = null; 
    } 
}

/* ============================
   Canvas 2D Physics Particles
   ============================ */
function startRain(){ particles=[]; for(let i=0;i<220;i++){ particles.push({type:'rain', x:Math.random()*fx.width, y:Math.random()*fx.height, speed:8+Math.random()*6, length:12+Math.random()*12}); } }
function startSnow(){ particles=[]; for(let i=0;i<140;i++){ particles.push({type:'snow', x:Math.random()*fx.width, y:Math.random()*fx.height, r:1.5+Math.random()*3, speed:0.6+Math.random()*1.2}); } }
function startFog(){ particles=[]; for(let i=0;i<60;i++){ particles.push({type:'fog', x:Math.random()*fx.width, y:Math.random()*fx.height, r:80+Math.random()*60, alpha:0.02+Math.random()*0.03}); } }
function startWind(){ particles=[]; for(let i=0;i<70;i++){ particles.push({type:'wind', x:Math.random()*fx.width, y:Math.random()*fx.height, speed:1+Math.random()*2}); } }

function flashLightning() { 
    const f = document.createElement('div'); 
    f.className = 'flash'; 
    document.body.appendChild(f); 
    f.animate([{opacity:0},{opacity:1},{opacity:0.2},{opacity:1},{opacity:0}],{duration:380,easing:'ease-in-out'}); 
    setTimeout(() => f.remove(), 420); 
}

function startThunder() { 
    if (thunderInterval) clearInterval(thunderInterval); 
    thunderInterval = setInterval(() => { 
        if (Math.random() < 0.28) flashLightning(); 
    }, 700); 
}

function stopThunder() { 
    if (thunderInterval) { 
        clearInterval(thunderInterval); 
        thunderInterval = null; 
    } 
}

function clearExtras() { 
    clearClouds(); 
    removeSun(); 
    particles = []; 
    stopThunder(); 
}

/* ============================
   Sound & Ambient Control
   ============================ */
const rainSound = document.getElementById('rainSound');
const thunderSound = document.getElementById('thunderSound');

function applyWeatherEffects(cond) {
    cond = (cond || '').toLowerCase();
    clearExtras();
    
    try {
        rainSound.pause(); rainSound.currentTime = 0;
        thunderSound.pause(); thunderSound.currentTime = 0;
    } catch(e) { console.log("Ambient Audio not fully buffered yet:", e); }

    if (cond.includes('rain')) {
        document.body.style.background = 'linear-gradient(135deg,#a0c4ff,#bde0fe)';
        startRain(); spawnClouds(); stopThunder();
        rainSound.play().catch(e => console.log('Audio autoplay blocked by standard security policies:', e));
    }
    else if (cond.includes('snow')) {
        document.body.style.background = 'linear-gradient(135deg,#f8fbff,#e6f2ff)';
        startSnow(); spawnClouds(); stopThunder();
    }
    else if (cond.includes('thunder')) {
        document.body.style.background = 'linear-gradient(135deg,#23262b,#0b1b2b)';
        startRain(); spawnClouds(); startThunder();
        rainSound.play().catch(e => console.log('Autoplay handled:', e));
        thunderSound.play().catch(e => console.log('Autoplay handled:', e));
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

function set3DIcon(cond) {
    const icon = document.getElementById('weatherIcon3D');
    icon.style.opacity = 0; 
    icon.style.display = 'block'; 
    icon.style.transform = 'scale(.98)';
    cond = (cond || '').toLowerCase();
    
    if (cond.includes('rain')) {
        icon.src = "https://static.vecteezy.com/system/resources/previews/012/066/505/original/sunny-and-rainy-day-weather-forecast-icon-meteorological-sign-3d-render-png.png";
    } else if (cond.includes('snow')) {
        icon.src = "https://img.freepik.com/premium-vector/button-icon-weather-mobile-app-website-snow-weather-forecast-element-cloud-snowflakes-3d_313242-1440.jpg";
    } else if (cond.includes('cloud')) {
        icon.src = "https://tse2.mm.bing.net/th/id/OIP.9SmH6QOumZ61x5FqRuBc3AHaEK?pid=Api&P=0&h=180";
    } else if (cond.includes('thunder')) {
        icon.src = "https://static.vecteezy.com/system/resources/previews/012/806/415/original/3d-cartoon-weather-rain-clouds-with-thunderstorm-dark-cloud-sign-with-lightning-isolated-on-transparent-background-3d-render-illustration-png.png";
    } else {
        icon.src = "https://static.vecteezy.com/system/resources/previews/021/692/821/original/cute-3d-cartoon-weather-icons-set-sun-moon-cloud-rain-rain-drop-vector.jpg";
    }
    
    setTimeout(() => { 
        icon.style.opacity = 1; 
        icon.style.transform = 'scale(1)'; 
    }, 120);
}

/* Render Physics Loops */
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
            p.y += p.speed; 
            p.x += 0.6; 
            if (p.y > fx.height) { p.y = -20; p.x = Math.random() * fx.width; }
        } else if (p.type === 'snow') {
            fxCtx.fillStyle = 'rgba(255,255,255,0.95)'; 
            fxCtx.beginPath(); 
            fxCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2); 
            fxCtx.fill();
            p.y += p.speed; 
            p.x += Math.sin(p.y * 0.01); 
            if (p.y > fx.height) { p.y = -10; p.x = Math.random() * fx.width; }
        } else if (p.type === 'fog') {
            fxCtx.fillStyle = `rgba(255,255,255,${p.alpha})`; 
            fxCtx.beginPath(); 
            fxCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2); 
            fxCtx.fill();
            p.x += 0.1; 
            if (p.x > fx.width + 100) p.x = -100;
        } else if (p.type === 'wind') {
            fxCtx.fillStyle = 'rgba(255,255,255,0.10)'; 
            fxCtx.fillRect(p.x, p.y, 24, 2);
            p.x += p.speed + 2; 
            if (p.x > fx.width) p.x = -40;
        }
    }
    requestAnimationFrame(animate);
}
animate();

/* ============================
   UI Interactions: Show Trend
   ============================ */
async function loadCityTrend(cityName) {
    loader.style.display = 'inline-block';
    const data = await fetchWeatherData(cityName);
    loader.style.display = 'none';

    if (!data) return null;

    // Cache active weather details globally for voice interactions
    currentLoadedWeatherData = data;

    // 1. Draw chart
    drawChart(data.city, data.times, data.temps);

    // 2. Map current metrics header
    const subtitleEl = document.querySelector('.subtitle');
    if (subtitleEl) {
        subtitleEl.innerHTML = `Currently in <strong>${data.city}</strong>: ${data.currentTemp}°C • ${data.currentCondition} <br>
                                <small style="color:var(--muted)">UV Index: <strong>${data.uv}</strong> | Humidity: <strong>${data.humidity}%</strong> | Wind: <strong>${data.windSpeed} m/s</strong></small>`;
    }

    // 3. Trigger visual physics themes
    set3DIcon(data.currentCondition);
    applyWeatherEffects(data.currentCondition);

    // 4. Evaluate and render Health Risks + Emergency popups
    evaluateHealthAndEmergencyAlerts(data);

    // 5. Append unique search to LocalStorage
    addToHistory(data.city, data.currentTemp, data.currentCondition);
    
    // Clear old AI Speech balloons
    document.getElementById('aiSpeechBalloon').classList.remove('show');

    // Return loaded weather context for voice interactions
    return data;
}

document.getElementById('showBtn').addEventListener('click', () => {
    const cityInput = document.getElementById('city');
    const city = cityInput.value.trim();
    if (!city) return alert('Please enter a city name.');
    loadCityTrend(city);
});

document.getElementById('city').addEventListener('keydown', (e) => { 
    if (e.key === 'Enter') document.getElementById('showBtn').click(); 
});

/* ============================
   Neon Dark Mode Theme Switcher
   ============================ */
const darkBtn = document.getElementById('darkToggle');
let darkOn = false;

function updateModeText() {
    darkBtn.textContent = darkOn ? 'Mode: Neon Dark' : 'Mode: Colorful';
}

darkBtn.addEventListener('click', () => {
    darkOn = !darkOn;
    document.body.classList.toggle('colorful-dark', darkOn);
    updateModeText();

    if (darkOn) {
        document.documentElement.style.setProperty('--card-glow', '0 18px 70px rgba(99,91,255,0.24)');
    } else {
        document.documentElement.style.setProperty('--card-glow', '0 12px 40px rgba(124,77,255,0.12)');
    }

    // Refresh dynamic line chart styles matching current color variables
    if (chart) {
        const activeCity = chart.data.datasets[0].label.replace('Temperature in ', '');
        const activeTimes = chart.data.labels;
        const activeTemps = chart.data.datasets[0].data;
        drawChart(activeCity, activeTimes, activeTemps);
    }
});

/* ============================
   AI Voice Assistant Integration
   ============================ */
// Initialize modular voice service instance
let voiceAssistant = null;

try {
    if (window.WeatherVoiceAssistant) {
        voiceAssistant = new window.WeatherVoiceAssistant({
            onCityDetected: async (city) => {
                // Trigger auto-loading of the newly detected city in the UI and return data context
                document.getElementById('city').value = city;
                return await loadCityTrend(city);
            },
            onListeningChange: (isListening) => {
                const micBtn = document.getElementById('micBtn');
                const listeningIndicator = document.getElementById('listeningPulse');
                
                if (isListening) {
                    micBtn.classList.add('pulse-active');
                    listeningIndicator.classList.add('active');
                } else {
                    micBtn.classList.remove('pulse-active');
                    listeningIndicator.classList.remove('active');
                }
            },
            onTranscription: (transcript) => {
                // Render speech text inside debug speech input block
                document.getElementById('debugSpeechIn').value = transcript;
            },
            onAIThinking: (traceMessage, state) => {
                const debugStream = document.getElementById('debugThinkingStream');
                if (debugStream) {
                    const logEl = document.createElement('div');
                    logEl.className = `debug-log log-${state}`;
                    
                    // Format JSON display inside trace logging block
                    if (state === 'trace' || state === 'thinking') {
                        logEl.innerHTML = `<pre>${escapeHtml(traceMessage)}</pre>`;
                    } else {
                        logEl.textContent = `[${new Date().toLocaleTimeString()}] ${traceMessage}`;
                    }
                    
                    debugStream.appendChild(logEl);
                    debugStream.scrollTop = debugStream.scrollHeight; // Auto-scroll
                }
            },
            onResponse: (reply) => {
                // Show floating glass bubble balloon to represent AI text output visually
                const speechBalloon = document.getElementById('aiSpeechBalloon');
                speechBalloon.innerHTML = `<strong>🤖 Weather Assistant:</strong><br>${reply}`;
                speechBalloon.classList.add('show');
                
                // Keep showing for 10 seconds or clear when clicking balloon
                speechBalloon.onclick = () => speechBalloon.classList.remove('show');
            },
            onError: (errText) => {
                flashTiny(errText);
            }
        });
    }
} catch (voiceInitErr) {
    console.error("Critical error setting up speech bindings:", voiceInitErr);
}

// Bind Voice Microphone activation trigger
document.getElementById('micBtn').addEventListener('click', () => {
    if (!currentLoadedWeatherData) {
        flashTiny("⚠️ Search a city first to load weather context for the AI voice assistant!");
        return;
    }
    
    if (voiceAssistant) {
        voiceAssistant.startListening(currentLoadedWeatherData);
    } else {
        flashTiny("🎙️ Speech Recognition not supported in this browser.");
    }
});

// Bind Collapsible Debug Panel Logic
const debugHeader = document.getElementById('debugPanelHeader');
const debugPanel = document.getElementById('debugPanel');

debugHeader.addEventListener('click', () => {
    debugPanel.classList.toggle('collapsed');
});

// Bind clear debug button
document.getElementById('clearDebugLogs').addEventListener('click', (e) => {
    e.stopPropagation(); // Avoid folding the panel
    const debugStream = document.getElementById('debugThinkingStream');
    if (debugStream) {
        debugStream.innerHTML = `<div class="debug-log log-idle">Console cleared. Awaiting voice input...</div>`;
    }
});

/* ============================
   Application Initialization
   ============================ */
window.addEventListener('load', () => {
    // Spawn demo indicators instantly on load
    const demo = demoData('New York');
    currentLoadedWeatherData = demo; // Cache initial New York demo data
    
    drawChart(demo.city, demo.times, demo.temps);
    
    const subtitleEl = document.querySelector('.subtitle');
    if (subtitleEl) {
        subtitleEl.innerHTML = `Currently in <strong>${demo.city}</strong>: ${demo.currentTemp}°C • ${demo.currentCondition} <br>
                                <small style="color:var(--muted)">UV Index: <strong>${demo.uv}</strong> | Humidity: <strong>${demo.humidity}%</strong> | Wind: <strong>${demo.windSpeed} m/s</strong></small>`;
    }
    
    applyWeatherEffects(demo.currentCondition);
    set3DIcon(demo.currentCondition);
    evaluateHealthAndEmergencyAlerts(demo);
    
    // Warm up/prime standard speech synthesis voices on chrome/safari
    if (window.speechSynthesis) {
        window.speechSynthesis.getVoices();
    }
});

/* BeforeUnload Cleanups */
window.addEventListener('beforeunload', () => {
    if (thunderInterval) clearInterval(thunderInterval);
    if (voiceAssistant) voiceAssistant.stopSpeaking();
});
