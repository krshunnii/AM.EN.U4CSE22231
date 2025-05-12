import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    AppBar, 
    Toolbar, 
    Typography, 
    Container, 
    Grid, 
    Paper, 
    Select, 
    MenuItem, 
    FormControl, 
    InputLabel 
} from '@mui/material';
import { 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend 
} from 'recharts';
import { 
    HeatMap 
} from '@mui/x-charts/HeatMap';

function StockPriceApp() {
    const [stocks, setStocks] = useState({});
    const [selectedTicker, setSelectedTicker] = useState('NVDA');
    const [timeFrame, setTimeFrame] = useState(50);
    const [stockPriceData, setStockPriceData] = useState([]);
    const [correlationMatrix, setCorrelationMatrix] = useState([]);

    // Fetch stocks list
    useEffect(() => {
        const fetchStocksList = async () => {
            try {
                const response = await axios.get('http://localhost:5000/stocks-list');
                setStocks(response.data.stocks);
            } catch (error) {
                console.error('Error fetching stocks:', error);
            }
        };
        fetchStocksList();
    }, []);

    // Fetch stock prices
    useEffect(() => {
        const fetchStockPrices = async () => {
            try {
                const response = await axios.get(
                    `http://localhost:5000/stocks/${selectedTicker}?minutes=${timeFrame}`
                );
                
                const formattedData = response.data.priceHistory.map(item => ({
                    price: item.price,
                    time: new Date(item.lastUpdatedAt).toLocaleTimeString()
                }));

                setStockPriceData(formattedData);
            } catch (error) {
                console.error('Error fetching stock prices:', error);
            }
        };

        if (selectedTicker) {
            fetchStockPrices();
        }
    }, [selectedTicker, timeFrame]);

    // Calculate correlation matrix
    useEffect(() => {
        const calculateCorrelations = async () => {
            const stockTickers = Object.values(stocks);
            const correlations = [];

            for (let i = 0; i < stockTickers.length; i++) {
                const rowCorrelations = [];
                for (let j = 0; j < stockTickers.length; j++) {
                    if (i === j) {
                        rowCorrelations.push(1);
                    } else {
                        try {
                            const response = await axios.get(
                                `http://localhost:5000/stockcorrelation?minutes=${timeFrame}&ticker=${stockTickers[i]}&ticker=${stockTickers[j]}`
                            );
                            rowCorrelations.push(response.data.correlation);
                        } catch (error) {
                            console.error('Error calculating correlation:', error);
                            rowCorrelations.push(0);
                        }
                    }
                }
                correlations.push(rowCorrelations);
            }

            setCorrelationMatrix(correlations);
        };

        if (Object.keys(stocks).length > 0) {
            calculateCorrelations();
        }
    }, [stocks, timeFrame]);

    return (
        <div>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6">Stock Price Aggregation</Typography>
                </Toolbar>
            </AppBar>
            <Container>
                <Grid container spacing={3}>
                    {/* Stock Price Chart */}
                    <Grid item xs={12} md={8}>
                        <Paper elevation={3} style={{ padding: '20px' }}>
                            <FormControl fullWidth>
                                <InputLabel>Select Stock</InputLabel>
                                <Select
                                    value={selectedTicker}
                                    label="Select Stock"
                                    onChange={(e) => setSelectedTicker(e.target.value)}
                                >
                                    {Object.entries(stocks).map(([name, ticker]) => (
                                        <MenuItem key={ticker} value={ticker}>
                                            {name} ({ticker})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl fullWidth style={{ marginTop: '10px' }}>
                                <InputLabel>Time Frame (minutes)</InputLabel>
                                <Select
                                    value={timeFrame}
                                    label="Time Frame"
                                    onChange={(e) => setTimeFrame(e.target.value)}
                                >
                                    {[10, 30, 50, 100].map(time => (
                                        <MenuItem key={time} value={time}>
                                            {time} minutes
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <LineChart width={600} height={300} data={stockPriceData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="time" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="price" stroke="#8884d8" />
                            </LineChart>
                        </Paper>
                    </Grid>

                    {/* Correlation Heatmap */}
                    <Grid item xs={12} md={4}>
                        <Paper elevation={3} style={{ padding: '20px' }}>
                            <Typography variant="h6">Stock Correlation Heatmap</Typography>
                            {correlationMatrix.length > 0 && (
                                <HeatMap
                                    xAxis={Object.values(stocks)}
                                    yAxis={Object.values(stocks)}
                                    data={correlationMatrix}
                                    height={400}
                                />
                            )}
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
        </div>
    );
}

export default StockPriceApp;