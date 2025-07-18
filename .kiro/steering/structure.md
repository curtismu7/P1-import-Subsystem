# Project Structure

## Directory Organization

```
pingone-import/
├── auth-subsystem/         # Authentication subsystem (isolated)
│   ├── client/            # Client-side auth components
│   └── server/            # Server-side auth components
├── public/                # Static assets and client-side code
│   ├── css/              # Stylesheets
│   ├── js/               # Client-side JavaScript
│   ├── vendor/           # Third-party libraries
│   └── swagger/          # Swagger UI files
├── routes/                # Express route handlers
│   └── api/              # API route handlers
├── server/                # Server-side utilities
├── test/                  # Test files
│   ├── api/              # API tests
│   ├── integration/      # Integration tests
│   ├── frontend/         # Frontend tests
│   ├── unit/             # Unit tests
│   ├── ui/               # UI tests
│   └── mocks/            # Test mocks and fixtures
├── data/                  # Configuration data and exports
├── docs/                  # Documentation
│   ├── api/              # API documentation
│   ├── features/         # Feature documentation
│   └── deployment/       # Deployment guides
├── logs/                  # Application logs
└── scripts/               # Utility scripts
```

## Key Files

- `server.js`: Main application entry point
- `package.json`: Project dependencies and scripts
- `swagger.js`: Swagger/OpenAPI configuration
- `.env`: Environment variables (not in repo)
- `data/settings.json`: Application settings

## Code Organization Patterns

### Server-Side

1. **Modular Routes**: Routes are organized by feature area in the `routes/` directory
2. **Middleware Pattern**: Express middleware for authentication, logging, etc.
3. **Service Layer**: Business logic separated from route handlers
4. **Utility Modules**: Shared utilities in the `server/` directory

### Client-Side

1. **Module Pattern**: Client-side code uses ES modules
2. **Event-Driven Architecture**: Event listeners for UI interactions
3. **API Client Pattern**: Structured API clients for server communication
4. **Component-Based**: UI components are organized by feature

## Authentication Architecture

The authentication subsystem is isolated in the `auth-subsystem/` directory:

- `auth-subsystem/server/`: Server-side authentication API
- `auth-subsystem/client/`: Client-side authentication utilities
- `auth-subsystem/server/pingone-auth.js`: PingOne authentication service
- `auth-subsystem/server/credential-encryptor.js`: Secure credential storage

## Testing Organization

Tests are organized by type in the `test/` directory:

- `test/unit/`: Unit tests for individual functions
- `test/integration/`: Integration tests for API endpoints
- `test/api/`: Tests for external API interactions
- `test/frontend/`: Tests for client-side code
- `test/ui/`: Tests for UI components

## Logging Structure

Logs are organized by type in the `logs/` directory:

- `logs/access.log`: HTTP access logs
- `logs/error.log`: Error logs
- `logs/application.log`: Application logs
- `logs/combined.log`: Combined logs
- `logs/performance.log`: Performance metrics

## Documentation Structure

Documentation is organized by type in the `docs/` directory:

- `docs/api/`: API documentation
- `docs/features/`: Feature documentation
- `docs/deployment/`: Deployment guides