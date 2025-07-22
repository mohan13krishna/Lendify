
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    age INT NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL, 
    banker_id VARCHAR(255),
    is_approved BOOLEAN DEFAULT FALSE, 
    account_number VARCHAR(255) UNIQUE, 
    account_balance DECIMAL(15, 2) DEFAULT 0.00,
    wallet_balance DECIMAL(15, 2) DEFAULT 0.00 
);

CREATE TABLE loan_requests (
    id VARCHAR(255) PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    term_months INT NOT NULL,
    status VARCHAR(50) NOT NULL, 
    applied_date DATE NOT NULL,
    processed_by_banker_id VARCHAR(255), 
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE loans (
    id VARCHAR(255) PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL,
    term_months INT NOT NULL,
    monthly_payment DECIMAL(15, 2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    payments_made INT DEFAULT 0,
    last_payment_date DATE,
    next_due_date DATE,
    issued_by_banker_id VARCHAR(255) NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (issued_by_banker_id) REFERENCES users(id)
);