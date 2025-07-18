# 📚 Swagger Documentation Access Guide

## 🚀 Quick Access

The Swagger documentation for the PingOne Import Tool API is now fully integrated and accessible through multiple endpoints.

### Primary Access Points

1. **Interactive Swagger UI**: `http://localhost:4000/api-docs`
   - Full interactive documentation
   - Try-it-out functionality
   - Request/response examples
   - Authentication support

2. **API Documentation Page**: `http://localhost:4000/api-docs.html`
   - Overview of all API features
   - Quick access links
   - Development information

3. **OpenAPI Specification**: `http://localhost:4000/api-docs.json`
   - Raw OpenAPI 3.0 specification
   - Machine-readable format
   - For integration with other tools

## 🔗 Direct URLs

| Endpoint | Description | Access Method |
|----------|-------------|---------------|
| `/api-docs` | Interactive Swagger UI | Browser |
| `/api-docs.html` | Documentation overview page | Browser |
| `/api-docs.json` | OpenAPI specification | Browser/API |

## 📋 Available Documentation

### API Endpoints Covered

The Swagger documentation includes comprehensive coverage of all API endpoints:

#### 🔄 Import Operations
- `POST /api/import` - Import users from CSV
- `GET /api/import/progress/{sessionId}` - Real-time progress tracking

#### 📤 Export Operations
- `POST /api/export-users` - Export users from PingOne

#### 🏥 Health & Status
- `GET /api/health` - Server health check

#### ⚙️ Feature Flags
- `GET /api/feature-flags` - Get all feature flags
- `POST /api/feature-flags/{flag}` - Update specific flag
- `POST /api/feature-flags/reset` - Reset all flags

#### 📊 Settings & Logs
- `GET /api/settings` - Get application settings
- `POST /api/settings` - Update application settings
- `GET /api/logs` - View application logs

#### 🔌 PingOne Proxy
- `GET /api/pingone/*` - PingOne API proxy (GET)
- `POST /api/pingone/*` - PingOne API proxy (POST)

## 🛠️ Features

### Interactive Documentation
- **Try-it-out**: Test endpoints directly from the UI
- **Request/Response Examples**: Pre-filled examples for all endpoints
- **Authentication**: Bearer token support
- **File Upload**: Support for CSV file uploads
- **Real-time Validation**: Input validation and error messages

### Comprehensive Coverage
- **All Endpoints**: Complete API coverage
- **Request/Response Schemas**: Detailed data models
- **Error Responses**: All possible error scenarios
- **Authentication**: Security schemes and requirements
- **Rate Limiting**: Rate limit information

### Developer-Friendly
- **OpenAPI 3.0**: Modern specification format
- **JSON Schema**: Machine-readable schemas
- **Code Generation**: Compatible with code generators
- **Integration Ready**: Works with API testing tools

## 🔐 Authentication

Most endpoints require PingOne API authentication:

```bash
# Example with curl
curl -H "Authorization: Bearer YOUR_PINGONE_TOKEN" \
     -H "Content-Type: application/json" \
     http://localhost:4000/api/health
```

## 📁 File Upload Support

CSV file uploads are supported with:
- **Max Size**: 10MB
- **Format**: multipart/form-data
- **Validation**: Automatic CSV validation
- **Progress Tracking**: Real-time upload progress

## ⚡ Rate Limiting

API endpoints are rate-limited:
- **Health checks**: 200 requests/second
- **Logs API**: 100 requests/second  
- **General API**: 150 requests/second

## 🚀 Getting Started

### 1. Start the Server
```bash
npm start
```

### 2. Access Documentation
```bash
# Open in browser
open http://localhost:4000/api-docs

# Or view the overview page
open http://localhost:4000/api-docs.html
```

### 3. Test an Endpoint
1. Navigate to any endpoint in the Swagger UI
2. Click "Try it out"
3. Fill in required parameters
4. Click "Execute"
5. View the response

## 📊 Example Usage

### Health Check
```bash
curl http://localhost:4000/api/health
```

### Import Users
```bash
curl -X POST http://localhost:4000/api/import \
  -F "file=@users.csv" \
  -F "populationId=3840c98d-202d-4f6a-8871-f3bc66cb3fa8" \
  -F "populationName=Sample Users"
```

### Export Users
```bash
curl -X POST http://localhost:4000/api/export-users \
  -H "Content-Type: application/json" \
  -d '{
    "populationId": "3840c98d-202d-4f6a-8871-f3bc66cb3fa8",
    "format": "json",
    "includeDisabled": false
  }'
```

## 🔧 Development

### Adding New Endpoints
To add documentation for new endpoints:

1. Add JSDoc comments to your route handlers:
```javascript
/**
 * @swagger
 * /api/new-endpoint:
 *   get:
 *     summary: Description of endpoint
 *     tags: [Category]
 *     responses:
 *       200:
 *         description: Success response
 */
```

2. The endpoint will automatically appear in the Swagger UI

### Customizing Documentation
Edit `swagger.js` to:
- Modify API information
- Add custom CSS
- Configure UI options
- Add security schemes

## 📞 Support

### Troubleshooting

**Documentation not loading?**
- Check server is running: `curl http://localhost:4000/api/health`
- Verify port 4000 is accessible
- Check browser console for errors

**Endpoints not showing?**
- Ensure JSDoc comments are properly formatted
- Check that route files are included in `swagger.js`
- Restart server after adding new endpoints

**Authentication issues?**
- Verify PingOne credentials are configured
- Check token expiration
- Review authentication headers

### Useful Commands

```bash
# Check server status
curl http://localhost:4000/api/health

# View API specification
curl http://localhost:4000/api-docs.json | jq

# Test specific endpoint
curl -X GET http://localhost:4000/api/feature-flags

# View logs
curl http://localhost:4000/api/logs
```

## 📝 Notes

- Documentation is automatically generated from JSDoc comments
- All endpoints include request/response examples
- Error responses are documented for all endpoints
- File upload endpoints include proper multipart documentation
- SSE (Server-Sent Events) endpoints are properly documented
- Authentication requirements are clearly specified

---

**Last Updated**: July 2025  
**Version**: 4.9  
**Compatibility**: OpenAPI 3.0, Swagger UI 5.0+ 