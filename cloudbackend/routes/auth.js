const express = require('express');
const bcrypt = require('bcryptjs');
const database = require('../db');
const { generatePasswordHash, createAuthToken, verifyPasswordHash, generateCustomerAccountNumber, generateResourceId } = require('../utils/helpers');
const { ensureAuthenticated, restrictToRoles } = require('../middleware/auth'); // Re-import middleware

const authenticationRouter = express.Router();

authenticationRouter.post('/register', async (request, response) => {
    const { name, age, email, password, phone, role, bankerId } = request.body;

    if (!name || !age || !email || !password || !phone || !role) {
        return response.status(400).json({ message: 'All fields are required' });
    }

    try {
        // Changed .execute to .query and ? to $N
        const { rows: existingUsers } = await database.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUsers.length > 0) {
            return response.status(409).json({ message: 'Account with this email already exists' });
        }

        const hashedPassword = await generatePasswordHash(password);
        const userId = generateResourceId();

        let sql = '';
        let params = [];
        let newUser = {};

        if (role === 'customer') {
            const accountNumber = generateCustomerAccountNumber();
            sql = 'INSERT INTO users (id, name, age, email, password, phone, role, is_approved, account_number, account_balance, wallet_balance) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)';
            // PostgreSQL often expects explicit boolean values
            params = [userId, name, age, email, hashedPassword, phone, role, true, accountNumber, 0.00, 0.00];
            newUser = { id: userId, name, email, role, isApproved: true, accountNumber, accountBalance: 0.00, walletBalance: 0.00 };
        } else if (role === 'banker') {
            // is_approved defaults to false, wallet_balance initialized with 1,000,000
            sql = 'INSERT INTO users (id, name, age, email, password, phone, role, banker_id, is_approved, wallet_balance) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)';
            params = [userId, name, age, email, hashedPassword, phone, role, bankerId, false, 1000000.00];
            newUser = { id: userId, name, email, role, bankerId, isApproved: false, walletBalance: 1000000.00 };
        } else if (role === 'admin') {
            sql = 'INSERT INTO users (id, name, age, email, password, phone, role, is_approved) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';
            params = [userId, name, age, email, hashedPassword, phone, role, true];
            newUser = { id: userId, name, email, role, isApproved: true };
        } else {
            return response.status(400).json({ message: 'Invalid role specified' });
        }

        // Changed .execute to .query
        await database.query(sql, params);

        const token = createAuthToken({ id: userId, name: newUser.name, email: newUser.email, role: newUser.role });

        response.status(201).json({ message: 'Registration successful', user: newUser, token });

    } catch (error) {
        console.error('Error during registration:', error);
        response.status(500).json({ message: 'Registration failed due to a server error.' });
    }
});

authenticationRouter.post('/login', async (request, response) => {
    const { email, password } = request.body;

    if (!email || !password) {
        return response.status(400).json({ message: 'Email and password are required' });
    }

    try {
        // Changed .execute to .query
        const { rows: users } = await database.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = users[0];

        if (!user) {
            return response.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await verifyPasswordHash(password, user.password);
        if (!isMatch) {
            return response.status(401).json({ message: 'Invalid credentials' });
        }

        // Check for banker approval status
        if (user.role === 'banker' && !user.is_approved) {
            return response.status(403).json({ message: 'Your banker account is pending administrator approval.' });
        }

        const token = createAuthToken({ id: user.id, name: user.name, email: user.email, role: user.role });

        response.status(200).json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                bankerId: user.banker_id || null,
                isApproved: user.is_approved,
                accountNumber: user.account_number || null,
                accountBalance: parseFloat(user.account_balance) || 0.00,
                walletBalance: parseFloat(user.wallet_balance) || 0.00
            },
            token
        });

    } catch (error) {
        console.error('Error during login:', error);
        response.status(500).json({ message: 'Login failed due to a server error.' });
    }
});

module.exports = authenticationRouter;
