import express from 'express';
import bodyParser from 'body-parser';
import LlamaAI from 'llamaai';

const app = express();
const port = 3000;

// Replace with your actual API token
const apiToken = process.env.lemmaAi;
const llamaAPI = new LlamaAI(apiToken);

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Route to handle the request to LlamaAPI
app.post('/get-weather', async (req, res) => {
  const { location, days, unit } = req.body;

  const apiRequestJson = {
    "messages": [
        {"role": "user", "content": `What is the weather like in ${location}?`},
    ],
    "functions": [
        {
            "name": "get_current_weather",
            "description": "Get the current weather in a given location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "The city and state, e.g. San Francisco, CA",
                    },
                    "days": {
                        "type": "number",
                        "description": "for how many days ahead you want the forecast",
                    },
                    "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]},
                },
            },
            "required": ["location", "days"],
        }
    ],
    "stream": false,
    "function_call": "get_current_weather",
  };

  try {
    const response = await llamaAPI.run(apiRequestJson);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
