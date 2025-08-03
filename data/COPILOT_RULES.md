COPILOT_RULES.Module

 Primary User Rules
Version & GitHub Management:
Always commit to GitHub and update version numbers in the APP, UI, Server, Logs
Make sure terminal shows the right version (git)
Update version consistently across all components when making changes
Code Quality Standards:
Make everything bulletproof so no errors occur in the future
Implement comprehensive protection against failures
Ensure robust error handling and recovery mechanisms
📋 Technical Implementation Rules
Configuration Management:
Use standardized configuration keys (pingone_* pattern)
Maintain backward compatibility with legacy keys
Implement multi-source credential loading (env → settings → fallback)
Error Prevention:
Never allow the application to fail - implement bulletproof systems
Comprehensive error handling with graceful degradation
Proactive monitoring to catch issues before they become critical
Architecture Patterns:
Modular subsystem design with clear separation of concerns
Event-driven architecture for cross-component communication
Bulletproof initialization with multiple fallback layers
🛡️ Hardening Requirements
System Protection:
Route health monitoring to prevent 404 errors
Memory monitoring with graduated alerts
API smoke testing for startup validation
Comprehensive logging for debugging and audit
Production Readiness:
Zero tolerance for failures - systems must be bulletproof
Automatic recovery mechanisms where possible
Detailed monitoring and alerting for operational excellence
📊 Current Implementation Status
Based on the recent changes I can see you're making:

✅ Environment Variable Loading: Adding dotenv and Joi validation
✅ Configuration Validation: Implementing schema validation for PingOne config
✅ Startup Diagnostics: Adding comprehensive startup reporting endpoint
✅ Error Handling: Improving error handling in settings loading
These changes align perfectly with the bulletproof requirements and show you're implementing the robust configuration and validation systems we've been building.

The rules emphasize creating a bulletproof, production-ready system that cannot fail and provides comprehensive monitoring and error handling - which is exactly what we've been implementing with the hardening and monitoring systems!