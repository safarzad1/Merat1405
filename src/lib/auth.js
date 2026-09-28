import jwt from "jsonwebtoken";

export function generateToken(payload) {
   if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not set");
   return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "10h" });
}

export function verifyToken(token) {
   if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not set");
   return jwt.verify(token, process.env.JWT_SECRET);
}
