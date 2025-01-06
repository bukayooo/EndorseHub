import { type Config } from './types/config';

const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
  host: '0.0.0.0',
  session: {
    secret: process.env.SESSION_SECRET || 'development_secret_key',
    name: 'testimonial.sid',
    resave: true,
    saveUninitialized: true,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: false,
      sameSite: 'none'
    }
  },
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.CLIENT_URL 
      : ['http://localhost:5173', 'http://0.0.0.0:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Set-Cookie']
  },
  database: {
    url: process.env.DATABASE_URL
  }
};

export default config;
