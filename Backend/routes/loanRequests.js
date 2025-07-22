const express = require('express');
const database = require('../db');
const { ensureAuthenticated, restrictToRoles } = require('../middleware/auth');
const { generateResourceId, calculateLoanMonthlyPayment } = require('../utils/helpers');

const loanRequestRouter = express.Router();

loanRequestRouter.post('/', ensureAuthenticated, restrictToRoles('customer'), async (request, response) => {
    const { customerId, customerName, customerEmail, amount, termMonths } = request.body;

    if (!customerId || !customerName || !customerEmail || !amount || !termMonths) {
        return response.status(400).json({ message: 'All loan request details must be provided' });
    }

    try {
        const newRequestId = generateResourceId();
        const currentDate = new Date().toISOString().split('T')[0];

        await database.execute(
            'INSERT INTO loan_requests (id, customer_id, customer_name, customer_email, amount, term_months, status, applied_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [newRequestId, customerId, customerName, customerEmail, amount, termMonths, 'pending', currentDate]
        );

        response.status(201).json({ message: 'Loan request submitted successfully', requestId: newRequestId });
    }
    catch (error) {
        console.error('Error submitting loan request:', error);
        response.status(500).json({ message: 'A server error occurred while submitting the loan request' });
    }
});

loanRequestRouter.get('/', ensureAuthenticated, restrictToRoles('banker', 'admin'), async (request, response) => {
    try {
        const [pendingRequests] = await database.execute('SELECT * FROM loan_requests WHERE status = ?', ['pending']);
        const formattedRequests = pendingRequests.map(req => ({
            id: req.id,
            customerId: req.customer_id,
            customerName: req.customer_name,
            customerEmail: req.customer_email,
            amount: parseFloat(req.amount),
            termMonths: req.term_months,
            status: req.status,
            appliedDate: req.applied_date,
            processedByBankerId: req.processed_by_banker_id
        }));
        response.status(200).json(formattedRequests);
    } catch (error) {
        console.error('Error fetching loan requests:', error);
        response.status(500).json({ message: 'A server error occurred while retrieving loan requests' });
    }
});

// NEW ENDPOINT FOR CUSTOMER'S OWN PENDING REQUESTS
loanRequestRouter.get('/customer-pending', ensureAuthenticated, restrictToRoles('customer'), async (request, response) => {
    try {
        const customerId = request.user.id; // Get customer ID from authenticated user payload
        const [customerPendingRequests] = await database.execute(
            'SELECT * FROM loan_requests WHERE customer_id = ? AND status = ?',
            [customerId, 'pending']
        );
        const formattedRequests = customerPendingRequests.map(req => ({
            id: req.id,
            customerId: req.customer_id,
            customerName: req.customer_name,
            customerEmail: req.customer_email,
            amount: parseFloat(req.amount),
            termMonths: req.term_months,
            status: req.status,
            appliedDate: req.applied_date,
            processedByBankerId: req.processed_by_banker_id
        }));
        response.status(200).json(formattedRequests);
    } catch (error) {
        console.error('Error fetching customer pending loan requests:', error);
        response.status(500).json({ message: 'A server error occurred while retrieving your pending loan requests' });
    }
});


loanRequestRouter.get('/all', ensureAuthenticated, restrictToRoles('admin'), async (request, response) => {
    try {
        const [allRequests] = await database.execute('SELECT * FROM loan_requests');
        const formattedRequests = allRequests.map(req => ({
            id: req.id,
            customerId: req.customer_id,
            customerName: req.customer_name,
            customerEmail: req.customer_email,
            amount: parseFloat(req.amount),
            termMonths: req.term_months,
            status: req.status,
            appliedDate: req.applied_date,
            processedByBankerId: req.processed_by_banker_id
        }));
        response.status(200).json(formattedRequests);
    } catch (error) {
        console.error('Error fetching all loan requests (admin):', error);
        response.status(500).json({ message: 'A server error occurred while retrieving all loan requests' });
    }
});


