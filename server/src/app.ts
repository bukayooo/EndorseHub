import express from 'express';
import swaggerUi from 'swagger-ui-express';
import * as YAML from 'yaml';
import fs from 'fs';
import path from 'path';
import testimonialRoutes from './routes/testimonial.routes';

const app = express();

// Middleware
app.use(express.json());

// Read OpenAPI documentation
const openApiPath = path.join(__dirname, '../docs/openapi.yaml');
const openApiDoc = YAML.parse(fs.readFileSync(openApiPath, 'utf8'));

// Serve API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDoc));

// Mock authentication middleware
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // TODO: Implement proper authentication
  (req as any).user = { id: 'test-user-id' };
  next();
};

// Routes
app.use('/api/testimonials', requireAuth, testimonialRoutes);

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

export default app; 