document.addEventListener('DOMContentLoaded', async () => {
    const adminUser = verifyAuthenticationAndRedirect();
    if (!adminUser || adminUser.role !== 'admin') {
        clearUserSession();
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('userName').textContent = `Hello, Admin ${adminUser.name}!`;

    const sidebarContainer = document.getElementById('sidebar-wrapper');
    const menuToggleButton = document.getElementById('menu-toggle');
    const dashboardContentSections = document.querySelectorAll('.dashboard-content');
    const navigationLinks = document.querySelectorAll('.list-group-item-action');

    const bankerApprovalListTable = document.querySelector('#bankerApprovalList tbody');
    const userManagementListTable = document.querySelector('#userList tbody');

    const totalUsersCounter = document.getElementById('totalUsersCount');
    const pendingApprovalsCounter = document.getElementById('pendingApprovalsCount');
    const totalActiveLoanValueDisplay = document.getElementById('totalActiveLoanValue');

    const pendingBankerApprovalsCounter = document.getElementById('pendingBankerApprovalsCount');
    const pendingLoanRequestsCounter = document.getElementById('pendingLoanRequestsCount');

    const adminTotalLoansIssuedElement = document.getElementById('adminTotalLoansIssued');
    const adminCompletedLoansElement = document.getElementById('adminCompletedLoans');
    const adminOverdueLoansElement = document.getElementById('adminOverdueLoans');
    const totalLoanRequestsReceivedElement = document.getElementById('totalLoanRequestsReceived');
    const totalRejectedLoanRequestsElement = document.getElementById('totalRejectedLoanRequests');
    const totalApprovedBankersElement = document.getElementById('totalApprovedBankers');
    const avgLoansPerBankerElement = document.getElementById('avgLoansPerBanker');

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
        switch (contentId) {
            case 'overview-content':
                await refreshDashboardAnalytics();
                await displayBankerApprovals(); // Also call these here as they are now part of overview
                await displayAllSystemUsers();
                await displayLoanAnalytics();
                break;
            case 'banker-approvals-content': // These will just show the overview content
            case 'user-management-content':
            case 'loan-analytics-content':
                await refreshDashboardAnalytics();
                await displayBankerApprovals();
                await displayAllSystemUsers();
                await displayLoanAnalytics();
                break;
        }
    };

    document.getElementById('logoutBtn').addEventListener('click', () => {
        clearUserSession();
        alert('You have been logged out.');
        window.location.href = 'login.html';
    });

    const displayBankerApprovals = async () => {
        bankerApprovalListTable.innerHTML = '';
        try {
            const usersResponse = await apiFetchAllUsers();

            if (!usersResponse.success) {
                alert('Error fetching user data for banker approvals: ' + usersResponse.message);
                return;
            }

            const unapprovedBankers = usersResponse.users.filter(user => user.role === 'banker' && !user.isApproved);

            if (unapprovedBankers.length === 0) {
                bankerApprovalListTable.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No pending banker approvals.</td></tr>`;
                return;
            }

            unapprovedBankers.forEach(banker => {
                const row = bankerApprovalListTable.insertRow();
                row.innerHTML = `
                    <td>${banker.name}</td>
                    <td>${banker.email}</td>
                    <td>${banker.bankerId || 'N/A'}</td>
                    <td><span class="badge bg-warning">Pending</span></td>
                    <td>
                        <button class="btn btn-sm btn-success me-2 approve-banker-button" data-id="${banker.id}">Approve</button>
                        <button class="btn btn-sm btn-danger reject-banker-button" data-id="${banker.id}">Reject</button>
                    </td>
                `;
            });

            document.querySelectorAll('.approve-banker-button').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const userId = event.target.dataset.id;
                    try {
                        const response = await apiUpdateExistingUser(userId, { isApproved: true });
                        if (response.success) {
                            alert(`Banker ${response.user.name} successfully approved.`);
                            await displayBankerApprovals();
                            await displayAllSystemUsers();
                            await refreshDashboardAnalytics();
                        } else {
                            alert('Failed to approve banker: ' + response.message);
                        }
                    } catch (error) {
                        alert('Error during banker approval: ' + error.message);
                    }
                });
            });

            document.querySelectorAll('.reject-banker-button').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const userId = event.target.dataset.id;
                    if (confirm('Confirm rejection and deletion of this banker account? This action cannot be undone.')) {
                        try {
                            const response = await apiDeleteUserById(userId);
                            if (response.success) {
                                alert('Banker account successfully rejected and removed.');
                                await displayBankerApprovals();
                                await displayAllSystemUsers();
                                await refreshDashboardAnalytics();
                            } else {
                                alert('Failed to reject banker: ' + response.message);
                            }
                        } catch (error) {
                            alert('Error during banker rejection: ' + error.message);
                        }
                    }
                });
            });
        } catch (error) {
            alert('Error displaying banker approvals: ' + error.message);
        }
    };

    const displayAllSystemUsers = async () => {
        userManagementListTable.innerHTML = '';
        try {
            const usersResponse = await apiFetchAllUsers();

            if (!usersResponse.success) {
                alert('Error fetching all system users: ' + usersResponse.message);
                return;
            }

            const allUsers = usersResponse.users;

            if (allUsers.length === 0) {
                userManagementListTable.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No users found in the system.</td></tr>`;
                return;
            }

            allUsers.forEach(userItem => {
                const row = userManagementListTable.insertRow();
                let statusText = '';
                let statusBadgeClass = '';

                if (userItem.role === 'customer') {
                    statusText = 'Active';
                    statusBadgeClass = 'bg-success';
                } else if (userItem.role === 'banker') {
                    statusText = userItem.isApproved ? 'Approved' : 'Pending';
                    statusBadgeClass = userItem.isApproved ? 'bg-success' : 'bg-warning';
                } else if (userItem.role === 'admin') {
                    statusText = 'Active';
                    statusBadgeClass = 'bg-primary';
                }

                row.innerHTML = `
                    <td>${userItem.name}</td>
                    <td>${userItem.email}</td>
                    <td>${userItem.role}</td>
                    <td><span class="badge ${statusBadgeClass}">${statusText}</span></td>
                    <td>
                        ${userItem.role !== 'admin' ? `<button class="btn btn-sm btn-danger delete-user-button" data-id="${userItem.id}">Delete</button>` : ''}
                    </td>
                `;
            });

            document.querySelectorAll('.delete-user-button').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const userId = event.target.dataset.id;
                    if (confirm('Confirm deletion of this user? This action cannot be undone.')) {
                        try {
                            const response = await apiDeleteUserById(userId);
                            if (response.success) {
                                alert('User successfully deleted.');
                                await displayAllSystemUsers();
                                await displayBankerApprovals();
                                await refreshDashboardAnalytics();
                            } else {
                                alert('Failed to delete user: ' + response.message);
                            }
                        } catch (error) {
                            alert('Error during user deletion: ' + error.message);
                        }
                    }
                });
            });
        } catch (error) {
            alert('Error displaying all system users: ' + error.message);
        }
    };

    const displayLoanAnalytics = async () => {
        try {
            const usersResponse = await apiFetchAllUsers();
            const allLoansResponse = await apiFetchAllLoans();
            const allLoanRequestsResponse = await apiFetchAllLoanRequests();

            if (!usersResponse.success || !allLoansResponse.success || !allLoanRequestsResponse.success) {
                alert('Failed to retrieve essential analytics data for loan analytics.');
                return;
            }

            const allSystemUsers = usersResponse.users;
            const allSystemLoans = allLoansResponse.loans;
            const allSystemRequests = allLoanRequestsResponse.requests;

            let totalLoansIssued = allSystemLoans.length;
            let completedLoans = allSystemLoans.filter(loan => loan.status === 'completed').length;
            let overdueLoans = allSystemLoans.filter(loan => loan.status === 'active' && new Date(loan.nextDueDate) < new Date()).length;
            let totalRequestsReceived = allSystemRequests.length;
            let totalRejectedRequests = allSystemRequests.filter(req => req.status === 'rejected').length;

            const approvedBankers = allSystemUsers.filter(user => user.role === 'banker' && user.isApproved);
            let totalApprovedBankersCount = approvedBankers.length;
            let totalLoansByApprovedBankers = 0;

            approvedBankers.forEach(banker => {
                allSystemLoans.forEach(loan => {
                    if (loan.issuedByBankerId === banker.id) {
                        totalLoansByApprovedBankers++;
                    }
                });
            });

            let avgLoansPerBanker = totalApprovedBankersCount > 0 ? (totalLoansByApprovedBankers / totalApprovedBankersCount).toFixed(2) : 0;

            adminTotalLoansIssuedElement.textContent = totalLoansIssued;
            adminCompletedLoansElement.textContent = completedLoans;
            adminOverdueLoansElement.textContent = overdueLoans;
            totalLoanRequestsReceivedElement.textContent = totalRequestsReceived;
            totalRejectedLoanRequestsElement.textContent = totalRejectedRequests;
            totalApprovedBankersElement.textContent = totalApprovedBankersCount;
            avgLoansPerBankerElement.textContent = avgLoansPerBanker;

        } catch (error) {
            alert('Error displaying loan analytics: ' + error.message);
        }
    };

    const refreshDashboardAnalytics = async () => {
        try {
            const usersResponse = await apiFetchAllUsers();
            const pendingBankerApprovals = usersResponse.users.filter(user => user.role === 'banker' && !user.isApproved);
            const pendingLoanRequestsResponse = await apiFetchPendingLoanRequests();
            const allLoansResponse = await apiFetchAllLoans();

            if (!usersResponse.success || !pendingLoanRequestsResponse.success || !allLoansResponse.success) {
                alert('Failed to retrieve essential analytics data.');
                return;
            }

            const allSystemUsers = usersResponse.users;
            const allPendingLoanRequests = pendingLoanRequestsResponse.requests;
            const allSystemLoans = allLoansResponse.loans;

            const totalRegisteredUsers = allSystemUsers.length;
            const currentPendingBankerApprovals = pendingBankerApprovals.length;
            const currentPendingLoanRequests = allPendingLoanRequests.length;
            const totalPendingApprovals = currentPendingBankerApprovals + currentPendingLoanRequests;

            let totalActiveLoanValue = 0;
            allSystemLoans.forEach(loan => {
                if (loan.status === 'active') {
                    totalActiveLoanValue += loan.amount;
                }
            });

            totalUsersCounter.textContent = totalRegisteredUsers;
            pendingApprovalsCounter.textContent = totalPendingApprovals;
            totalActiveLoanValueDisplay.textContent = `$${totalActiveLoanValue.toFixed(2)}`;
            pendingBankerApprovalsCounter.textContent = currentPendingBankerApprovals;
            pendingLoanRequestsCounter.textContent = currentPendingLoanRequests;

        } catch (error) {
            alert('Error updating dashboard analytics: ' + error.message);
        }
    };

    refreshDashboardAnalytics();
    displayBankerApprovals();
    displayAllSystemUsers();
});