const express = require('express');
const database = require('../db');
const { ensureAuthenticated, restrictToRoles } = require('../middleware/auth');

const loanRouter = express.Router();

loanRouter.get('/', ensureAuthenticated, restrictToRoles('admin', 'banker'), async (request, response) => {
    try {
        const { rows: allLoans } = await database.query('SELECT l.*, u.name as customer_name, u.email as customer_email FROM loans l JOIN users u ON l.customer_id = u.id');
        const formattedLoans = allLoans.map(loan => ({
            id: loan.id,
            customerId: loan.customer_id,
            amount: parseFloat(loan.amount),
            interestRate: parseFloat(loan.interest_rate),
            termMonths: loan.term_months,
            monthlyPayment: parseFloat(loan.monthly_payment),
            status: loan.status,
            startDate: loan.start_date,
            paymentsMade: loan.payments_made,
            lastPaymentDate: loan.last_payment_date,
            nextDueDate: loan.next_due_date,
            issuedByBankerId: loan.issued_by_banker_id,
            customerName: loan.customer_name,
            customerEmail: loan.customer_email
        }));
        response.status(200).json(formattedLoans);
    } catch (error) {
        console.error('Error fetching all loans:', error);
        response.status(500).json({ message: 'A server error occurred while retrieving all loans' });
    }
});

loanRouter.get('/customer/:customerId', ensureAuthenticated, restrictToRoles('customer', 'banker', 'admin'), async (request, response) => {
    const { customerId } = request.params;

    if (request.user.role === 'customer' && request.user.id !== customerId) {
        return response.status(403).json({ message: 'Unauthorized: Cannot view other customer\'s loans' });
    }

    try {
        const { rows: customerLoans } = await database.query('SELECT * FROM loans WHERE customer_id = $1', [customerId]);
        const formattedLoans = customerLoans.map(loan => ({
            id: loan.id,
            customerId: loan.customer_id,
            amount: parseFloat(loan.amount),
            interestRate: parseFloat(loan.interest_rate),
            termMonths: loan.term_months,
            monthlyPayment: parseFloat(loan.monthly_payment),
            status: loan.status,
            startDate: loan.start_date,
            paymentsMade: loan.payments_made,
            lastPaymentDate: loan.last_payment_date,
            nextDueDate: loan.next_due_date,
            issuedByBankerId: loan.issued_by_banker_id
        }));
        response.status(200).json(formattedLoans);
    } catch (error) {
        console.error('Error fetching customer loans:', error);
        response.status(500).json({ message: 'A server error occurred while retrieving customer loans' });
    }
});

loanRouter.put('/:id/status', ensureAuthenticated, restrictToRoles('banker'), async (request, response) => {
    const { id: loanId } = request.params;
    const { status } = request.body;

    if (!['active', 'completed'].includes(status)) {
        return response.status(400).json({ message: 'Invalid loan status provided' });
    }

    try {
        const updateResult = await database.query('UPDATE loans SET status = $1 WHERE id = $2', [status, loanId]);

        if (updateResult.rowCount === 0) {
            return response.status(404).json({ message: 'Loan not found for status update' });
        }

        response.status(200).json({ message: 'Loan status updated successfully' });
    } catch (error) {
        console.error('Error updating loan status:', error);
        response.status(500).json({ message: 'A server error occurred while updating loan status' });
    }
});

module.exports = loanRouter;