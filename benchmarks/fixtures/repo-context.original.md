# Project: auth-service

TypeScript microservice handling authentication and session management.

## package.json

```json
{
  "name": "auth-service",
  "version": "1.4.2",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -b",
    "test": "vitest run",
    "lint": "eslint ."
  },
  "dependencies": {
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "prisma": "^5.0.0"
  }
}
```

## src/index.ts

```typescript
import express from 'express';
import { authRouter } from './routes/auth';
import { sessionRouter } from './routes/session';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

const app = express();

app.use(express.json());
app.use(rateLimiter);
app.use('/auth', authRouter);
app.use('/session', sessionRouter);
app.use(errorHandler);

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
});
```

## src/routes/auth.ts

```typescript
import { Router } from 'express';
import { login, logout, refresh } from '../controllers/authController';
import { validateBody } from '../middleware/validation';
import { loginSchema } from '../schemas/auth';

export const authRouter = Router();

authRouter.post('/login', validateBody(loginSchema), login);
authRouter.post('/logout', logout);
authRouter.post('/refresh', refresh);
```

## src/controllers/authController.ts

```typescript
import type { Request, Response } from 'express';
import { generateToken, verifyToken } from '../lib/jwt';
import { findUserByEmail, verifyPassword } from '../lib/user';
import { createSession, deleteSession } from '../lib/session';

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  
  const user = await findUserByEmail(email);
  if (!user || !await verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const session = await createSession(user.id);
  const token = generateToken({ userId: user.id, sessionId: session.id });
  
  return res.json({ token, expiresIn: 86400 });
}

export async function logout(req: Request, res: Response) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid token' });
  
  await deleteSession(payload.sessionId);
  return res.json({ success: true });
}

export async function refresh(req: Request, res: Response) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token' });
  
  const newToken = generateToken({ userId: payload.userId, sessionId: payload.sessionId });
  return res.json({ token: newToken, expiresIn: 86400 });
}
```

## src/lib/jwt.ts

```typescript
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error('JWT_SECRET environment variable is required');

const EXPIRY = '24h';

export function generateToken(payload: Record<string, unknown>): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRY });
}

export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    return jwt.verify(token, SECRET) as Record<string, unknown>;
  } catch {
    return null;
  }
}
```
