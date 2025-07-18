# Data Directory

This directory contains all data files used by the PingOne Import Tool, organized by type.

## 📁 Directory Structure

### `/exports/` - Export Files
Contains all CSV export files from PingOne operations:
- **pingone-users-export-*.csv** - User exports from PingOne
- **Download *.csv** - Downloaded user data files
- **test-*.csv** - Test data files
- **sample-*.csv** - Sample user data files

### `/samples/` - Sample Data
Contains sample data files for testing and development:
- **test_users.csv** - Test user data
- **sample_users.csv** - Sample user data
- **A-fresh_test_users.csv** - Fresh test user data

### `/settings.json` - Application Settings
Main configuration file containing:
- PingOne API credentials
- Environment settings
- Application configuration

## 🔧 Usage

### Export Files
Export files are automatically generated when:
- Users are exported from PingOne
- Import operations are performed
- Test data is downloaded

### Sample Data
Sample data files are used for:
- Testing import functionality
- Development and debugging
- User training and demonstrations

### Settings
The settings.json file contains:
- API client ID and secret
- Environment ID
- Region configuration
- Rate limiting settings

## 📋 File Naming Convention

### Export Files
- **pingone-users-export-YYYY-MM-DD-HHMM.csv** - Timestamped exports
- **Download *.csv** - Manually downloaded files
- **test-*.csv** - Test-specific files

### Sample Files
- **sample_*.csv** - Sample data files
- **test_*.csv** - Test data files
- **A-*.csv** - Alpha test files

## 🔒 Security Notes

- **Never commit sensitive data** - Export files may contain user information
- **Use .gitignore** - Ensure sensitive files are not tracked
- **Clean up regularly** - Remove old export files to save space
- **Validate data** - Always verify data before importing

## 🧹 Maintenance

### Regular Cleanup
- Remove export files older than 30 days
- Archive important exports to long-term storage
- Clean up test files after testing

### Backup Strategy
- Keep important exports in a separate backup location
- Regularly backup settings.json
- Document any custom configurations

## 📊 Data Formats

### CSV Format
All CSV files follow this structure:
- **Header row** with column names
- **Data rows** with user information
- **UTF-8 encoding** for international characters
- **Comma-separated values**

### Required Fields
- **username** or **email** - User identifier
- **givenName** or **firstname** - First name
- **familyName** or **lastname** - Last name
- **population** - Population assignment

### Optional Fields
- **phone** - Phone number
- **title** - Job title
- **department** - Department assignment

## 🔍 Troubleshooting

### Common Issues
- **Encoding problems** - Ensure UTF-8 encoding
- **Missing fields** - Check required field names
- **Invalid data** - Validate data before import
- **Large files** - Consider splitting large exports

### Validation
- Use the application's validation features
- Check file format and encoding
- Verify required fields are present
- Test with small sample files first 