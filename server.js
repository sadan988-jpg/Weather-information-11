const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const Weather = require("./weather/models/Weather");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "weather", "Public")));

// Safely connect to MongoDB, using local fallback if MONGO_URI is missing
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/weatherDB";
mongoose.connect(mongoUri)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.log("❌ MongoDB Error:", err.message));

// Simulated AI assistant engine fallback for offline/no-key usage
function getSimulatedResponse(question, weather) {
    const q = question.toLowerCase();
    const city = weather.city || "the selected city";
    const temp = weather.currentTemp;
    const cond = weather.currentCondition || "clear";
    const uv = weather.uv || 0;
    const hum = weather.humidity || 50;
    const wind = weather.windSpeed || 0;
    const condLower = cond.toLowerCase();

    let reply = "";

    if (q.includes("safe") || q.includes("go out") || q.includes("jogging") || q.includes("run") || q.includes("outside")) {
        if (temp > 35) {
            reply = `With a temperature of ${temp}°C in ${city}, there is a high heatstroke risk. I recommend seeking shade, limiting physical activity, and staying indoors.`;
        } else if (uv > 6) {
            reply = `The UV index is quite high at ${uv} in ${city}. I suggest avoiding outdoor activities between 1 PM and 3 PM, or applying high-factor sunscreen.`;
        } else if (condLower.includes("rain") || condLower.includes("thunderstorm") || condLower.includes("storm")) {
            reply = `It's currently ${condLower} in ${city}. Rain and lightning make it unsafe to do outdoor activities. Please stay indoors.`;
        } else {
            reply = `Yes, it's currently ${temp}°C and ${condLower} in ${city}. The weather is perfect for outdoor activities!`;
        }
    } else if (q.includes("thunderstorm") || q.includes("storm") || q.includes("lightning") || q.includes("cyclone") || q.includes("flood")) {
        if (condLower.includes("thunderstorm") || condLower.includes("storm") || condLower.includes("rain")) {
            reply = `Yes, there is a very high chance of thunderstorms and storms in ${city} right now! The current condition is ${condLower} and we have active weather warnings. Please remain safe indoors.`;
        } else {
            reply = `No, the current forecast for ${city} is showing ${condLower} skies with a temperature of ${temp}°C. There is no immediate chance of thunderstorms or severe storms.`;
        }
    } else if (q.includes("rain") || q.includes("wet") || q.includes("drizzle") || q.includes("umbrella") || q.includes("shower")) {
        if (condLower.includes("rain") || condLower.includes("thunderstorm") || condLower.includes("drizzle")) {
            reply = `Yes, it is currently ${condLower} in ${city}, so you will definitely need an umbrella or a raincoat if you go outside!`;
        } else {
            reply = `No rain is expected right now. The current condition in ${city} is ${condLower} and the humidity is ${hum}%, so no umbrella is needed.`;
        }
    } else if (q.includes("wear") || q.includes("dress") || q.includes("clothes") || q.includes("jacket") || q.includes("coat")) {
        if (temp < 10) {
            reply = `It is cold in ${city} at ${temp}°C. I suggest a thick winter jacket, scarf, and warm gloves.`;
        } else if (temp < 20) {
            reply = `The temperature is a cool ${temp}°C in ${city}. A light jacket, sweater, or hoodie would be perfect.`;
        } else if (condLower.includes("rain")) {
            reply = `Since it is currently raining in ${city}, carrying an umbrella or wearing a waterproof rain jacket is highly recommended.`;
        } else {
            reply = `It is a warm ${temp}°C in ${city}. A comfortable t-shirt and shorts will suit you best.`;
        }
    } else if (q.includes("temp") || q.includes("temperature") || q.includes("how hot") || q.includes("how cold") || q.includes("degree")) {
        reply = `The current temperature in ${city} is ${temp}°C, with a high today around ${Math.max(...(weather.temps || [temp]))}°C.`;
    } else if (q.includes("uv") || q.includes("sun") || q.includes("sunny") || q.includes("sunlight")) {
        if (uv > 6) {
            reply = `The UV index in ${city} is very high at ${uv}. You should apply sunscreen and avoid direct sunlight between 1 PM and 3 PM.`;
        } else {
            reply = `The UV index in ${city} is currently ${uv}, which is in the low-to-moderate safe range.`;
        }
    } else if (q.includes("humidity") || q.includes("humid") || q.includes("dry")) {
        if (hum < 20) {
            reply = `The humidity in ${city} is extremely low at ${hum}%. Stay hydrated to prevent dehydration!`;
        } else {
            reply = `The relative humidity in ${city} is currently ${hum}%, which is quite comfortable.`;
        }
    } else if (q.includes("wind") || q.includes("breeze") || q.includes("blow")) {
        reply = `The wind speed in ${city} is currently blowing at ${wind} meters per second.`;
    } else if (q.includes("hello") || q.includes("hi ") || q.includes("hey") || q.includes("who are you")) {
        reply = `Hello! I am your AI weather voice assistant. I can give you custom, specific advice about the weather in ${city}, which is currently ${temp}°C and ${condLower}. What would you like to know?`;
    } else {
        reply = `Currently in ${city}, it's ${temp}°C and ${condLower}. The UV index is ${uv} and humidity is ${hum}%. Let me know if you need specific advice about this weather!`;
    }

    return `${reply} (Note: Operating in simulated fallback mode. Set GEMINI_API_KEY in .env for real-time LLM responses.)`;
}

