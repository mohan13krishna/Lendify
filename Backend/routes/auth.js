const express = require('express');
const database = require('../db');
const { generatePasswordHash, verifyPasswordHash, createAuthToken, generateCustomerAccountNumber, generateResourceId } = require('../utils/helpers');

const authenticationRouter = express.Router();

authenticationRouter.post('/register', async (request, response) => {
    const { name, age, email, password, phone, role, bankerId } = request.body;

    if (!name || !age || !email || !password || !phone || !role) {
        return response.status(400).json({ message: 'All required fields must be provided' });
    }

    try {
        const [existingUsers] = await database.execute('SELECT email FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return response.status(400).json({ message: 'An account with this email already exists' });
        }

        const hashedPassword = await generatePasswordHash(password);
        const userId = generateResourceId();
        let accountNumber = null;
        let customerAccountBalance = 0;
        let bankerWalletBalance = 0;
        let isUserApproved = false;

        if (role === 'customer') {
            accountNumber = generateCustomerAccountNumber();
            isUserApproved = true;
        } else if (role === 'banker') {
            bankerWalletBalance = 1000000;
        }

        await database.execute(
            'INSERT INTO users (id, name, age, email, password, phone, role, banker_id, is_approved, account_number, account_balance, wallet_balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, name, age, email, hashedPassword, phone, role, bankerId || null, isUserApproved, accountNumber, customerAccountBalance, bankerWalletBalance]
        );

        const [newUserRecord] = await database.execute('SELECT id, name, email, role, is_approved, account_number, account_balance, wallet_balance FROM users WHERE id = ?', [userId]);
        const newUser = newUserRecord[0];
        const token = createAuthToken({ id: newUser.id, role: newUser.role });

        response.status(201).json({
            message: 'User registered successfully',
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                isApproved: newUser.is_approved,
                accountNumber: newUser.account_number,
                accountBalance: parseFloat(newUser.account_balance),
                walletBalance: parseFloat(newUser.wallet_balance)
            },
            token
        });

    } catch (error) {
        console.error('Registration error:', error);
        response.status(500).json({ message: 'A server error occurred during registration' });
    }
});

authenticationRouter.post('/login', async (request, response) => {
    const { email, password } = request.body;

    if (!email || !password) {
        return response.status(400).json({ message: 'Email and password are required for login' });
    }

    try {
        const [userRecords] = await database.execute('SELECT * FROM users WHERE email = ?', [email]);
        const foundUser = userRecords[0];

        if (!foundUser) {
            return response.status(400).json({ message: 'Invalid login credentials' });
        }

        const isPasswordCorrect = await verifyPasswordHash(password, foundUser.password);
        if (!isPasswordCorrect) {
            return response.status(400).json({ message: 'Invalid login credentials' });
        }

        if (foundUser.role === 'banker' && !foundUser.is_approved) {
            return response.status(403).json({ message: 'Banker account pending admin approval' });
        }

        const token = createAuthToken({ id: foundUser.id, role: foundUser.role });

        response.status(200).json({
            message: 'Successfully logged in',
            user: {
                id: foundUser.id,
                name: foundUser.name,
                email: foundUser.email,
                role: foundUser.role,
                isApproved: foundUser.is_approved,
                accountNumber: foundUser.account_number,
                accountBalance: parseFloat(foundUser.account_balance),
                walletBalance: parseFloat(foundUser.wallet_balance)
            },
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        response.status(500).json({ message: 'A server error occurred during login' });
    }
});

module.exports = authenticationRouter;
