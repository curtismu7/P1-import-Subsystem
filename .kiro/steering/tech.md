# Technical Stack & Build System

## Core Technologies
- **Runtime**: Node.js (v14+)
- **Server**: Express.js
- **Frontend**: Vanilla JavaScript with Browserify bundling
- **Authentication**: Custom PingOne authentication subsystem
- **Real-time Updates**: Socket.IO with WebSocket fallback
- **API Documentation**: Swagger/OpenAPI
- **Logging**: Winston with rotating file logs
- **Testing**: Jest with various testing utilities
- **Security**: Helmet, CORS, rate limiting, encryption

## Key Dependencies
- **Express**: Web server framework
- **Socket.IO**: Real-time bidirectional event-based communication
- **Winston**: Logging library
- **Axios**: HTTP client
- **CSV-Parse**: CSV parsing
- **Bcryptjs**: Password hashing
- **Joi**: Data validation
- **JWT**: JSON Web Token implementation
- **Swagger**: API documentation

## Build System
- **Bundling**: Browserify with Babel for transpilation
- **Transpilation**: Babel for ES6+ support
- **Testing**: Jest for unit, integration, and API tests
- **Development**: Nodemon for auto-reloading

## Common Commands

### Installation
```bash
# Install dependencies
npm install

# Set up environment variables
cp env.example .env
```

### Development
```bash
# Start development server
npm start

# Start with auto-reloading
npm run dev

# Build client-side bundle
npm run build:bundle
```

### Testing
```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:api
npm run test:frontend

# Run tests with coverage
npm run test:coverage
```

### Server Management
```bash
# Stop server
npm run stop

# Restart server
npm run restart

# Restart server safely
npm run restart:safe

# Check port status
npm run check:port
```

### Updates & Maintenance
```bash
# Check for package updates
npm run update:check

# Auto-update packages
npm run update:auto

# Check for update conflicts
npm run update:conflicts

# Safe update (check conflicts then update)
npm run update:safe
```

## Environment Configuration
The application uses environment variables for configuration, which can be set in a `.env` file:

- `PINGONE_CLIENT_ID`: PingOne API client ID
- `PINGONE_CLIENT_SECRET`: PingOne API client secret
- `PINGONE_ENVIRONMENT_ID`: PingOne environment ID
- `PINGONE_REGION`: PingOne region code
- `PORT`: Server port (default: 4000)
- `NODE_ENV`: Environment (development, test, production)
- `AUTH_SUBSYSTEM_ENCRYPTION_KEY`: Encryption key for auth subsystem

## Deployment
The application is configured for deployment on Render with the `render.yaml` configuration file.