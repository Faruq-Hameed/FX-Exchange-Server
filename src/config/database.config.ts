import { registerAs } from '@nestjs/config';

// This file is used to configure the database connection settings for the application.
// It uses the `registerAs` function from the `@nestjs/config` package to create a configuration object.

export default registerAs('database', () => ({
  type: 'postgres',
  url: process.env.DATABASE_URL, // the full connection string including the SSL option
  ssl: {
    rejectUnauthorized: false,
  },
  entities: ['dist/**/*.entity{.ts,.js}'],
  synchronize: process.env.NODE_ENV !== 'production', //true for development, false for production
}));