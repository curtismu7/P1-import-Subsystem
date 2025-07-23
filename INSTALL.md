# PingOne Import Tool Installation Guide

## Basic Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/pingone-import.git
   cd pingone-import
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

4. Edit the `.env` file with your PingOne credentials:
   ```
   PINGONE_CLIENT_ID=your-client-id
   PINGONE_CLIENT_SECRET=your-client-secret
   PINGONE_ENVIRONMENT_ID=your-environment-id
   PINGONE_REGION=NorthAmerica
   PORT=4000
   NODE_ENV=production
   ```

5. Start the server:
   ```bash
   npm start
   ```

## Running as a System Service

### Using systemd (Linux)

1. Edit the `pingone-import.service` file:
   ```bash
   nano pingone-import.service
   ```

2. Update the following fields:
   - `User`: Your system username
   - `WorkingDirectory`: Full path to the pingone-import directory

3. Copy the service file to systemd:
   ```bash
   sudo cp pingone-import.service /etc/systemd/system/
   ```

4. Enable and start the service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable pingone-import
   sudo systemctl start pingone-import
   ```

5. Check service status:
   ```bash
   sudo systemctl status pingone-import
   ```

### Using PM2 (Cross-platform)

1. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```

2. Start the application with PM2:
   ```bash
   pm2 start npm --name "pingone-import" -- start
   ```

3. Set up PM2 to start on system boot:
   ```bash
   pm2 startup
   pm2 save
   ```

4. Manage the application:
   ```bash
   pm2 status
   pm2 logs pingone-import
   pm2 restart pingone-import
   pm2 stop pingone-import
   ```

## Docker Installation

1. Build the Docker image:
   ```bash
   docker build -t pingone-import .
   ```

2. Run the container:
   ```bash
   docker run -d -p 4000:4000 \
     -e PINGONE_CLIENT_ID=your-client-id \
     -e PINGONE_CLIENT_SECRET=your-client-secret \
     -e PINGONE_ENVIRONMENT_ID=your-environment-id \
     -e PINGONE_REGION=NorthAmerica \
     --name pingone-import \
     pingone-import
   ```

3. Check container logs:
   ```bash
   docker logs -f pingone-import
   ```

## Troubleshooting

### Server Won't Start

1. Check logs:
   ```bash
   tail -f logs/server-background.log
   tail -f logs/server-error.log
   ```

2. Verify port availability:
   ```bash
   npm run check:port
   ```

3. Check environment variables:
   ```bash
   cat .env
   ```

### Authentication Issues

1. Verify PingOne credentials in `.env` file
2. Check token status:
   ```bash
   curl http://localhost:4000/api/health
   ```

### Performance Issues

1. Check system resources:
   ```bash
   npm run status:background
   ```

2. Monitor memory usage:
   ```bash
   curl http://localhost:4000/api/health | grep memory
   ```