import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

function formatIssues(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  return error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
}

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: "Invalid request body", details: formatIssues(result.error) });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({ error: "Invalid query parameters", details: formatIssues(result.error) });
      return;
    }
    // Express 5 makes req.query a getter-only accessor — stash parsed output separately.
    (req as Request & { validatedQuery?: T }).validatedQuery = result.data;
    next();
  };
}

/** Validates a route param as a positive integer, e.g. `/sports/:id`. */
export function requireIntParam(paramName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const raw = req.params[paramName];
    const id = Number(raw);
    if (!raw || !Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: `Invalid ${paramName} parameter — must be a positive integer` });
      return;
    }
    next();
  };
}
