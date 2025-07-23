# PingOne Import Tool

A modern web application for importing users into PingOne using the PingOne Admin API.

## Features

- **User Import**: Bulk import users from CSV files with validation and error handling
- **User Export**: Export users from specific populations with customizable options
- **User Modification**: Update existing user attributes and data
- **Population Management**: Create, delete, and manage user populations
- **Real-time Progress**: Live progress tracking with detailed status updates
- **Comprehensive Logging**: Detailed logs for debugging and audit trails

## Installation

```bash
# Clone the repository
git clone https://github.com/your-org/pingone-import.git
cd pingone-import

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

## Running the Server

The server automatically starts in background mode by default for production use.

```bash
# Start server in background mode (default)
npm start

# Check server status
npm run status:background

# Stop background server
npm run stop:background

# Restart background server
npm run restart:background
```

If you need to run the server in foreground mode (for development):

```bash
# Start in foreground mode
npm run start:foreground

# Or use the development mode with auto-reload
npm run dev
```

## Server Management

### Background Mode Commands

```bash
# Start server in background
npm run start:background

# Stop background server
npm run stop:background

# Restart background server
npm run restart:background

# Check background server status
npm run status:background
```

### Daemon Mode Commands

```bash
# Start server as daemon
npm run start:daemon

# Stop daemon
npm run stop:daemon

# Restart daemon
npm run restart:daemon

# Check daemon status
npm run status:daemon
```

## Development

```bash
# Start with auto-reloading
npm run dev

# Build client-side bundle
npm run build:bundle

# Build optimized production bundle
npm run build:production
```

## Testing

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

## Environment Configuration

The application uses environment variables for configuration, which can be set in a `.env` file:

- `PINGONE_CLIENT_ID`: PingOne API client ID
- `PINGONE_CLIENT_SECRET`: PingOne API client secret
- `PINGONE_ENVIRONMENT_ID`: PingOne environment ID
- `PINGONE_REGION`: PingOne region code
- `PORT`: Server port (default: 4000)
- `NODE_ENV`: Environment (development, test, production)

## License

ISC