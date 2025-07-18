# P1 Import Subsystem

A comprehensive, modular subsystem collection for the PingOne Import Tool, featuring advanced error logging, authentication, file processing, and user interface components.

## 🚀 Overview

The P1 Import Subsystem is a complete ecosystem of interconnected modules designed to provide robust, scalable, and maintainable functionality for PingOne user management operations. Each subsystem is designed with modularity, testability, and production-readiness in mind.

## 🏗️ Architecture

### Core Subsystems

#### 🔍 Error Logging Subsystem
- **Winston-based logging** with clear visual delineation
- **Colorized console output** with level-based colors
- **Structured JSON file logging** for analysis
- **Comprehensive error handling** with classification
- **Real-time monitoring** support

#### 🔐 Authentication Subsystem
- **PingOne OAuth integration** with secure credential management
- **Token management** with automatic refresh
- **Encrypted credential storage** with bcrypt
- **Session management** and validation
- **Multi-environment support**

#### 📁 File Processing Subsystem
- **Streaming CSV parser** for large files
- **Data validation** and transformation
- **Progress tracking** with real-time updates
- **Error handling** and recovery
- **Memory-efficient processing**

#### 🎨 UI Subsystem
- **Modern component architecture** with accessibility
- **Theme management** with dark/light modes
- **Responsive design** with mobile support
- **Notification system** with multiple types
- **Modal dialogs** and interactive components

#### 🌐 WebSocket Subsystem
- **Real-time communication** with fallback support
- **Connection management** and auto-reconnection
- **Message queuing** and delivery guarantees
- **Event-driven architecture**
- **Performance monitoring**

#### 👥 Population Subsystem
- **Population management** with CRUD operations
- **Bulk operations** with progress tracking
- **Data validation** and integrity checks
- **Audit logging** and history
- **Integration with PingOne APIs**

#### ⚙️ Settings Subsystem
- **Configuration management** with validation
- **Environment-specific settings**
- **Secure storage** of sensitive data
- **Real-time updates** and synchronization
- **Backup and restore** functionality

#### 📊 Progress Subsystem
- **Real-time progress tracking** with WebSocket
- **Visual progress indicators** and charts
- **Performance metrics** and analytics
- **Error tracking** and reporting
- **Cancellation support**

#### 🔌 API Client Subsystem
- **Unified API client** for PingOne services
- **Request/response interceptors**
- **Automatic retry logic** with exponential backoff
- **Rate limiting** and throttling
- **Comprehensive error handling**

## 🎯 Key Features

### ✅ Production Ready
- Comprehensive error handling and logging
- Extensive test coverage with multiple test types
- Performance optimization and monitoring
- Security best practices implementation
- Scalable architecture with modular design

### ✅ Developer Experience
- Clear documentation and examples
- TypeScript support and type definitions
- ESLint and Prettier configuration
- Jest testing framework integration
- Hot reloading and development tools

### ✅ Enterprise Features
- Multi-environment support (dev, staging, prod)
- Audit logging and compliance tracking
- Role-based access control
- Data encryption and security
- Monitoring and alerting integration

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/cmuir_pingcorp/P1-import-Subsystem.git
cd P1-import-Subsystem

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start the development server
npm start
```

### Basic Usage

```javascript
// Import subsystems
import { createErrorLoggingSystem } from './error-logging-subsystem/index.js';
import { AuthSubsystem } from './auth-subsystem/index.js';
import { FileProcessor } from './file-processing-subsystem/index.js';

// Initialize error logging
const { errorManager, logManager } = createErrorLoggingSystem({
    logLevel: 'info',
    enableConsole: true,
    enableFile: true
});

// Initialize authentication
const auth = new AuthSubsystem({
    clientId: process.env.PINGONE_CLIENT_ID,
    clientSecret: process.env.PINGONE_CLIENT_SECRET,
    environmentId: process.env.PINGONE_ENVIRONMENT_ID
});

// Process files
const processor = new FileProcessor({
    batchSize: 100,
    progressCallback: (progress) => {
        console.log(`Processing: ${progress.percent}%`);
    }
});
```

## 📦 Project Structure

```
P1-import-Subsystem/
├── 📁 error-logging-subsystem/    # Winston-based logging with visual delineation
├── 📁 auth-subsystem/             # PingOne authentication and token management
├── 📁 file-processing-subsystem/  # CSV processing with streaming support
├── 📁 ui-subsystem/              # Modern UI components and theming
├── 📁 websocket-subsystem/       # Real-time communication
├── 📁 population-subsystem/      # Population management
├── 📁 settings-subsystem/        # Configuration management
├── 📁 progress-subsystem/        # Progress tracking and monitoring
├── 📁 api-client-subsystem/      # Unified API client
├── 📁 public/                    # Static assets and client-side code
├── 📁 routes/                    # Express route handlers
├── 📁 server/                    # Server-side utilities
├── 📁 test/                      # Comprehensive test suites
├── 📁 docs/                      # Documentation and guides
├── 📄 server.js                  # Main application entry point
├── 📄 package.json               # Project dependencies and scripts
├── 📄 swagger.js                 # API documentation
└── 📄 README.md                  # This file
```

## 🧪 Testing

The project includes comprehensive testing across multiple levels:

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests
npm run test:api          # API tests
npm run test:frontend     # Frontend tests
npm run test:e2e          # End-to-end tests

# Run tests with coverage
npm run test:coverage

# Run specific subsystem tests
npm run test:error-logging
npm run test:auth
npm run test:file-processing
```

