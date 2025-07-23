/**
 * @file A utility for formatting log messages.
 */

class MessageFormatter {
    /**
     * Formats a log message with a timestamp and level.
     * @param {string} level The log level (e.g., 'INFO', 'ERROR').
     * @param {string} message The log message.
     * @param {object} [metadata] Optional metadata to include.
     * @returns {string} The formatted log message.
     */
    format(level, message, metadata = {}) {
        const timestamp = new Date().toISOString();
        let formattedMessage = `[${timestamp}] [${level}] ${message}`;

        if (metadata && Object.keys(metadata).length > 0) {
            try {
                const metadataString = JSON.stringify(metadata, null, 2);
                formattedMessage += `\n${metadataString}`;
            } catch (error) {
                // In case of circular references in metadata
                formattedMessage += `\n[Could not stringify metadata]`;
            }
        }

        return formattedMessage;
    }
}

export default MessageFormatter;