app.get("/api/weather/:city", async (req, res) => {
    const city = req.params.city;
    const apiKey = process.env.OPENWEATHER_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "API key is missing in server environment variables" });
    }

    try {
        const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;
        const response = await axios.get(url);

        // Filter: 16 intervals * 3 hours = 48 hours = 2-day forecast at 3-hour steps
        const forecastList = response.data.list.slice(0, 16);
        const temps = forecastList.map(i => Math.round(i.main.temp));
        const times = forecastList.map(i => {
            const date = new Date(i.dt * 1000);
            return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
                ", " +
                date.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
        });
        const conditions = forecastList.map(i => i.weather[0].main);

        // Current metric card data (first element represents the closest forecast/current state)
        const currentTemp = Math.round(response.data.list[0].main.temp);
        const currentCondition = response.data.list[0].weather[0].main;
        const resolvedCityName = response.data.city.name;

        // Extract additional parameters for health risk evaluation
        const humidity = response.data.list[0].main.humidity;
        const windSpeed = response.data.list[0].wind.speed;

        // Calculate a realistic UV index since it's not standard in forecast list
        let uv = 2;
        const condLower = currentCondition.toLowerCase();
        if (condLower.includes("clear")) {
            uv = currentTemp > 30 ? 8 : 6;
        } else if (condLower.includes("cloud")) {
            uv = 3;
        } else if (condLower.includes("rain") || condLower.includes("drizzle")) {
            uv = 1;
        } else if (condLower.includes("thunderstorm")) {
            uv = 1;
        }

        // Severe alert logic
        let alerts = [];
        if (condLower.includes("thunderstorm") || condLower.includes("storm")) {
            alerts.push({
                event: "Severe Thunderstorm Warning",
                description: "Severe thunderstorm detected in the area. Take shelter immediately and avoid using electrical appliances."
            });
        }
        if (currentTemp > 38) {
            alerts.push({
                event: "Extreme Heat Warning",
                description: "Dangerous temperatures above 38°C detected. Limit outdoor activities and drink plenty of fluids."
            });
        }
        if (windSpeed > 15) {
            alerts.push({
                event: "High Wind Alert",
                description: "Gale force winds detected. Secure loose outdoor items and avoid travel."
            });
        }

        // Async save to database
        try {
            await Weather.create({ city: resolvedCityName, temperatures: temps, times });
        } catch (dbErr) {
            console.error("⚠️ Database save failed:", dbErr.message);
        }

        res.json({
            city: resolvedCityName,
            currentTemp,
            currentCondition,
            times,
            temps,
            conditions,
            humidity,
            windSpeed,
            uv,
            alerts
        });
    } catch (err) {
        console.error("❌ Weather fetch failed:", err.message);
        res.status(404).json({ error: `City '${city}' not found or API issue` });
    }
});

