const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const generatePasswordHash = async (plainTextPassword) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(plainTextPassword, salt);
};

const verifyPasswordHash = async (enteredPassword, storedHashedPassword) => {
    return bcrypt.compare(enteredPassword, storedHashedPassword);
};

const createAuthToken = (userPayload) => {
    return jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const generateCustomerAccountNumber = () => {
    const timestampPart = Date.now().toString().slice(-8);
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `ACC-${timestampPart}-${randomPart}`;
};

const generateResourceId = () => {
    return uuidv4();
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

module.exports = {
    generatePasswordHash,
    verifyPasswordHash,
    createAuthToken,
    generateCustomerAccountNumber,
    generateResourceId,
    calculateLoanMonthlyPayment
};