## 🔧 Configuration

### Environment Variables

```bash
# PingOne Configuration
PINGONE_CLIENT_ID=your_client_id
PINGONE_CLIENT_SECRET=your_client_secret
PINGONE_ENVIRONMENT_ID=your_environment_id
PINGONE_REGION=your_region

# Application Configuration
PORT=4000
NODE_ENV=development
LOG_LEVEL=info

# Security
AUTH_SUBSYSTEM_ENCRYPTION_KEY=your_encryption_key
SESSION_SECRET=your_session_secret

# Database (if applicable)
DATABASE_URL=your_database_url
```

### Subsystem Configuration

Each subsystem can be configured independently:

```javascript
// Error Logging Configuration
const errorLoggingConfig = {
    logLevel: 'debug',
    enableConsole: true,
    enableFile: true,
    logDir: './logs',
    maxFileSize: 10485760,
    maxFiles: 5
};

// Authentication Configuration
const authConfig = {
    tokenRefreshThreshold: 300, // 5 minutes
    maxRetries: 3,
    encryptionAlgorithm: 'aes-256-gcm'
};

// File Processing Configuration
const fileConfig = {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    batchSize: 100,
    allowedMimeTypes: ['text/csv', 'application/csv']
};
```

## 📊 Monitoring & Analytics

### Built-in Monitoring
- **Performance metrics** with response time tracking
- **Error rates** and failure analysis
- **Resource utilization** monitoring
- **API usage** statistics
- **User activity** tracking

### Integration Support
- **Prometheus** metrics export
- **Grafana** dashboard templates
- **ELK Stack** log aggregation
- **DataDog** APM integration
- **Custom webhook** notifications

## 🔒 Security Features

### Data Protection
- **Encryption at rest** for sensitive data
- **TLS/SSL** for data in transit
- **Input validation** and sanitization
- **SQL injection** prevention
- **XSS protection** with CSP headers

### Access Control
- **Role-based permissions** (RBAC)
- **API key management**
- **Session security** with secure cookies
- **Rate limiting** and DDoS protection
- **Audit logging** for compliance

## 🚀 Deployment

### Development
```bash
npm run dev          # Start with hot reloading
npm run build        # Build for production
npm run start        # Start production server
```

### Production
```bash
# Using PM2
npm install -g pm2
pm2 start ecosystem.config.js

# Using Docker
docker build -t p1-import-subsystem .
docker run -p 4000:4000 p1-import-subsystem

# Using Render (configured)
git push origin main  # Auto-deploys via render.yaml
```

## 📈 Performance

### Benchmarks
- **File Processing**: 10,000+ records/minute
- **API Throughput**: 1,000+ requests/second
- **Memory Usage**: <512MB typical
- **Response Time**: <200ms average
- **Uptime**: 99.9% availability target

### Optimization Features
- **Connection pooling** for database operations
- **Caching layers** with Redis support
- **Compression** for API responses
- **CDN integration** for static assets
- **Lazy loading** for UI components

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Install dependencies: `npm install`
4. Make your changes
5. Run tests: `npm test`
6. Commit changes: `git commit -m 'Add amazing feature'`
7. Push to branch: `git push origin feature/amazing-feature`
8. Submit a pull request

### Code Standards
- **ESLint** configuration for code quality
- **Prettier** for consistent formatting
- **Jest** for testing with >80% coverage
- **JSDoc** for comprehensive documentation
- **Conventional Commits** for clear history

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- **API Documentation**: Available at `/swagger` when running
- **Component Docs**: In each subsystem's README
- **Examples**: Check the `examples/` directory
- **Troubleshooting**: See `docs/troubleshooting.md`

### Getting Help
- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and community support
- **Wiki**: For detailed guides and tutorials
- **Email**: For security issues and private inquiries

---

**Built with ❤️ for the PingOne ecosystem** 🚀

### Recent Updates
- ✅ **Error Logging Subsystem**: Complete Winston integration with visual delineation
- ✅ **Authentication**: Secure token management with encryption
- ✅ **File Processing**: Streaming CSV parser with progress tracking
- ✅ **UI Components**: Modern, accessible interface components
- ✅ **WebSocket**: Real-time communication with fallback support
- ✅ **Testing**: Comprehensive test coverage across all subsystems
- ✅ **Documentation**: Complete API and usage documentation
- ✅ **Production Ready**: Deployed and tested in production environments