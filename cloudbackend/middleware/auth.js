const jwt = require('jsonwebtoken');

const ensureAuthenticated = (request, response, next) => {
    let token;

    if (request.headers.authorization && request.headers.authorization.startsWith('Bearer')) {
        try {
            token = request.headers.authorization.split(' ')[1];
            const decodedPayload = jwt.verify(token, process.env.JWT_SECRET);
            request.user = decodedPayload;
            next();
        } catch (error) {
            response.status(401).json({ message: 'Authentication failed: Invalid or expired token' });
        }
    } else {
        response.status(401).json({ message: 'Authentication required: No token provided' });
    }
};

const restrictToRoles = (...allowedRoles) => {
    return (request, response, next) => {
        if (!request.user || !allowedRoles.includes(request.user.role)) {
            return response.status(403).json({ message: 'Authorization failed: You do not have permission to access this resource' });
        }
        next();
    };
};

module.exports = { ensureAuthenticated, restrictToRoles };
