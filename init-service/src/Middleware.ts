import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization; // Authorization: Bearer <token>
  
  if (!authHeader) {
    return res.status(401).send("Access token missing");
  }

  const token = authHeader.split(" ")[1]; // Extract token from "Bearer <token>"

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: number };
    req.user = decoded; // Attach decoded user data (e.g., id) to the request object
    next();
  } catch (error) {
    console.error("Invalid token:", error);
    return res.status(403).send("Invalid or expired token");
  }
};

export default authenticateToken;
