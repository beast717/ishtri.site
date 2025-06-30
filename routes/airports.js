// routes/airports.js
const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Create a variable to cache the airports data in memory
let airportsData = [];

// Function to load and cache the airport data
const loadAirportsData = async () => {
    // Prevent re-loading if already cached
    if (airportsData.length > 0) {
        return;
    }
    try {
        // Correctly resolve the path from the project's root directory
        const dataPath = path.join(__dirname, '..', 'Public', 'data', 'airports.json');
        const data = await fs.readFile(dataPath, 'utf8');
        airportsData = JSON.parse(data);
    } catch (err) {
        console.error('Fatal Error: Could not load airports.json. Airport search will not work.', err);
        // In a real application, you might want to handle this more gracefully
    }
};

// --- The Airport Search API Endpoint ---
router.get('/search', (req, res) => {
    const query = (req.query.q || '').toLowerCase().trim();

    if (query.length < 2) {
        return res.json([]); // Return empty for short queries
    }

    // Filter the cached airport data
    const results = airportsData.filter(airport => 
        (airport.name && airport.name.toLowerCase().includes(query)) ||
        (airport.city && airport.city.toLowerCase().includes(query)) ||
        (airport.iata && airport.iata.toLowerCase() === query)
    ).slice(0, 10); // Limit results to the top 10

    res.json(results);
});

// Load the data as soon as this module is required
loadAirportsData();

module.exports = router;