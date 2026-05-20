/**
 * WeatherTrendVisualizer - Modular AI Voice Assistant Service
 * Integrates Web Speech API (SpeechRecognition + SpeechSynthesis) and server-side LLM endpoint
 */

class WeatherVoiceAssistant {
    constructor(options = {}) {
        // Event callback hooks for the main app UI
        this.onListeningChange = options.onListeningChange || (() => {});
        this.onTranscription = options.onTranscription || (() => {});
        this.onAIThinking = options.onAIThinking || (() => {});
        this.onResponse = options.onResponse || (() => {});
        this.onError = options.onError || (() => {});
        this.onCityDetected = options.onCityDetected || null; // Callback to trigger weather load for a city

        this.recognition = null;
        this.synth = window.speechSynthesis;
        this.currentUtterance = null;
        this.isListening = false;
        this.currentWeatherContext = null;
        
        this.initSpeechRecognition();
    }

    /**
     * Initializes speech recognition browser engine with fallback prefixes
     */
    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("⚠️ Web Speech API SpeechRecognition is not supported in this browser.");
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.lang = 'en-US';
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.onListeningChange(true);
            this.onAIThinking("🎙️ Microphone active. Speak now — I am listening to your query...", "listening");
            this.stopSpeaking(); // Cancel ongoing audio responses before recording
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.onListeningChange(false);
        };

        this.recognition.onerror = (event) => {
            console.error("Speech Recognition error details:", event.error);
            this.onError("Speech error: " + event.error);
            this.onAIThinking("❌ Microphone input failed: " + event.error, "error");
        };

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.onTranscription(transcript);
            this.onAIThinking(`🗣️ User asks: "${transcript}"`, "transcribed");
            
            // Intercept voice route requests: "route from X to Y", "navigate from X to Y", etc.
            const routeMatch = transcript.match(/(?:route|navigate|go|directions?)\s+(?:from\s+)?([a-zA-Z\s]+)\s+to\s+([a-zA-Z\s]+)/i);
            if (routeMatch && routeMatch[1] && routeMatch[2]) {
                const origin = routeMatch[1].trim();
                const destination = routeMatch[2].trim();
                
                this.onAIThinking(`🗺️ Routing action: Calculating route from "${origin}" to "${destination}"...`, "thinking");
                
                const startInput = document.getElementById('routeStart');
                const endInput = document.getElementById('routeEnd');
                if (startInput && endInput) {
                    startInput.value = origin;
                    endInput.value = destination;
                    if (window.calculateAndDrawRoute) {
                        window.calculateAndDrawRoute();
                    }
                }
                return; // STOP execution, bypass AI Assistant response
            }
            
            // Extract city name from the spoken question
            const detectedCity = this.extractCity(transcript);
            
            if (detectedCity && this.onCityDetected && 
                (!this.currentWeatherContext || this.currentWeatherContext.city.toLowerCase() !== detectedCity.toLowerCase())) {
                
                this.onAIThinking(`🔍 Agentic action: Detected city "${detectedCity}" in speech! Auto-fetching weather...`, "thinking");
                
                // Automatically fetch and render the new city's weather trend
                this.onCityDetected(detectedCity).then(newContext => {
                    if (newContext) {
                        this.currentWeatherContext = newContext;
                        this.onAIThinking(`✅ Switched context to ${newContext.city}. Consulting AI...`, "thinking");
                        this.askAI(transcript, newContext);
                    } else {
                        this.onAIThinking(`⚠️ City "${detectedCity}" not found. Keeping old context...`, "error");
                        this.askAI(transcript, this.currentWeatherContext);
                    }
                }).catch(err => {
                    console.error("Auto search failed:", err);
                    this.askAI(transcript, this.currentWeatherContext);
                });
            } else {
                if (this.currentWeatherContext) {
                    this.askAI(transcript, this.currentWeatherContext);
                } else {
                    this.onAIThinking("⚠️ Weather data context is missing. Fetch weather details first.", "error");
                    this.speak("I don't have the weather context for a city yet. Please search for a city first.");
                }
            }
        };
    }

    /**
     * Extracts a city name from the transcribed speech query
     */
    extractCity(question) {
        if (!question) return null;
        
        // Remove common punctuation marks
        const cleanQuestion = question.replace(/[?.,!]/g, '').trim();
        
        // List of regex patterns for extracting target city names
        const patterns = [
            /how is the weather in ([a-zA-Z\s]+)/i,
            /how is the weather of ([a-zA-Z\s]+)/i,
            /how is the weather for ([a-zA-Z\s]+)/i,
            /how is the weather ([a-zA-Z\s]+)/i,
            /how is weather in ([a-zA-Z\s]+)/i,
            /how is weather of ([a-zA-Z\s]+)/i,
            /how is weather for ([a-zA-Z\s]+)/i,
            /how is weather ([a-zA-Z\s]+)/i,
            /what is the weather in ([a-zA-Z\s]+)/i,
            /what is the weather of ([a-zA-Z\s]+)/i,
            /what is the weather for ([a-zA-Z\s]+)/i,
            /what is the weather ([a-zA-Z\s]+)/i,
            /what is weather in ([a-zA-Z\s]+)/i,
            /what is weather of ([a-zA-Z\s]+)/i,
            /what is weather for ([a-zA-Z\s]+)/i,
            /what is weather ([a-zA-Z\s]+)/i,
            /weather in ([a-zA-Z\s]+)/i,
            /weather of ([a-zA-Z\s]+)/i,
            /weather for ([a-zA-Z\s]+)/i,
            /how is it in ([a-zA-Z\s]+)/i,
            /what about ([a-zA-Z\s]+) weather/i,
            /what about ([a-zA-Z\s]+)/i,
            /show me ([a-zA-Z\s]+) weather/i,
            /show me weather for ([a-zA-Z\s]+)/i,
            /show me weather in ([a-zA-Z\s]+)/i,
            /show me ([a-zA-Z\s]+)/i,
            /in ([a-zA-Z\s]+)/i,
            /about ([a-zA-Z\s]+)/i,
            /for ([a-zA-Z\s]+)/i,
            /([a-zA-Z\s]+) weather/i
        ];

        for (const pattern of patterns) {
            const match = cleanQuestion.match(pattern);
            if (match && match[1]) {
                let city = match[1].trim();
                
                // Advanced prefix / suffix cleanup
                city = this.cleanCityString(city);
                if (!city) continue;

                // Exclude words that are part of speech rather than a city name
                const stopwords = [
                    "the", "my", "this", "today", "tomorrow", "now", "here", "a", "an", "out", "outside",
                    "celsius", "fahrenheit", "degrees", "degree", "wind", "windy", "rain", "rainy",
                    "snow", "snowy", "cloud", "cloudy", "sun", "sunny", "hot", "cold", "dry", "humidity",
                    "uv", "alert", "warning", "temp", "temperature", "there", "that", "it", "is", "was",
                    "your", "our", "me", "us", "them", "him", "her", "you", "i", "what"
                ];
                
                if (!stopwords.includes(city.toLowerCase()) && city.length > 2) {
                    return city;
                }
            }
        }
        
        // Fallback: If the user spoke a single word (e.g. "Bangalore"), treat it as the city
        const words = cleanQuestion.split(/\s+/);
        if (words.length === 1) {
            const word = words[0].trim();
            const stopwords = ["hello", "hi", "help", "yes", "no", "weather", "clear", "cloud", "rain", "snow", "temp", "hot", "cold", "dry", "uv", "alert"];
            if (!stopwords.includes(word.toLowerCase()) && word.length > 2) {
                return word;
            }
        }
        
        return null;
    }

    /**
     * Cleans up common prefixes and suffixes inside extracted city strings
     */
    cleanCityString(city) {
        if (!city) return null;
        let clean = city.toLowerCase();
        
        const prefixes = [
            "how is the weather in", "how is the weather of", "how is the weather for", "how is the weather",
            "how is weather in", "how is weather of", "how is weather for", "how is weather",
            "what is the weather in", "what is the weather of", "what is the weather for", "what is the weather",
            "what is weather in", "what is weather of", "what is weather for", "what is weather",
            "show me the weather in", "show me the weather of", "show me the weather for", "show me the weather",
            "show me weather in", "show me weather of", "show me weather for", "show me weather",
            "weather in", "weather of", "weather for", "weather",
            "how is it in", "what about", "show me", "tell me about", "tell me for", "tell me in", "tell me",
            "is it raining in", "is it sunny in", "is it cloudy in", "is it snowing in",
            "how is", "what is", "is it", "give me", "find", "search", "lookup", "check"
        ];
        
        for (const prefix of prefixes) {
            if (clean.startsWith(prefix + " ")) {
                clean = clean.slice(prefix.length + 1).trim();
            } else if (clean === prefix) {
                clean = "";
            }
        }
        
        const suffixes = ["today", "tomorrow", "now", "here", "weather"];
        for (const suffix of suffixes) {
            if (clean.endsWith(" " + suffix)) {
                clean = clean.slice(0, -suffix.length - 1).trim();
            } else if (clean === suffix) {
                clean = "";
            }
        }
        
        // Capitalize the first letter of each word to look premium
        return clean.replace(/\b\w/g, c => c.toUpperCase());
    }

    /**
     * Starts or stops recording depending on active speech state
     */
    startListening(weatherContext) {
        if (!this.recognition) {
            const msg = "Speech Recognition API is not supported in this browser environment.";
            this.onError(msg);
            this.speak(msg);
            return;
        }

        this.currentWeatherContext = weatherContext;
        
        if (this.isListening) {
            this.recognition.stop();
        } else {
            try {
                this.recognition.start();
            } catch (err) {
                console.error("Critical speech initialization error:", err);
                this.onAIThinking("❌ Failed to initiate voice layer: " + err.message, "error");
            }
        }
    }

    /**
     * Communicates user transcription to secure chat endpoint with full local weather metadata
     */
    async askAI(question, weatherContext) {
        this.onAIThinking("🧠 Assembling prompt context and analyzing weather indicators...", "thinking");
        
        const payloadContext = {
            city: weatherContext.city,
            currentTemp: weatherContext.currentTemp,
            currentCondition: weatherContext.currentCondition,
            uv: weatherContext.uv || 0,
            humidity: weatherContext.humidity || 50,
            windSpeed: weatherContext.windSpeed || 0,
            alerts: weatherContext.alerts || []
        };
        
        // Provide immediate visual transparency on prompt payload creation
        this.onAIThinking(`🔮 System Prompt System Context Payload:\n${JSON.stringify({
            role: "system",
            instruction: "You are a helpful, professional, and friendly weather voice assistant. Answer the user's question concisely based ONLY on the provided weather data. Keep responses warm and brief.",
            dataContext: payloadContext,
            query: question
        }, null, 2)}`, "trace");

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: question,
                    weatherContext: payloadContext
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error. Response status: ${response.status}`);
            }

            const data = await response.json();
            
            // Render detailed AI metadata to user's debug thinking console
            this.onAIThinking(`✨ Assistant Response [Mode: ${data.mode}]\n🤖 AI Response: "${data.reply}"`, "response");
            
            this.onResponse(data.reply);
            this.speak(data.reply);
        } catch (err) {
            console.error("API transmission failed:", err);
            this.onAIThinking("❌ Network transmission issue. Could not reach server voice assistant API.", "error");
            this.onError("Could not contact the weather AI server.");
        }
    }

    /**
     * Synthesizes audio speech output using browser speech synthesis
     */
    speak(text) {
        if (!this.synth) return;

        // Strip markdown notations and simulated warning suffixes to keep speech clean
        const speakText = text.replace(/[*#`_\-]/g, '').replace(/\(Note:.*\)/i, '').trim();

        this.stopSpeaking();

        this.currentUtterance = new SpeechSynthesisUtterance(speakText);
        this.currentUtterance.rate = 1.0;
        this.currentUtterance.pitch = 1.05; // Slightly warm friendly pitch
        
        // Dynamically extract Google/Natural premium English voice
        const voices = this.synth.getVoices();
        const naturalVoice = voices.find(voice => 
            voice.name.includes("Google US English") || 
            voice.name.includes("Natural") || 
            (voice.lang.startsWith("en") && voice.name.includes("Zira")) ||
            voice.lang === "en-US"
        );
        if (naturalVoice) {
            this.currentUtterance.voice = naturalVoice;
        }

        this.currentUtterance.onstart = () => {
            this.onAIThinking("🔊 Synthesizing output. Speaking answer back...", "speaking");
        };

        this.currentUtterance.onend = () => {
            this.onAIThinking("⏹️ Speech synthesis output complete.", "idle");
        };

        this.synth.speak(this.currentUtterance);
    }

    /**
     * Abruptly stops ongoing speech
     */
    stopSpeaking() {
        if (this.synth && this.synth.speaking) {
            this.synth.cancel();
        }
    }
}

// Mount onto standard window context for access inside app.js
window.WeatherVoiceAssistant = WeatherVoiceAssistant;
