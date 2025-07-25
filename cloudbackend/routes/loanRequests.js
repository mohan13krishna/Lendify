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

        await database.query(
            'INSERT INTO loan_requests (id, customer_id, customer_name, customer_email, amount, term_months, status, applied_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
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
        const { rows: pendingRequests } = await database.query('SELECT * FROM loan_requests WHERE status = $1', ['pending']);
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

loanRequestRouter.get('/customer-pending', ensureAuthenticated, restrictToRoles('customer'), async (request, response) => {
    try {
        const customerId = request.user.id;
        const { rows: customerPendingRequests } = await database.query(
            'SELECT * FROM loan_requests WHERE customer_id = $1 AND status = $2',
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
        const { rows: allRequests } = await database.query('SELECT * FROM loan_requests');
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


    const client = await database.connect(); // Get a client from the pool for transactions
    try {
        await client.query('BEGIN'); // Start transaction

        const { rows: requestRecords } = await client.query('SELECT * FROM loan_requests WHERE id = $1 FOR UPDATE', [requestId]);
        const loanRequest = requestRecords[0];

        if (!loanRequest) {
            await client.query('ROLLBACK'); // Rollback transaction
            return response.status(404).json({ message: 'Loan request not found' });
        }
        if (loanRequest.status !== 'pending') {
            await client.query('ROLLBACK'); // Rollback transaction
            return response.status(400).json({ message: 'Loan request already processed' });
        }

        if (approved) {
            const { rows: bankerRecords } = await client.query('SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE', [processingBankerId]);
            const bankerUser = bankerRecords[0];

            // FIX: Explicitly parse wallet_balance and loanRequest.amount to floats for numerical comparison
            const bankerWalletBalance = parseFloat(bankerUser.wallet_balance);
            const requestedLoanAmount = parseFloat(loanRequest.amount);

            // console.log('DEBUG: Banker ID:', processingBankerId); // Keep for debugging if needed
            // console.log('DEBUG: Banker Wallet Balance (parsed):', bankerWalletBalance); // Keep for debugging if needed
            // console.log('DEBUG: Loan Request Amount (parsed):', requestedLoanAmount); // Keep for debugging if needed

            if (!bankerUser || bankerWalletBalance < requestedLoanAmount) { // Use parsed values here
                await client.query('ROLLBACK'); // Rollback transaction
                return response.status(400).json({ message: 'Banker does not have sufficient wallet funds to issue this loan' });
            }

            const { rows: customerRecords } = await client.query('SELECT account_balance FROM users WHERE id = $1 FOR UPDATE', [loanRequest.customer_id]);
            const customerUser = customerRecords[0];
            if (!customerUser) {
                await client.query('ROLLBACK'); // Rollback transaction
                return response.status(404).json({ message: 'Associated customer not found' });
            }

            const calculatedMonthlyPayment = calculateLoanMonthlyPayment(requestedLoanAmount, parseFloat(interestRate), loanRequest.term_months); // Use parsed amount here
            const newLoanId = generateResourceId();
            const currentIssueDate = new Date().toISOString().split('T')[0];
            const firstDueDate = new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0];

            await client.query(
                'INSERT INTO loans (id, customer_id, amount, interest_rate, term_months, monthly_payment, status, start_date, next_due_date, issued_by_banker_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
                [newLoanId, loanRequest.customer_id, requestedLoanAmount, interestRate, loanRequest.term_months, calculatedMonthlyPayment, 'active', currentIssueDate, firstDueDate, processingBankerId] // Use parsed amount
            );

            await client.query(
                'UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2',
                [requestedLoanAmount, processingBankerId] // Use parsed amount here
            );

            await client.query(
                'UPDATE users SET account_balance = account_balance + $1 WHERE id = $2',
                [requestedLoanAmount, loanRequest.customer_id] // Use parsed amount here
            );

            await client.query(
                'UPDATE loan_requests SET status = $1, processed_by_banker_id = $2 WHERE id = $3',
                ['approved', processingBankerId, requestId]
            );

            await client.query('COMMIT');
            response.status(200).json({ message: 'Loan successfully approved and funds issued', loanId: newLoanId });

        } else {
            await client.query(
                'UPDATE loan_requests SET status = $1, processed_by_banker_id = $2 WHERE id = $3',
                ['rejected', processingBankerId, requestId]
            );
            await client.query('COMMIT');
            response.status(200).json({ message: 'Loan request successfully rejected' });
        }

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error processing loan request:', error);
        response.status(500).json({ message: 'A server error occurred while processing the loan request' });
    } finally {
        client.release();
    }
});

module.exports = loanRequestRouter;
