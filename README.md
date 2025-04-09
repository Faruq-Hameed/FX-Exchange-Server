# FX Trading App Backend

This is the backend implementation for an FX Trading application built using NestJS, TypeORM, and PostgreSQL.

## Features

- User registration and email verification
- Multi-currency wallet management
- Real-time FX rates integration
- Currency conversion and trading
- Transaction history

## Tech Stack

- **Backend Framework**: NestJS
- **ORM**: TypeORM
- **Database**: PostgreSQL
- **Authentication**: JWT
- **API Documentation**: Postman
- **Email**: Nodemailer

## Project Structure

The application is built with a modular architecture:

- **Auth Module**: User registration, authentication, email verification
- **User Module**: User profile management
- **Wallet Module**: Multi-currency wallet management
- **FX Module**: Currency exchange rates and conversion
- **Transaction Module**: Transaction history and records

## Key Points About the Implementation

- **Authentication Flow**:

- Users register with email and password
- They receive an OTP via email for verification
- The otp got deleted if not used with the assistance of nest scheduler
- Only verified users can access trading features


- **Wallet System**:

- ** Each user can have multiple currency wallets
- The system creates wallets on-demand for new currencies-
- All financial operations are performed in database transactions-
- 
- **Exchange Rate Integration**:

Integrates with external exchange rate API-
- Caches rates for performance-
- Has fallback mechanisms for API failures-
- 

- **Transaction Security**:

- **Prevents double-spending through transaction locks**-
- Validates balances before transfers-
- Maintains detailed transaction history-
- idempotency


## Setup Instructions

### Prerequisites

- Node.js (v16 or newer)
- PostgreSQL
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/fx-trading-backend.git
cd fx-trading-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up the environment variables:
Copy the `.env.example` file to `.env` and update the values:
```bash
cp .env.example .env
```

4. Create the database:
```bash
CREATE DATABASE fx_trading;
```

5. Run the application:
```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## API Documentation
[Postman Doc](https://app.getpostman.com/join-team?invite_code=d5c1b972bd77b3f89b45077487704c07797b105aec4f0fd0ad00171ec30cb5b3&target_code=0c8626f0a84747264c052ec173eb680c)


## Key Assumptions

1. **Multi-Currency Support**: The system supports multiple currencies (NGN, USD, EUR, GBP) with the ability to easily add more.
2. **Exchange Rate Handling**: Exchange rates are fetched from an external API and cached for performance. Fallback mechanisms are in place.
3. **Transaction Atomicity**: All currency conversions are handled within database transactions to ensure consistency.
4. **Wallet Creation**: Wallets are created on-demand when a user wants to interact with a new currency.
5. **Security**: All endpoints except for registration and login require authentication.

## Architectural Decisions

### Database Schema

- **Users**: Stores user information and authentication details
- **Wallets**: Employs a multi-record approach for currencies, where each currency balance has its own record
- **Transactions**: Detailed history of all financial operations
- **OTPs**: Stores one-time passwords for email verification
- **Exchange Rates**: Caches current exchange rates

### Transaction Safety

- Database transactions are used to ensure atomicity of all wallet operations
- Proper validation prevents negative balances and double-spending

### Scalability Considerations

- Caching of exchange rates improves performance
- The architecture is modular, making it easy to add new features or currencies
- The system is stateless, allowing for horizontal scaling

### Error Handling

- Comprehensive error management for API failures
- Fallback mechanisms for exchange rate fetching
- Proper HTTP error responses with meaningful messages

## Usage Examples

### Register a User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "securepassword"}'
```

### Fund a Wallet

```bash
curl -X POST http://localhost:3000/wallet/fund \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"currency": "NGN", "amount": 10000}'
```

### Convert Currency

```bash
curl -X POST http://localhost:3000/wallet/transfer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"fromCurrency": "NGN", "toCurrency": "USD", "amount": 1000}'
```

### View Transaction History

```bash
curl -X GET http://localhost:3000/transactions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Testing

Run tests with:

```bash
# Unit tests
npm run test

# e2e tests
npm run test:e2e

# Test coverage
npm run test:cov
```