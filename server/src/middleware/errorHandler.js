// Express 5 compatible error handler — 4-param signature still required for Express to recognize it
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || 'Internal Server Error';
    // Full stack so we can see the origin in logs
    console.error(`[${statusCode}] ${message}`);
    console.error(err.stack);
    if (!res.headersSent) {
        res.status(statusCode).json({
            message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        });
    }
};

const createError = (message, statusCode = 400) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
};

module.exports = { errorHandler, createError };
