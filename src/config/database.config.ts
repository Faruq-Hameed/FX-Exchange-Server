import { registerAs } from '@nestjs/config';

// This file is used to configure the database connection settings for the application.
// It uses the `registerAs` function from the `@nestjs/config` package to create a configuration object.

export default registerAs('database', () => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'fx_trading',
  entities: ['dist/**/*.entity{.ts,.js}'],
  synchronize: process.env.NODE_ENV !== 'production', //true for development, false for production
}));