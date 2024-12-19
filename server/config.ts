import { env } from 'process';

interface StripeConfig {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  prices: {
    monthly: string;
    yearly: string;
  };
}

interface ApiConfig {
  prefix: string;
  billing: {
    routes: string;
    stripe: {
      webhook: string;
      checkout: string;
    };
  };
}

export interface Config {
  env: string;
  port: number;
  host: string;
  api: ApiConfig;
  stripe: StripeConfig;
  session: {
    secret: string;
    name: string;
    resave: boolean;
    saveUninitialized: boolean;
    cookie: {
      maxAge: number;
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'lax' | 'strict' | 'none';
    };
  };
  cors: {
    origin: string | string[];
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
  };
}

const config: Config = {
  env: env.NODE_ENV || 'development',
  port: parseInt(env.PORT || '3001', 10),
  host: '0.0.0.0',
  api: {
    prefix: '/api',
    billing: {
      routes: '/billing',
      stripe: {
        webhook: '/webhook',
        checkout: '/create-checkout-session'
      }
    }
  },
  stripe: {
    secretKey: env.STRIPE_SECRET_KEY || '',
    publishableKey: env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: env.STRIPE_WEBHOOK_SECRET || '',
    prices: {
      monthly: env.STRIPE_TEST_PRICE_MONTHLY || '',
      yearly: env.STRIPE_TEST_PRICE_YEARLY || ''
    }
  },
  session: {
    secret: env.SESSION_SECRET || 'development_secret_key',
    name: 'testimonial.sid',
    resave: true,
    saveUninitialized: true,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'none'
    }
  },
  cors: {
    origin: env.NODE_ENV === 'production' 
      ? env.CLIENT_URL || 'http://localhost:5173'
      : ['http://localhost:5173', 'http://0.0.0.0:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie']
  }
};

export default config;
