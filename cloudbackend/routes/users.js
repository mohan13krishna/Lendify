const express = require('express');
const database = require('../db');
const { ensureAuthenticated, restrictToRoles } = require('../middleware/auth');

const userRouter = express.Router();

userRouter.get('/', ensureAuthenticated, restrictToRoles('admin', 'banker', 'customer'), async (request, response) => {
    try {
        const { rows: allUsers } = await database.query('SELECT id, name, age, email, phone, role, banker_id, is_approved, account_number, account_balance, wallet_balance FROM users');
        const formattedUsers = allUsers.map(user => ({
            id: user.id,
            name: user.name,
            age: user.age,
            email: user.email,
            phone: user.phone,
            role: user.role,
            bankerId: user.banker_id,
            isApproved: user.is_approved,
            accountNumber: user.account_number,
            accountBalance: parseFloat(user.account_balance),
            walletBalance: parseFloat(user.wallet_balance)
        }));
        response.status(200).json(formattedUsers);
    } catch (error) {
        console.error('Error fetching users:', error);
        response.status(500).json({ message: 'A server error occurred while retrieving user data' });
    }
});

userRouter.put('/:id', ensureAuthenticated, restrictToRoles('admin'), async (request, response) => {
    const { id: userId } = request.params;
    const { isApproved, accountBalance, walletBalance } = request.body;

    try {
        const updateResult = await database.query(
            'UPDATE users SET is_approved = COALESCE($1, is_approved), account_balance = COALESCE($2, account_balance), wallet_balance = COALESCE($3, wallet_balance) WHERE id = $4',
            [isApproved, accountBalance, walletBalance, userId]
        );

        if (updateResult.rowCount === 0) {
            return response.status(404).json({ message: 'User not found for update' });
        }

        const { rows: updatedUserRecords } = await database.query('SELECT id, name, email, role, is_approved, account_number, account_balance, wallet_balance FROM users WHERE id = $1', [userId]);
        const updatedUser = updatedUserRecords[0];

        response.status(200).json({
            message: 'User profile updated successfully',
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                isApproved: updatedUser.is_approved,
                accountNumber: updatedUser.account_number,
                accountBalance: parseFloat(updatedUser.account_balance),
                walletBalance: parseFloat(updatedUser.wallet_balance)
            }
        });

    } catch (error) {
        console.error('Error updating user:', error);
        response.status(500).json({ message: 'A server error occurred while updating user data' });
    }
});

userRouter.delete('/:id', ensureAuthenticated, restrictToRoles('admin'), async (request, response) => {
    const { id: userId } = request.params;

    try {
        const deleteResult = await database.query('DELETE FROM users WHERE id = $1', [userId]);

        if (deleteResult.rowCount === 0) {
            return response.status(404).json({ message: 'User not found for deletion' });
        }

        response.status(200).json({ message: 'User successfully deleted' });
    } catch (error) {
        console.error('Error deleting user:', error);
        response.status(500).json({ message: 'A server error occurred while deleting user' });
    }
});

module.exports = userRouter;