loanRequestRouter.put('/:id/process', ensureAuthenticated, restrictToRoles('banker'), async (request, response) => {
    const { id: requestId } = request.params;
    const { approved, interestRate } = request.body;
    const processingBankerId = request.user.id; 

    if (approved === undefined) {
        return response.status(400).json({ message: 'Approval status must be specified' });
    }
    if (approved && (interestRate === undefined || isNaN(interestRate) || interestRate < 0)) {
        return response.status(400).json({ message: 'A valid interest rate is required for loan approval' });
    }


    const transactionConnection = await database.getConnection();
    try {
        await transactionConnection.beginTransaction();

        const [requestRecords] = await transactionConnection.execute('SELECT * FROM loan_requests WHERE id = ? FOR UPDATE', [requestId]);
        const loanRequest = requestRecords[0];

        if (!loanRequest) {
            await transactionConnection.rollback();
            return response.status(404).json({ message: 'Loan request not found' });
        }
        if (loanRequest.status !== 'pending') {
            await transactionConnection.rollback();
            return response.status(400).json({ message: 'Loan request already processed' });
        }

        if (approved) {
            const [bankerRecords] = await transactionConnection.execute('SELECT wallet_balance FROM users WHERE id = ? FOR UPDATE', [processingBankerId]);
            const bankerUser = bankerRecords[0];
            if (!bankerUser || bankerUser.wallet_balance < loanRequest.amount) {
                await transactionConnection.rollback();
                return response.status(400).json({ message: 'Banker does not have sufficient wallet funds to issue this loan' });
            }

            const [customerRecords] = await transactionConnection.execute('SELECT account_balance FROM users WHERE id = ? FOR UPDATE', [loanRequest.customer_id]);
            const customerUser = customerRecords[0];
            if (!customerUser) {
                await transactionConnection.rollback();
                return response.status(404).json({ message: 'Associated customer not found' });
            }

            const calculatedMonthlyPayment = calculateLoanMonthlyPayment(loanRequest.amount, parseFloat(interestRate), loanRequest.term_months);
            const newLoanId = generateResourceId();
            const currentIssueDate = new Date().toISOString().split('T')[0];
            const firstDueDate = new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0];

            await transactionConnection.execute(
                'INSERT INTO loans (id, customer_id, amount, interest_rate, term_months, monthly_payment, status, start_date, next_due_date, issued_by_banker_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [newLoanId, loanRequest.customer_id, loanRequest.amount, interestRate, loanRequest.term_months, calculatedMonthlyPayment, 'active', currentIssueDate, firstDueDate, processingBankerId]
            );

            await transactionConnection.execute(
                'UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?',
                [loanRequest.amount, processingBankerId]
            );

            await transactionConnection.execute(
                'UPDATE users SET account_balance = account_balance + ? WHERE id = ?',
                [loanRequest.amount, loanRequest.customer_id]
            );

            await transactionConnection.execute(
                'UPDATE loan_requests SET status = ?, processed_by_banker_id = ? WHERE id = ?',
                ['approved', processingBankerId, requestId]
            );

            await transactionConnection.commit();
            response.status(200).json({ message: 'Loan successfully approved and funds issued', loanId: newLoanId });

        } else {
            await transactionConnection.execute(
                'UPDATE loan_requests SET status = ?, processed_by_banker_id = ? WHERE id = ?',
                ['rejected', processingBankerId, requestId]
            );
            await transactionConnection.commit();
            response.status(200).json({ message: 'Loan request successfully rejected' });
        }

    } catch (error) {
        await transactionConnection.rollback();
        console.error('Error processing loan request:', error);
        response.status(500).json({ message: 'A server error occurred while processing the loan request' });
    } finally {
        transactionConnection.release();
    }
});

module.exports = loanRequestRouter;