// AI Voice Assistant secure chat endpoint
app.post("/api/chat", async (req, res) => {
    const { message, weatherContext } = req.body;
    const geminiKey = process.env.GEMINI_API_KEY;
    const openAIKey = process.env.OPENAI_API_KEY;

    if (!message || !weatherContext) {
        return res.status(400).json({ error: "Missing message or weatherContext in request body" });
    }

    const thinkingTrace = {
        prompt: `User Question: "${message}"\nWeather Context: ${JSON.stringify(weatherContext, null, 2)}`,
        systemInstruction: "You are a helpful, professional, and friendly weather voice assistant. Answer the user's question concisely based on the provided current weather data. Keep your answer brief, warm, and natural for a voice response (1-3 sentences).",
        model: "gemini-flash-latest / gpt-4o-mini",
        timestamp: new Date().toISOString()
    };

    if (geminiKey) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`;
            const response = await axios.post(url, {
                contents: [{
                    role: "user",
                    parts: [{
                        text: `${thinkingTrace.systemInstruction}\n\nWeather Context:\nCity: ${weatherContext.city}\nTemperature: ${weatherContext.currentTemp}°C\nCondition: ${weatherContext.currentCondition}\nUV Index: ${weatherContext.uv}\nHumidity: ${weatherContext.humidity}%\nWind Speed: ${weatherContext.windSpeed} m/s\nActive Alerts: ${JSON.stringify(weatherContext.alerts || [])}\n\nUser Question: ${message}`
                    }]
                }]
            });

            const reply = response.data.candidates[0].content.parts[0].text;
            return res.json({
                reply,
                trace: thinkingTrace,
                mode: "Live Gemini AI"
            });
        } catch (apiErr) {
            console.error("Gemini API call failed:", apiErr.message);
            const reply = getSimulatedResponse(message, weatherContext);
            return res.json({
                reply,
                trace: { ...thinkingTrace, error: apiErr.message },
                mode: "Simulated Heuristic Fallback (API error)"
            });
        }
    } else if (openAIKey) {
        try {
            const url = "https://api.openai.com/v1/chat/completions";
            const response = await axios.post(url, {
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: thinkingTrace.systemInstruction },
                    { role: "user", content: `Weather Context: ${JSON.stringify(weatherContext)}. User Question: ${message}` }
                ],
                max_tokens: 150
            }, {
                headers: {
                    "Authorization": `Bearer ${openAIKey}`,
                    "Content-Type": "application/json"
                }
            });
            const reply = response.data.choices[0].message.content;
            return res.json({
                reply,
                trace: thinkingTrace,
                mode: "Live OpenAI GPT-4o-mini"
            });
        } catch (apiErr) {
            console.error("OpenAI API call failed:", apiErr.message);
            const reply = getSimulatedResponse(message, weatherContext);
            return res.json({
                reply,
                trace: { ...thinkingTrace, error: apiErr.message },
                mode: "Simulated Heuristic Fallback (API error)"
            });
        }
    } else {
        const reply = getSimulatedResponse(message, weatherContext);
        return res.json({
            reply,
            trace: thinkingTrace,
            mode: "Simulated Heuristic Fallback (Key missing)"
        });
    }
});

app.get("/api/history", async (req, res) => {
    try {
        const items = await Weather.find().sort({ createdAt: -1 }).limit(10);
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;

// ⭐ SHOW FULL LOCALHOST URL
app.listen(PORT, () => {
    console.log(`🚀 Server running at: http://localhost:${PORT}`);
});