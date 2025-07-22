document.addEventListener('DOMContentLoaded', async () => {
    let currentUser = verifyAuthenticationAndRedirect();
    if (!currentUser || currentUser.role !== 'customer') {
        clearUserSession();
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('userName').textContent = `Hello, ${currentUser.name}!`;

    const sidebarContainer = document.getElementById('sidebar-wrapper');
    const menuToggleButton = document.getElementById('menu-toggle');
    const dashboardContentSections = document.querySelectorAll('.dashboard-content');
    const navigationLinks = document.querySelectorAll('.list-group-item-action');

    const activeLoansDisplay = document.querySelector('#my-loans-content #loanList tbody');
    const noActiveLoansMessage = document.getElementById('noActiveLoansMessage');
    const paymentScheduleTableBody = document.querySelector('#my-loans-content #paymentSchedule tbody');
    const loanApplicationForm = document.getElementById('applyLoanForm');
    const pendingRequestsDisplay = document.querySelector('#overview-content #pendingRequestsList tbody');
    const noPendingRequestsMessage = document.querySelector('#overview-content #noPendingRequestsMessage');

    const activeLoansCounter = document.getElementById('activeLoansCount');
    const pendingRequestsCounter = document.getElementById('pendingRequestsCount');
    const customerAccountBalanceDisplay = document.getElementById('displayAccountBalance');
    const totalActiveLoanValueElement = document.getElementById('totalActiveLoanValue');

    const userInfoFields = {
        name: document.getElementById('displayCustomerName'),
        email: document.getElementById('displayEmail'),
        phone: document.getElementById('displayPhone'),
        role: document.getElementById('displayRole'),
        accountNumber: document.getElementById('displayAccountNumber'),
        accountBalance: document.getElementById('displayAccountBalance')
    };

    menuToggleButton.addEventListener('click', () => {
        sidebarContainer.classList.toggle('toggled');
        document.getElementById('page-content-wrapper').classList.toggle('toggled');
    });

    navigationLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const targetContentId = this.dataset.target;

            navigationLinks.forEach(item => item.classList.remove('active'));
            this.classList.add('active');

            dashboardContentSections.forEach(content => {
                content.classList.remove('active-content');
            });

            document.getElementById(targetContentId).classList.add('active-content');
            updateVisibleDashboardContent(targetContentId);
        });
    });

    const updateVisibleDashboardContent = async (contentId) => {
        try {
            const usersResponse = await apiFetchAllUsers();
            if (usersResponse.success) {
                currentUser = usersResponse.users.find(user => user.id === currentUser.id);
                setSessionData('loggedInUser', currentUser);
                updateUserProfileInformation();
            } else {
                alert('Failed to refresh user data: ' + usersResponse.message);
            }
        } catch (error) {
            alert('Error accessing latest user data: ' + error.message);
        }

        switch (contentId) {
            case 'overview-content':
                await refreshDashboardAnalytics();
                await displayPendingLoanRequests();
                break;
            case 'my-loans-content':
                await displayCustomerLoanDetails();
                break;
        }
    };

    const updateUserProfileInformation = () => {
        userInfoFields.name.textContent = currentUser.name;
        userInfoFields.email.textContent = currentUser.email;
        userInfoFields.phone.textContent = currentUser.phone;
        userInfoFields.role.textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
        userInfoFields.accountNumber.textContent = currentUser.accountNumber || 'N/A';
        userInfoFields.accountBalance.textContent = `$${(currentUser.accountBalance || 0).toFixed(2)}`;
    };

    document.getElementById('logoutBtn').addEventListener('click', () => {
        clearUserSession();
        alert('You have been logged out.');
        window.location.href = 'login.html';
    });

    loanApplicationForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const requestedAmount = parseFloat(document.getElementById('desiredAmount').value);
        const requestedTerm = parseInt(document.getElementById('desiredTerm').value);

        if (isNaN(requestedAmount) || requestedAmount <= 0) {
            alert('Please enter a valid loan amount.');
            return;
        }
        if (isNaN(requestedTerm) || requestedTerm <= 0) {
            alert('Please enter a valid loan term in months.');
            return;
        }

        const newLoanRequestData = {
            customerId: currentUser.id,
            customerName: currentUser.name,
            customerEmail: currentUser.email,
            amount: requestedAmount,
            termMonths: requestedTerm
        };

        try {
            const response = await apiSubmitNewLoanRequest(newLoanRequestData);

            if (response.success) {
                alert('Your loan request has been sent for banker review!');
                loanApplicationForm.reset();
                await displayPendingLoanRequests();
                await refreshDashboardAnalytics();
            } else {
                alert('Failed to submit loan request: ' + response.message);
            }
        } catch (error) {
            alert('Error submitting loan request: ' + error.message);
        }
    });

    const displayPendingLoanRequests = async () => {
        pendingRequestsDisplay.innerHTML = '';
        try {
            // UPDATED CALL HERE: Use the new customer-specific API function
            const response = await apiFetchCustomerPendingLoanRequests(); 

            if (!response.success) {
                alert('Error fetching your pending loan requests: ' + response.message);
                return;
            }

            // No need for frontend filter anymore, backend already filters by customer ID
            const customerSpecificRequests = response.requests; 

            if (customerSpecificRequests.length === 0) {
                pendingRequestsDisplay.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No pending loan requests found.</td></tr>`;
                noPendingRequestsMessage.classList.remove('d-none');
                return;
            }

            noPendingRequestsMessage.classList.add('d-none');
            customerSpecificRequests.forEach(request => {
                const row = pendingRequestsDisplay.insertRow();
                row.innerHTML = `
                    <td>${request.id}</td>
                    <td>$${request.amount.toFixed(2)}</td>
                    <td>${request.termMonths} months</td>
                    <td><span class="badge bg-warning">${request.status}</span></td>
                    <td>${request.appliedDate}</td>
                `;
            });
        } catch (error) {
            alert('Error displaying pending loan requests: ' + error.message);
        }
    };

    const displayCustomerLoanDetails = async () => {
        activeLoansDisplay.innerHTML = '';
        paymentScheduleTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Select an active loan to view its payment schedule.</td></tr>`;

        try {
            const response = await apiFetchCustomerLoans(currentUser.id);
            if (!response.success) {
                alert('Error fetching your active loans: ' + response.message);
                return;
            }
            const currentCustomerLoans = response.loans;

            if (!currentCustomerLoans || currentCustomerLoans.length === 0) {
                activeLoansDisplay.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No active loans found.</td></tr>`;
                noActiveLoansMessage.classList.remove('d-none');
                return;
            }

            noActiveLoansMessage.classList.add('d-none');

            currentCustomerLoans.forEach(loan => {
                const row = activeLoansDisplay.insertRow();
                row.dataset.loanId = loan.id;

                let nextPaymentDueDate = loan.status === 'active' ? (loan.nextDueDate || 'N/A') : 'N/A';
                let statusBadgeStyle = loan.status === 'active' ? 'bg-success' : 'bg-secondary';
                if (loan.status === 'active' && new Date(loan.nextDueDate) < new Date() && loan.paymentsMade < loan.termMonths) {
                    statusBadgeStyle = 'bg-danger';
                    nextPaymentDueDate += ' (Overdue)';
                }

                row.innerHTML = `
                    <td>${loan.id}</td>
                    <td>$${loan.amount.toFixed(2)}</td>
                    <td>${loan.interestRate}%</td>
                    <td>${loan.termMonths}</td>
                    <td>$${loan.monthlyPayment.toFixed(2)}</td>
                    <td><span class="badge ${statusBadgeStyle}">${loan.status}</span></td>
                    <td>${nextPaymentDueDate}</td>
                `;
                row.style.cursor = 'pointer';
                if (loan.status === 'active') {
                    row.addEventListener('click', () => showPaymentSchedule(loan));
                } else {
                    row.style.opacity = '0.7';
                }
            });

            if (activeLoansDisplay.children.length === 0) {
                activeLoansDisplay.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No active loans found.</td></tr>`;
                noActiveLoansMessage.classList.remove('d-none');
                paymentScheduleTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Select an active loan to view its payment schedule.</td></tr>`;
            }
        } catch (error) {
            alert('Error displaying customer loan details: ' + error.message);
        }
    };

    const showPaymentSchedule = (loanDetails) => {
        paymentScheduleTableBody.innerHTML = '';

        const principalAmount = loanDetails.amount;
        const annualInterestRate = loanDetails.interestRate / 100;
        const monthlyInterestRate = annualInterestRate / 12;
        const totalPaymentsCount = loanDetails.termMonths;
        const monthlyPaymentAmount = loanDetails.monthlyPayment;

        if (monthlyPaymentAmount <= 0 || isNaN(monthlyPaymentAmount)) {
            paymentScheduleTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Invalid loan details for payment schedule calculation.</td></tr>`;
            return;
        }

        let remainingBalance = principalAmount;
        const loanStartDate = new Date(loanDetails.startDate);

        for (let i = 1; i <= totalPaymentsCount; i++) {
            let interestPaymentPortion = remainingBalance * monthlyInterestRate;
            let principalPaymentPortion = monthlyPaymentAmount - interestPaymentPortion;

            if (i === totalPaymentsCount) {
                principalPaymentPortion = remainingBalance;
                interestPaymentPortion = monthlyPaymentAmount - principalPaymentPortion;
            }

            remainingBalance -= principalPaymentPortion;

            if (remainingBalance < 0) remainingBalance = 0;

            const dueDateForPayment = new Date(loanStartDate.getFullYear(), loanStartDate.getMonth() + i, loanStartDate.getDate());

            const row = paymentScheduleTableBody.insertRow();
            row.innerHTML = `
                <td>${i}</td>
                <td>${dueDateForPayment.toLocaleDateString()}</td>
                <td>$${principalPaymentPortion.toFixed(2)}</td>
                <td>$${interestPaymentPortion.toFixed(2)}</td>
                <td>$${monthlyPaymentAmount.toFixed(2)}</td>
                <td>$${remainingBalance.toFixed(2)}</td>
            `;
        }
    };

    const refreshDashboardAnalytics = async () => {
        try {
            const usersResponse = await apiFetchAllUsers();
            // CHANGE THIS LINE: Use the new customer-specific API for analytics count
            const pendingRequestsResponse = await apiFetchCustomerPendingLoanRequests(); 

            if (!usersResponse.success || !pendingRequestsResponse.success) {
                alert('Failed to retrieve essential analytics data.');
                return;
            }

            const allSystemUsers = usersResponse.users;
            // Use the already filtered requests from the specific endpoint
            const customerPendingRequests = pendingRequestsResponse.requests; 
            currentUser = allSystemUsers.find(user => user.id === currentUser.id);

            let currentActiveLoansCount = 0;
            let currentAccountBalance = currentUser ? (currentUser.accountBalance || 0) : 0;
            let totalLoanAmount = 0;
            
            if (currentUser) {
                const customerLoansResponse = await apiFetchCustomerLoans(currentUser.id);
                if (customerLoansResponse.success && customerLoansResponse.loans) {
                    customerLoansResponse.loans.forEach(loan => {
                        if (loan.status === 'active') {
                            currentActiveLoansCount++;
                            totalLoanAmount += loan.amount;
                        }
                    });
                }
            }

            // Use the count directly from the customer-specific endpoint response
            const customerPendingRequestsCount = customerPendingRequests.length; 

            activeLoansCounter.textContent = currentActiveLoansCount;
            pendingRequestsCounter.textContent = customerPendingRequestsCount;
            customerAccountBalanceDisplay.textContent = `$${currentAccountBalance.toFixed(2)}`;
            totalActiveLoanValueElement.textContent = `$${totalLoanAmount.toFixed(2)}`;

        } catch (error) {
            alert('Error updating dashboard analytics: ' + error.message);
        }
    };

    refreshDashboardAnalytics();
    displayCustomerLoanDetails();
    displayPendingLoanRequests();
    updateUserProfileInformation();
});