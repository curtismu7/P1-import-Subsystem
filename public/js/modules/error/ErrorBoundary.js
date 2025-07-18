import React from 'react';
import PropTypes from 'prop-types';
import { ErrorManager } from './error-manager';
import { ErrorTypes, ErrorSeverity } from './error-types';

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors in their child component tree, logs those errors,
 * and displays a fallback UI instead of the component tree that crashed.
 */
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false,
            error: null,
            errorInfo: null
        };
        
        // Get error manager from props or context
        this.errorManager = props.errorManager || 
                           (props.context && props.context.errorManager) ||
                           new ErrorManager(console);
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { 
            hasError: true,
            error: error
        };
    }

    componentDidCatch(error, errorInfo) {
        // Log the error to our error manager
        this.errorManager.handleError(error, {
            component: errorInfo.componentStack.split('\n')[0].trim() || 'Unknown',
            stack: errorInfo.componentStack,
            boundary: this.constructor.name,
            ...this.props.errorContext
        });

        // Update state with error info
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
    }

    handleReset = () => {
        // Reset the error state
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
        
        // Call the onReset callback if provided
        if (this.props.onReset) {
            this.props.onReset();
        }
    };

    renderFallbackUI() {
        const { error, errorInfo } = this.state;
        const { 
            fallback: FallbackComponent, 
            showErrorDetails = process.env.NODE_ENV !== 'production',
            children
        } = this.props;

        // Use custom fallback component if provided
        if (FallbackComponent) {
            return (
                <FallbackComponent 
                    error={error} 
                    errorInfo={errorInfo} 
                    onReset={this.handleReset}
                />
            );
        }

        // Default fallback UI
        return (
            <div className="error-boundary" style={styles.container}>
                <div style={styles.content}>
                    <h2 style={styles.title}>Something went wrong.</h2>
                    <p style={styles.message}>
                        We're sorry for the inconvenience. An error has occurred.
                    </p>
                    
                    {showErrorDetails && (
                        <details style={styles.details}>
                            <summary>Error Details</summary>
                            <pre style={styles.errorText}>
                                {error && error.toString()}
                            </pre>
                            <pre style={styles.stackTrace}>
                                {errorInfo && errorInfo.componentStack}
                            </pre>
                        </details>
                    )}
                    
                    <div style={styles.actions}>
                        <button 
                            onClick={this.handleReset}
                            style={styles.button}
                        >
                            Try Again
                        </button>
                        <button 
                            onClick={() => window.location.reload()}
                            style={{ ...styles.button, ...styles.secondaryButton }}
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    render() {
        if (this.state.hasError) {
            return this.renderFallbackUI();
        }
        
        return this.props.children;
    }
}

// Prop types
ErrorBoundary.propTypes = {
    // Custom fallback component
    fallback: PropTypes.oneOfType([
        PropTypes.node,
        PropTypes.func
    ]),
    
    // Whether to show error details (defaults to true in development)
    showErrorDetails: PropTypes.bool,
    
    // Error manager instance
    errorManager: PropTypes.instanceOf(ErrorManager),
    
    // Additional context for error reporting
    errorContext: PropTypes.object,
    
    // Callback when error is reset
    onReset: PropTypes.func,
    
    // Child components
    children: PropTypes.node
};

// Default props
ErrorBoundary.defaultProps = {
    showErrorDetails: process.env.NODE_ENV !== 'production',
    errorContext: {}
};

// Inline styles
const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        color: '#212529'
    },
    content: {
        maxWidth: '600px',
        padding: '30px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
    },
    title: {
        color: '#dc3545',
        marginTop: 0
    },
    message: {
        marginBottom: '20px',
        lineHeight: '1.5'
    },
    details: {
        margin: '20px 0',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        fontSize: '14px'
    },
    errorText: {
        color: '#dc3545',
        whiteSpace: 'pre-wrap',
        margin: '0 0 10px 0',
        fontFamily: 'monospace'
    },
    stackTrace: {
        color: '#6c757d',
        whiteSpace: 'pre-wrap',
        margin: '10px 0 0 0',
        fontFamily: 'monospace',
        fontSize: '12px'
    },
    actions: {
        display: 'flex',
        gap: '10px',
        marginTop: '20px'
    },
    button: {
        padding: '8px 16px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        transition: 'background-color 0.2s'
    },
    secondaryButton: {
        backgroundColor: '#6c757d'
    }
};

export default ErrorBoundary;
