import type { User } from './index.ts';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
