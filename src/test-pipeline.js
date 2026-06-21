// test-app/app.js
const express = require('express');
const app = express();

app.use(express.json());

// Dummy middleware to trigger the "requiresAuth" logic
const verifyToken = (req, res, next) => next();

// 1. A public route with a query parameter (Prime target for XSS/SQLi)
app.get('/api/products', (req, res) => {
    const searchQuery = req.query.search;
    res.json({ message: `Searching for ${searchQuery}` });
});

// 2. A protected route with body parameters (Prime target for 401 and 400 validation)
app.post('/api/users/login', verifyToken, (req, res) => {
    const { email, password } = req.body;
    res.json({ token: "fake-jwt-token", user: email });
});

// 3. A route with a path parameter
app.delete('/api/posts/:id', verifyToken, (req, res) => {
    const postId = req.params.id;
    res.status(200).json({ success: true, deletedId: postId });
});

module.exports = app;