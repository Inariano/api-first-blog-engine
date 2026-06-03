const express = require('express');
const app = express();

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'up',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
    });
});

module.exports = app;
