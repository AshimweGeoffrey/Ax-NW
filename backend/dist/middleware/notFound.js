"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = void 0;
const notFound = (req, res) => {
    res.status(404).json({
        success: false,
        error: {
            message: `Resource not found: ${req.originalUrl}`,
            statusCode: 404,
        },
        timestamp: new Date().toISOString(),
    });
};
exports.notFound = notFound;
//# sourceMappingURL=notFound.js.map