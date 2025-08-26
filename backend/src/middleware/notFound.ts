import { Request, Response } from "express";

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Resource not found: ${req.originalUrl}`,
      statusCode: 404,
    },
    timestamp: new Date().toISOString(),
  });
};
