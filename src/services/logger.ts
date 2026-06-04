import winston from 'winston';
import fs from 'fs';
import path from 'path';

function ensureLogDir(): void {
  const dir = path.resolve('logs');
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {
      // no podemos loguear aquí porque el logger aún no existe
    }
  }
}

ensureLogDir();

const transports: winston.transport[] = [new winston.transports.Console()];

const fileOpts = [
  { filename: 'logs/error.log', level: 'error' },
  { filename: 'logs/combined.log' },
];

for (const opts of fileOpts) {
  try {
    transports.push(new winston.transports.File(opts));
  } catch {
    // fallback: solo console
  }
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      return `${timestamp} [${level.toUpperCase()}] ${message}${stack ? '\n' + stack : ''}`;
    })
  ),
  transports,
});

export default logger;
