const jwt = require("jsonwebtoken");
const pool = require("./db"); // Assuming you have a database connection module

require('dotenv').config();

async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).send('Unauthorized: Token is missing');
    }

    jwt.verify(token, process.env.SECRET_KEY, async (err, decodedToken) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).send('Unauthorized: Token has expired');
            }
            return res.status(403).send('Forbidden: Invalid token');
        }

        try {
            // Fetch user information from the database using the username
            const result = await pool.query('SELECT id, username FROM users WHERE username = $1', [decodedToken.username]);
            const user = result.rows[0];

            if (!user) {
                return res.status(404).send('User not found');
            }

            // Include user information in the req.user object
            req.user = {
                id: user.id,
                username: user.username
            };

            next();
        } catch (error) {
            console.error(error);
            return res.status(500).send('Internal Server Error');
        }
    });
}

module.exports = authenticateToken;
