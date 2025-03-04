const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const fs = require('fs').promises;
require('dotenv').config();
const db = require('./config/db');
const routes = require('./routes');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Add path to all views
app.use((req, res, next) => {
    res.locals.path = req.path;
    next();
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Mount routes
app.use('/', routes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error occurred:', {
        timestamp: new Date().toISOString(),
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        query: req.query,
        body: req.body
    });

    if (err.type === 'validation') {
        return res.status(400).render('error', {
            message: 'Validation Error',
            error: err.message
        });
    }

    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).render('error', {
            message: 'File Too Large',
            error: 'The uploaded file exceeds the size limit'
        });
    }

    res.status(err.status || 500).render('error', {
        message: 'An error occurred',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
});

// Handle 404
app.use((req, res) => {
    res.status(404).render('error', {
        message: 'Page not found',
        error: 'The requested page does not exist'
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;
