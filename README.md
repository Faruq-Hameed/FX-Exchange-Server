Architecture Design
Core Modules

Auth Module - User registration, authentication, email verification
User Module - User profile management
Wallet Module - Multi-currency wallet management
FX Module - Currency exchange rates and conversion
Transaction Module - Transaction history and records

Database Schema Design

User

id, email, password, isVerified, createdAt, updatedAt


Wallet

id, userId, currency, balance, createdAt, updatedAt


Transaction

id, userId, type (FUNDING, CONVERSION), status, amount, fromCurrency, toCurrency, exchangeRate, createdAt


OTP

id, userId, code, expiresAt, isUsed


ExchangeRate

id, baseCurrency, targetCurrency, rate, updatedAt




Project set up
# Create NestJS project
npm i -g @nestjs/cli
nest new fx-trading-backend

# Change directory to project
cd fx-trading-backend

# Install required dependencies
pnpm install --save @nestjs/typeorm typeorm pg class-validator class-transformer save @nestjs/passport passport passport-jwt passport-local save @nestjs/config bcrypt jsonwebtoken save nodemailer axios cache-manager
pnpm install --save-dev @types/passport-jwt @types/passport-local @types/bcrypt @types/nodemailer