const BASE_API_URL = 'http://localhost:5000/api';

const getSessionData = (key) => {
    try {
        const data = sessionStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error(`Failed to retrieve "${key}" from session storage:`, error);
        return null;
    }
};

const setSessionData = (key, value) => {
    try {
        sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Failed to save "${key}" to session storage:`, error);
    }
};

const clearUserSession = () => {
    sessionStorage.removeItem('loggedInUser');
    sessionStorage.removeItem('jwtToken');
};

const getCurrentLoggedInUser = () => {
    return getSessionData('loggedInUser');
};

const getAuthToken = () => {
    return sessionStorage.getItem('jwtToken');
};

const navigateToDashboard = (userRole) => {
    switch (userRole) {
        case 'customer':
            window.location.href = 'customer.html';
            break;
        case 'banker':
            window.location.href = 'banker.html';
            break;
        case 'admin':
            window.location.href = 'admin.html';
            break;
        default:
            window.location.href = 'login.html';
    }
};

const verifyAuthenticationAndRedirect = () => {
    const user = getCurrentLoggedInUser();
    if (!user || !getAuthToken()) {
        alert('Access denied: Please log in to view this page.');
        window.location.href = 'login.html';
        return null;
    }
    return user;
};

const calculateLoanMonthlyPayment = (principalAmount, annualInterestRate, loanTermInMonths) => {
    const monthlyInterestRate = annualInterestRate / 12 / 100;
    if (monthlyInterestRate === 0) {
        return principalAmount / loanTermInMonths;
    }
    const divisor = 1 - Math.pow(1 + monthlyInterestRate, -loanTermInMonths);
    if (divisor === 0) {
        return 0;
    }
    return principalAmount * (monthlyInterestRate / divisor);
};

const makeApiRequest = async (endpoint, method = 'GET', data = null, requiresAuth = true) => {
    const requestOptions = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (requiresAuth) {
        const token = getAuthToken();
        if (!token) {
            clearUserSession();
            navigateToDashboard('login');
            throw new Error('Authentication token missing. Please log in again.');
        }
        requestOptions.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
        requestOptions.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${BASE_API_URL}/${endpoint}`, requestOptions);
        
        if (response.status === 401) {
            clearUserSession();
            alert('Your session has expired or is invalid. Please log in again.');
            navigateToDashboard('login');
            throw new Error('Unauthorized access, session expired.');
        }

        if (!response.ok) {
            const errorDetails = await response.json();
            throw new Error(errorDetails.message || `API call failed: ${response.status} ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error("API Request Failed:", error);
        throw error;
    }
};

const apiRegisterNewUser = async (userData) => {
    try {
        const response = await makeApiRequest('auth/register', 'POST', userData, false);
        return { success: true, user: response.user, token: response.token };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

const apiLoginUser = async (credentials) => {
    try {
        const response = await makeApiRequest('auth/login', 'POST', credentials, false);
        return { success: true, user: response.user, token: response.token };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

const apiFetchAllUsers = async () => {
    try {
        const users = await makeApiRequest('users');
        return { success: true, users: users };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

const apiUpdateExistingUser = async (userId, updateData) => {
    try {
        const response = await makeApiRequest(`users/${userId}`, 'PUT', updateData);
        return { success: true, user: response.user };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

const apiDeleteUserById = async (userId) => {
    try {
        await makeApiRequest(`users/${userId}`, 'DELETE');
        return { success: true, message: 'User successfully removed.' };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

const apiSubmitNewLoanRequest = async (requestDetails) => {
    try {
        const response = await makeApiRequest('loan-requests', 'POST', requestDetails);
        return { success: true, message: response.message, requestId: response.requestId };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

const apiFetchPendingLoanRequests = async () => {
    // This endpoint is for bankers/admins to get ALL pending requests
    try {
        const requests = await makeApiRequest('loan-requests');
        return { success: true, requests: requests };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

// NEW API FUNCTION FOR CUSTOMERS TO FETCH THEIR OWN PENDING REQUESTS
const apiFetchCustomerPendingLoanRequests = async () => {
    try {
        const requests = await makeApiRequest('loan-requests/customer-pending');
        return { success: true, requests: requests };
    } catch (error) {
        return { success: false, message: error.message };
    }
};


const apiFetchAllLoanRequests = async () => {
    try {
        const requests = await makeApiRequest('loan-requests/all');
        return { success: true, requests: requests };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

const apiProcessLoanApplication = async (requestId, approvedStatus, proposedInterestRate = null) => {
    try {
        const response = await makeApiRequest(`loan-requests/${requestId}/process`, 'PUT', { approved: approvedStatus, interestRate: proposedInterestRate });
        return { success: true, message: response.message };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

const apiFetchCustomerLoans = async (customerId) => {
    try {
        const loans = await makeApiRequest(`loans/customer/${customerId}`);
        return { success: true, loans: loans };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

const apiUpdateLoanStatus = async (loanId, newStatus) => {
    try {
        const response = await makeApiRequest(`loans/${loanId}/status`, 'PUT', { status: newStatus });
        return { success: true, message: response.message };
    }
    catch (error) {
        return { success: false, message: error.message };
    }
};

const apiFetchAllLoans = async () => {
    try {
        const loans = await makeApiRequest('loans');
        return { success: true, loans: loans };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

module.exports = {
    BASE_API_URL,
    getSessionData,
    setSessionData,
    clearUserSession,
    getCurrentLoggedInUser,
    getAuthToken,
    navigateToDashboard,
    verifyAuthenticationAndRedirect,
    calculateLoanMonthlyPayment,
    makeApiRequest,
    apiRegisterNewUser,
    apiLoginUser,
    apiFetchAllUsers,
    apiUpdateExistingUser,
    apiDeleteUserById,
    apiSubmitNewLoanRequest,
    apiFetchPendingLoanRequests,
    apiFetchCustomerPendingLoanRequests, // ADDED THIS EXPORT
    apiFetchAllLoanRequests,
    apiProcessLoanApplication,
    apiFetchCustomerLoans,
    apiUpdateLoanStatus,
    apiFetchAllLoans
};