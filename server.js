const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const Weather = require("./weather/models/Weather");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.log("❌ MongoDB Error:", err));

app.get("/api/weather/:city", async (req, res) => {
    const city = req.params.city;
    const apiKey = process.env.OPENWEATHER_KEY;

    try {
        const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;
        const response = await axios.get(url);

        const temps = response.data.list.map(i => i.main.temp);
        const times = response.data.list.map(i => i.dt_txt);

        await Weather.create({ city, temperatures: temps, times });

        res.json({ city, temps, times });
    } catch (err) {
        res.status(400).json({ error: "Invalid city or API error" });
    }
});

app.get("/api/history", async (req, res) => {
    const items = await Weather.find().sort({ createdAt: -1 });
    res.json(items);
});

const PORT = 5000;

// ⭐ SHOW FULL LOCALHOST URL
app.listen(PORT, () => {
    console.log(`🚀 Server running at: http://localhost:${PORT}`);
});