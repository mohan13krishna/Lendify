# 🏦 Lendify - Modern Loan Management Platform

<div align="center">

![Lendify Logo](https://img.shields.io/badge/Lendify-Loan%20Management-blue?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K)

**A comprehensive full-stack loan management system built with modern web technologies**

[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-404D59?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-00000F?style=flat-square&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-563D7C?style=flat-square&logo=bootstrap&logoColor=white)](https://getbootstrap.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

</div>

---

## 🌟 Overview

**Lendify** is a modern, full-stack loan management platform that revolutionizes the lending process. Built to streamline financial workflows, enhance security, and provide comprehensive analytics, Lendify serves three distinct user roles with tailored experiences for optimal efficiency.

### 🎯 Why Lendify?

Managing loans shouldn't be complicated. Lendify simplifies the entire lending ecosystem by providing:

- **🎨 Intuitive User Experience** - Clean, responsive interfaces for all user types
- **🔒 Enterprise-Grade Security** - JWT authentication and bcrypt password hashing
- **📊 Real-time Analytics** - Comprehensive insights and reporting capabilities
- **⚡ Modern Architecture** - Built with scalable, maintainable technologies
- **🔄 Automated Workflows** - Streamlined approval processes and fund management

---

## ✨ Features & Capabilities

### 👤 **Customer Portal**
- **📝 Easy Loan Applications** - Streamlined form with amount and term selection
- **📊 Personalized Dashboard** - Real-time account balance, active loans, and request status
- **📈 Loan Tracking** - Complete loan history with detailed status updates
- **💳 Payment Schedules** - Clear breakdown of monthly payments, principal, and interest

### 🏛️ **Banker Interface**
- **📋 Request Management** - Centralized view of all pending loan applications
- **✅ Approval Workflow** - Process loans with custom interest rate setting
- **💰 Automated Fund Transfer** - Seamless wallet-to-customer account transfers
- **🎯 Portfolio Management** - Comprehensive loan oversight and completion tracking
- **👛 Wallet Management** - Real-time operational balance monitoring

### 🔧 **Admin Control Panel**
- **👥 User Management** - Complete oversight of customers and bankers
- **📊 System Analytics** - Platform-wide insights and performance metrics
- **✅ Banker Approvals** - Secure banker registration approval process
- **📈 Comprehensive Reporting** - Total users, active loans, and system health

---

## 🛠️ Technology Stack

### **Frontend Architecture**
```
Frontend/
├── assets/           # Static resources
│   ├── auto-loans.jpg
│   ├── business-loans.jpg
│   ├── home-loans.jpg
│   └── why-choose.jpg
├── css/
│   └── style.css     # Custom styling
├── js/               # Client-side logic
│   ├── admin.js      # Admin panel functionality
│   ├── banker.js     # Banker dashboard logic
│   ├── customer.js   # Customer portal features
│   ├── login.js      # Authentication handling
│   ├── register.js   # User registration
│   └── utils.js      # Shared utilities
└── *.html           # Application pages
```

| Technology | Purpose | Version |
|------------|---------|---------|
| **HTML5 & CSS3** | Structure & Styling | Latest |
| **Bootstrap** | Responsive UI Framework | 5.3.3 |
| **JavaScript ES6+** | Interactive Frontend Logic | Latest |
| **Font Awesome** | Icon Library | Latest |

### **Backend Architecture**
```
Backend/
├── middleware/
│   └── auth.js       # JWT authentication middleware
├── routes/           # API endpoints
│   ├── auth.js       # Authentication routes
│   ├── loanRequests.js # Loan request handling
│   ├── loans.js      # Loan management
│   └── users.js      # User operations
├── utils/
│   └── helpers.js    # Utility functions
├── db.js            # Database configuration
├── schema.sql       # Database schema
└── server.js        # Application entry point
```

| Technology | Purpose | Benefits |
|------------|---------|----------|
| **Node.js** | Runtime Environment | High performance, scalable |
| **Express.js** | Web Framework | Fast, minimalist, flexible |
| **MySQL2** | Database Driver | Promise-based, efficient |
| **JWT** | Authentication | Stateless, secure |
| **bcryptjs** | Password Hashing | Industry-standard security |
| **UUID** | Unique Identifiers | Collision-resistant |

---

## 🗄️ Database Schema

### **Core Tables Structure**

```sql
users
├── id (Primary Key)
├── name, email, phone
├── role (customer/banker/admin)
├── approval_status
├── account_balance/wallet_balance
└── account_number

loan_requests
├── id (Primary Key)
├── customer_id (Foreign Key)
├── amount, term_months
├── status (pending/approved/rejected)
└── created_at

loans
├── id (Primary Key)
├── customer_id, banker_id (Foreign Keys)
├── principal, interest_rate
├── monthly_payment, status
└── loan_details
```

---

## 🚀 Quick Start Guide

### **Prerequisites**
- Node.js (LTS version)
- MySQL Server
- Code Editor (VS Code recommended)

### **Installation Steps**

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/lendify.git
   cd lendify
   ```

2. **Backend Setup**
   ```bash
   cd Backend
   npm install
   ```

3. **Environment Configuration**
   Create `.env` file in Backend directory:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=YourMySQLPassword
   DB_NAME=LENDIFY
   DB_PORT=3306
   
   JWT_SECRET=your_super_secure_jwt_secret_key_here
   PORT=5000
   ```

4. **Database Setup**
   ```bash
   # Import schema.sql to your MySQL database
   mysql -u root -p LENDIFY < schema.sql
   ```

5. **Start the Application**
   ```bash
   npm start
   ```

6. **Access the Application**
   Open `Frontend/index.html` in your browser

---

## 👥 Default Login Credentials

### **Admin Access**
- **Email:** `admin@loans.com`
- **Password:** `adminpassword`

> 🔒 **Security Note:** Change default credentials in production environment

---

## 🎮 User Journey

### **For Customers**
1. **Register** → Create account as Customer
2. **Login** → Access personal dashboard immediately
3. **Apply** → Submit loan applications with desired terms
4. **Track** → Monitor application status and active loans
5. **Manage** → View payment schedules and account balance

### **For Bankers**
1. **Register** → Create account as Banker
2. **Wait for Approval** → Admin approval required
3. **Login** → Access banker portal after approval
4. **Review** → Process pending loan applications
5. **Manage** → Oversee loan portfolio and wallet

### **For Admins**
1. **Login** → Use provided admin credentials
2. **Approve** → Review and approve banker applications
3. **Monitor** → Track system-wide analytics
4. **Manage** → Oversee all platform operations

---

## 📊 Key Metrics & Analytics

- **Real-time Dashboard** with loan statistics
- **User Growth Tracking** across all roles
- **Loan Performance Metrics** and success rates
- **Financial Flow Analysis** and reporting
- **System Health Monitoring** and alerts

---

## 🔒 Security Features

- **JWT-based Authentication** for stateless security
- **Password Hashing** with bcrypt for data protection
- **Role-based Access Control** for feature restrictions
- **Input Validation** and sanitization
- **CORS Configuration** for secure cross-origin requests

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support & Contact

- **Issues:** [GitHub Issues](https://github.com/yourusername/lendify/issues)
- **Documentation:** [Wiki](https://github.com/yourusername/lendify/wiki)
- **Email:** support@lendify.com

---

## 🙏 Acknowledgments

- Built with passion for financial technology
- Inspired by modern banking solutions
- Thanks to the open-source community for excellent tools

---

<div align="center">

**Made with ❤️ by [Your Name]**

⭐ Star this repository if you found it helpful!

</div>
