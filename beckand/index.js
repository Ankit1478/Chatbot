const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { ChromaClient } = require('chromadb');
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = 3001;

app.use(bodyParser.json());
app.use(cors());

const upload = multer({ dest: 'uploads/' });

async function processDocument(document, imagePath) {
    try {
        const client = new ChromaClient();
        const collection = await client.getOrCreateCollection({
            name: 'my_collection',
        });

        await collection.upsert({
            documents: [document],
            ids: ['doc1'],
        });

        console.log('Document upserted:', document);

        const results = await collection.query({
            queryTexts: [document],
            nResults: 1,
        });

        console.log('Chroma query results:', results);

        if (!results.documents || results.documents.length === 0) {
            throw new Error('No documents found in the Chroma response');
        }

        const vectorData = results.documents[0];
        console.log('Vector Data:', vectorData);

        if (imagePath) {
            console.log('Image Path:', imagePath);
           
        }

        const generatedText = await generateContent(JSON.stringify(vectorData));
        return generatedText;

    } catch (error) {
        console.error('Error processing document:', error);
        throw error;
    }
}

const formatGeneratedText = (text) => {
    return text
        .replace(/##+/g, '') 
        .replace(/\*\*/g, '') 
        .replace(/\*/g, '') 
        .replace(/- /g, '- ') 
        .replace(/- /g, '\n- ')
        .replace(/(\d\.)/g, '\n$1')
        .replace(/\n+/g, ' ') 
        .trim(); 
};

const generateContent = async (prompt) => {
    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GOOGLE_API_KEY}`,
            {
                contents: [
                    {
                        parts: [
                            { text: prompt }
                        ]
                    }
                ]
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
        const text = response.data.candidates[0].content.parts[0].text;
        return formatGeneratedText(text);
    } catch (error) {
        console.error('Error generating content:', error);
        return '';
    }
};

app.post('/process', upload.single('image'), async (req, res) => {
    const { document } = req.body;
    const imagePath = req.file ? req.file.path : null;

    try {
        const result = await processDocument(document, imagePath);
        res.json({ result });

        if (imagePath) {
            fs.unlinkSync(imagePath);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
