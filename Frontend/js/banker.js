// Updated banker.js
document.addEventListener('DOMContentLoaded', async () => {
    let currentBankerUser = verifyAuthenticationAndRedirect();
    if (!currentBankerUser || currentBankerUser.role !== 'banker' || !currentBankerUser.isApproved) {
        clearUserSession();
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('userName').textContent = `Hello, Banker ${currentBankerUser.name}!`;

    const sidebarContainer = document.getElementById('sidebar-wrapper');
    const menuToggleButton = document.getElementById('menu-toggle');
    const dashboardContentSections = document.querySelectorAll('.dashboard-content');
    const navigationLinks = document.querySelectorAll('.list-group-item-action');

    const loanRequestsDisplay = document.querySelector('#loan-requests-content #loanRequestsList tbody');
    const customerLoansDisplay = document.querySelector('#manage-loans-content #customerLoanList tbody');

    const totalCustomersCounter = document.getElementById('totalCustomersCount');
    const pendingRequestsCounter = document.getElementById('pendingRequestsCount');
    const bankerWalletBalanceDisplay = document.getElementById('bankerWalletBalance');

    const totalLoansIssuedElement = document.getElementById('totalLoansIssued');
    const totalActiveLoanValueElement = document.getElementById('totalActiveLoanValue');
    const totalCompletedLoansElement = document.getElementById('totalCompletedLoans');

    const updateUserProfileInformation = () => {
        document.getElementById('displayBankerName').textContent = currentBankerUser.name;
        document.getElementById('displayEmail').textContent = currentBankerUser.email;
        document.getElementById('displayPhone').textContent = currentBankerUser.phone;
        document.getElementById('displayRole').textContent = currentBankerUser.role.charAt(0).toUpperCase() + currentBankerUser.role.slice(1);
        document.getElementById('displayBankerId').textContent = currentBankerUser.bankerId || 'N/A';
        const approvalStatusBadge = document.getElementById('displayApprovalStatus');
        approvalStatusBadge.textContent = currentBankerUser.isApproved ? 'Approved' : 'Pending';
        approvalStatusBadge.classList.add(currentBankerUser.isApproved ? 'bg-success' : 'bg-warning');
        document.getElementById('displayWalletBalance').textContent = `$${(currentBankerUser.walletBalance || 0).toFixed(2)}`;
        bankerWalletBalanceDisplay.textContent = `$${(currentBankerUser.walletBalance || 0).toFixed(2)}`;
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
                currentBankerUser = usersResponse.users.find(user => user.id === currentBankerUser.id);
                setSessionData('loggedInUser', currentBankerUser);
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
                break;
            case 'loan-requests-content':
                await displayLoanRequestsForBanker();
                break;
            case 'manage-loans-content':
                await displayCustomerLoanDetailsForBanker();
                break;
            case 'profile-content': // Added for 'My Profile' to refresh user data on click
                updateUserProfileInformation();
                break;
        }
    };

    document.getElementById('logoutBtn').addEventListener('click', () => {
        clearUserSession();
        alert('You have been logged out.');
        window.location.href = 'login.html';
    });

    const displayLoanRequestsForBanker = async () => {
        loanRequestsDisplay.innerHTML = '';
        try {
            const response = await apiFetchPendingLoanRequests();

            if (!response.success) {
                alert('Error fetching loan requests for banker: ' + response.message);
                return;
            }

            const pendingRequests = response.requests;

            if (pendingRequests.length === 0) {
                loanRequestsDisplay.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No pending loan requests.</td></tr>`;
                return;
            }

            pendingRequests.forEach(request => {
                const row = loanRequestsDisplay.insertRow();
                row.innerHTML = `
                    <td>${request.id}</td>
                    <td>${request.customerName} (${request.customerEmail})</td>
                    <td>$${request.amount.toFixed(2)}</td>
                    <td>${request.termMonths} months</td>
                    <td>${request.appliedDate}</td>
                    <td>
                        <button class="btn btn-sm btn-success me-2 approve-loan-request-button" data-id="${request.id}">Approve</button>
                        <button class="btn btn-sm btn-danger reject-loan-request-button" data-id="${request.id}">Reject</button>
                    </td>
                `;
            });

            document.querySelectorAll('.approve-loan-request-button').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const requestId = event.target.dataset.id;
                    const requestDetails = pendingRequests.find(req => req.id === requestId);

                    if (!requestDetails) return;

                    const interestRateInput = prompt(`Approve loan for $${requestDetails.amount.toFixed(2)} (Term: ${requestDetails.termMonths} months). Enter interest rate (%):`, '8.5');
                    const interestRate = parseFloat(interestRateInput);

                    if (isNaN(interestRate) || interestRate < 0) {
                        alert('Invalid interest rate provided. Approval cancelled.');
                        return;
                    }

                    try {
                        // MODIFIED: Pass currentBankerUser.id as the fourth argument to apiProcessLoanApplication
                        const response = await apiProcessLoanApplication(requestId, true, interestRate, currentBankerUser.id);
                        if (response.success) {
                            alert(`Loan successfully approved and funds issued!`);
                            await displayLoanRequestsForBanker();
                            await displayCustomerLoanDetailsForBanker();
                            await refreshDashboardAnalytics();
                        } else {
                            alert('Failed to approve loan: ' + response.message);
                        }
                    } catch (error) {
                        alert('Error during loan approval: ' + error.message);
                    }
                });
            });

            document.querySelectorAll('.reject-loan-request-button').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const requestId = event.target.dataset.id;
                    if (confirm('Confirm rejection of this loan request?')) {
                        try {
                            // MODIFIED: Pass currentBankerUser.id as the fourth argument to apiProcessLoanApplication
                            const response = await apiProcessLoanApplication(requestId, false, null, currentBankerUser.id);
                            if (response.success) {
                                alert('Loan request successfully rejected.');
                                await displayLoanRequestsForBanker();
                                await refreshDashboardAnalytics();
                            } else {
                                alert('Failed to reject loan: ' + response.message);
                            }
                        } catch (error) {
                            alert('Error during loan rejection: ' + error.message);
                        }
                    }
                });
            });
        } catch (error) {
            alert('Error displaying loan requests for banker: ' + error.message);
        }
    };

    const displayCustomerLoanDetailsForBanker = async () => {
        customerLoansDisplay.innerHTML = '';
        try {
            const allLoansResponse = await apiFetchAllLoans();
            if (!allLoansResponse.success) {
                alert('Error fetching all loans for banker: ' + allLoansResponse.message);
                return;
            }
            const allSystemLoans = allLoansResponse.loans;

            if (allSystemLoans.length === 0) {
                customerLoansDisplay.innerHTML = `<tr><td colspan="9" class="text-center text-muted">No customer loans to display.</td></tr>`;
                return;
            }

            allSystemLoans.forEach(loan => {
                const row = customerLoansDisplay.insertRow();

                let nextPaymentDueDate = loan.status === 'active' ? (loan.nextDueDate || 'N/A') : 'N/A';
                let statusBadgeStyle = loan.status === 'active' ? 'bg-success' : 'bg-secondary';
                if (loan.status === 'active' && new Date(loan.nextDueDate) < new Date() && loan.paymentsMade < loan.termMonths) {
                    statusBadgeStyle = 'bg-danger';
                    nextPaymentDueDate += ' (Overdue)';
                }

                row.innerHTML = `
                    <td>${loan.customerName}</td>
                    <td>${loan.customerEmail}</td>
                    <td>${loan.id}</td>
                    <td>$${loan.amount.toFixed(2)}</td>
                    <td>${loan.termMonths}</td>
                    <td>$${loan.monthlyPayment.toFixed(2)}</td>
                    <td><span class="badge ${statusBadgeStyle}">${loan.status}</span></td>
                    <td>${nextPaymentDueDate}</td>
                    <td>
                        <button class="btn btn-sm btn-danger end-loan-button" data-loan-id="${loan.id}" ${loan.status !== 'active' ? 'disabled' : ''}>End Loan</button>
                    </td>
                `;
            });

            document.querySelectorAll('.end-loan-button').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const loanId = event.target.dataset.loanId;
                    if (confirm('Confirm marking this loan as completed?')) {
                        try {
                            const response = await apiUpdateLoanStatus(loanId, 'completed');
                            if (response.success) {
                                alert('Loan successfully marked as completed.');
                                await displayCustomerLoanDetailsForBanker();
                                await refreshDashboardAnalytics();
                            } else {
                                alert('Failed to update loan status: ' + response.message);
                            }
                        } catch (error) {
                            alert('Error ending loan: ' + error.message);
                        }
                    }
                });
            });
        } catch (error) {
            alert('Error displaying customer loan details for banker: ' + error.message);
        }
    };

    const refreshDashboardAnalytics = async () => {
        try {
            const usersResponse = await apiFetchAllUsers();
            const loanRequestsResponse = await apiFetchPendingLoanRequests();
            const allLoansResponse = await apiFetchAllLoans();

            if (!usersResponse.success || !loanRequestsResponse.success || !allLoansResponse.success) {
                alert('Failed to retrieve essential analytics data.');
                return;
            }

            const allSystemUsers = usersResponse.users;
            const allPendingRequests = loanRequestsResponse.requests;
            const allSystemLoans = allLoansResponse.loans;

            const approvedCustomerCount = allSystemUsers.filter(user => user.role === 'customer' && user.isApproved).length;
            const currentPendingRequestsCount = allPendingRequests.length;
            
            // Re-fetch the current banker user data to ensure latest wallet balance is reflected
            const latestBankerUserData = allSystemUsers.find(user => user.id === currentBankerUser.id);
            currentBankerUser = latestBankerUserData ? latestBankerUserData : currentBankerUser; // Update if found, else keep old
            setSessionData('loggedInUser', currentBankerUser); // Update session storage
            
            const currentBankerWalletBalance = currentBankerUser ? (currentBankerUser.walletBalance || 0) : 0;

            let totalIssuedLoans = 0;
            let totalActiveLoanValue = 0;
            let totalCompletedLoans = 0;

            allSystemLoans.forEach(loan => {
                if (loan.issuedByBankerId === currentBankerUser.id) {
                    totalIssuedLoans++;
                    if (loan.status === 'active') {
                        totalActiveLoanValue += loan.amount;
                    } else if (loan.status === 'completed') {
                        totalCompletedLoans++;
                    }
                }
            });

            totalCustomersCounter.textContent = approvedCustomerCount;
            pendingRequestsCounter.textContent = currentPendingRequestsCount;
            bankerWalletBalanceDisplay.textContent = `$${currentBankerWalletBalance.toFixed(2)}`;
            totalLoansIssuedElement.textContent = totalIssuedLoans;
            totalActiveLoanValueElement.textContent = `$${totalActiveLoanValue.toFixed(2)}`;
            totalCompletedLoansElement.textContent = totalCompletedLoans;

        } catch (error) {
            alert('Error updating dashboard analytics: ' + error.message);
        }
    };

    // Initial load functions
    refreshDashboardAnalytics();
    displayLoanRequestsForBanker();
    displayCustomerLoanDetailsForBanker();
    updateUserProfileInformation();
});
