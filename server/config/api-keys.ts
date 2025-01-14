import { execSync } from 'child_process';
import fs from 'fs';

const REPLIT_ENV = process.env.REPLIT_ENVIRONMENT === 'production' || process.env.REPLIT_DEPLOYMENT_ID;

interface ApiKeys {
  GOOGLE_PLACES_API_KEY: string;
  YELP_API_KEY: string;
  TRIPADVISOR_API_KEY: string;
}

class ApiKeysManager {
  private static instance: ApiKeysManager;
  private initialized = false;
  private keys: ApiKeys | null = null;

  private constructor() {}

  public static getInstance(): ApiKeysManager {
    if (!ApiKeysManager.instance) {
      ApiKeysManager.instance = new ApiKeysManager();
    }
    return ApiKeysManager.instance;
  }

  private async readBashrc(secretName: string): Promise<string | null> {
    try {
      const bashrcContent = await fs.promises.readFile('/home/runner/.bashrc', 'utf8');
      const exportLine = bashrcContent
        .split('\n')
        .find(line => line.trim().startsWith(`export ${secretName}=`));
      
      if (exportLine) {
        const match = exportLine.match(new RegExp(`export ${secretName}=["']?([^"']+)["']?`));
        if (match?.[1]) {
          console.log(`[Config] Successfully read ${secretName} from .bashrc`);
          return match[1].trim();
        }
      }
      return null;
    } catch (e) {
      console.log(`[Config] Could not read ${secretName} from .bashrc:`, e instanceof Error ? e.message : 'Unknown error');
      return null;
    }
  }

  private async getSecret(secretName: string): Promise<string | null> {
    if (REPLIT_ENV) {
      const results: Array<string | null> = [];

      // Method 1: Try to read from Replit's secrets file
      try {
        const secretsPath = `/home/runner/secrets/${secretName}`;
        const result = await fs.promises.readFile(secretsPath, 'utf8');
        const trimmed = result.trim();
        if (trimmed) {
          console.log(`[Config] Successfully read ${secretName} from secrets file`);
          return trimmed;
        }
        results.push(null);
      } catch (e) {
        console.log(`[Config] Could not read ${secretName} from secrets file:`, e instanceof Error ? e.message : 'Unknown error');
        results.push(null);
      }

      // Method 2: Try to use printenv with enhanced error handling
      try {
        const result = execSync(`printenv ${secretName}`, { stdio: ['pipe', 'pipe', 'pipe'] });
        const trimmed = result.toString().trim();
        if (trimmed) {
          console.log(`[Config] Successfully read ${secretName} using printenv`);
          return trimmed;
        }
        results.push(null);
      } catch (e) {
        console.log(`[Config] Could not read ${secretName} using printenv:`, e instanceof Error ? e.message : 'Unknown error');
        results.push(null);
      }

      // Method 3: Try to read directly from .bashrc
      const bashrcValue = await this.readBashrc(secretName);
      if (bashrcValue) {
        return bashrcValue;
      }
      results.push(null);

      if (results.every(r => r === null)) {
        console.log(`[Config] All methods failed to retrieve ${secretName}`);
      }
    }

    const envValue = process.env[secretName];
    return envValue?.trim() || null;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const [googleKey, yelpKey, tripAdvisorKey] = await Promise.all([
        this.getSecret('GOOGLE_PLACES_API_KEY'),
        this.getSecret('YELP_API_KEY'),
        this.getSecret('TRIPADVISOR_API_KEY'),
      ]);

      const keys = {
        GOOGLE_PLACES_API_KEY: googleKey,
        YELP_API_KEY: yelpKey,
        TRIPADVISOR_API_KEY: tripAdvisorKey,
      } as const;

      // Validate required API keys
      const missingKeys = Object.entries(keys)
        .filter(([_, value]) => !value || value.trim() === '')
        .map(([key]) => key);

      if (missingKeys.length > 0) {
        const error = `Missing required API keys: ${missingKeys.join(', ')}`;
        console.error('[Config] Error:', error);
        throw new Error(error);
      }

      this.keys = keys as ApiKeys;
      this.initialized = true;
    } catch (error) {
      this.initialized = false;
      this.keys = null;
      throw error;
    }
  }

  public getKeys(): ApiKeys {
    if (!this.initialized || !this.keys) {
      throw new Error('API keys have not been initialized. Call initialize() first.');
    }
    return this.keys;
  }
}

// Export a singleton instance
export const apiKeysManager = ApiKeysManager.getInstance(); 