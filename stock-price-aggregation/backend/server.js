const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());

// Configuration for test server authentication
const TEST_SERVER_BASE_URL = 'http://20.244.56.144/evaluation-service';
const AUTH_CONFIG = {
    email: process.env.EMAIL,
    name: process.env.NAME,
    rollNo: process.env.ROLL_NO,
    accessCode: process.env.ACCESS_CODE,
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET
};

let ACCESS_TOKEN = null;

// Authentication middleware
async function authenticateAndGetToken() {
    try {
        const authResponse = await axios.post(`${TEST_SERVER_BASE_URL}/auth`, AUTH_CONFIG);
        ACCESS_TOKEN = authResponse.data.access_token;
    } catch (error) {
        console.error('Authentication failed:', error.response ? error.response.data : error.message);
        throw error;
    }
}

// Utility function to calculate correlation
function calculateCorrelation(stockA, stockB) {
    const calculateMean = (prices) => 
        prices.reduce((sum, item) => sum + item.price, 0) / prices.length;

    const calculateStandardDeviation = (prices, mean) => 
        Math.sqrt(
            prices.reduce((sum, item) => sum + Math.pow(item.price - mean, 2), 0) / 
            (prices.length - 1)
        );

    const calculateCovariance = (stockAData, stockBData, stockAMean, stockBMean) => {
        const minLength = Math.min(stockAData.length, stockBData.length);
        let covariance = 0;

        for (let i = 0; i < minLength; i++) {
            covariance += 
                (stockAData[i].price - stockAMean) * 
                (stockBData[i].price - stockBMean);
        }

        return covariance / (minLength - 1);
    };

    const stockAMean = calculateMean(stockA);
    const stockBMean = calculateMean(stockB);

    const stockAStdDev = calculateStandardDeviation(stockA, stockAMean);
    const stockBStdDev = calculateStandardDeviation(stockB, stockBMean);

    const covariance = calculateCovariance(stockA, stockB, stockAMean, stockBMean);

    // Pearson Correlation Coefficient
    return covariance / (stockAStdDev * stockBStdDev);
}

// Middleware to ensure authentication
async function ensureAuthenticated(req, res, next) {
    if (!ACCESS_TOKEN) {
        await authenticateAndGetToken();
    }
    next();
}

// Get stocks list
app.get('/stocks-list', ensureAuthenticated, async (req, res) => {
    try {
        const response = await axios.get(`${TEST_SERVER_BASE_URL}/stocks`, {
            headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stocks' });
    }
});

// Average Stock Price API
app.get('/stocks/:ticker', ensureAuthenticated, async (req, res) => {
    const { ticker } = req.params;
    const { minutes = 50 } = req.query;

    try {
        const response = await axios.get(
            `${TEST_SERVER_BASE_URL}/stocks/${ticker}?minutes=${minutes}`, 
            { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
        );

        const priceHistory = response.data;
        const averageStockPrice = priceHistory.reduce((sum, item) => sum + item.price, 0) / priceHistory.length;

        res.json({
            averageStockPrice,
            priceHistory
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stock prices' });
    }
});

// Stock Correlation API
app.get('/stockcorrelation', ensureAuthenticated, async (req, res) => {
    const { minutes = 50, ticker: tickers } = req.query;

    if (!tickers || tickers.length !== 2) {
        return res.status(400).json({ error: 'Exactly two tickers are required' });
    }

    try {
        const stockData = {};

        // Fetch price history for both stocks
        for (const ticker of tickers) {
            const response = await axios.get(
                `${TEST_SERVER_BASE_URL}/stocks/${ticker}?minutes=${minutes}`, 
                { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
            );

            stockData[ticker] = {
                priceHistory: response.data,
                averagePrice: response.data.reduce((sum, item) => sum + item.price, 0) / response.data.length
            };
        }

        // Calculate correlation
        const correlation = calculateCorrelation(
            stockData[tickers[0]].priceHistory, 
            stockData[tickers[1]].priceHistory
        );

        res.json({
            correlation,
            stocks: stockData
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to calculate stock correlation' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    authenticateAndGetToken(); // Initial authentication
});