# Shelltender Admin Access

The admin interface provides monitoring and troubleshooting capabilities for Shelltender terminal sessions.

## Features

- **Session Management**: View all active terminal sessions with real-time updates
- **Session Monitoring**: Attach to any session in read-only or interactive mode
- **Visual Mode Indicators**: Clear distinction between read-only (green) and interactive (orange) modes
- **Session Creation**: Create new terminal sessions directly from the admin panel
- **Bulk Operations**: Kill individual sessions or multiple sessions at once
- **System Monitoring**: Track memory usage, platform info, and uptime

## Accessing the Admin Panel

The admin panel is available at: `http://localhost:3000/admin`

## Usage

### Monitoring Sessions

1. Click the **Monitor** button next to any session
2. A modal will open showing the terminal in read-only mode (green border)
3. Use the **Toggle Mode** button to switch to interactive mode (orange border)
4. In interactive mode, you can type commands and interact with the session
5. Close the modal to detach from the session

### Mode Indicators

- **Read-only Mode** (Default):
  - Green border with soft glow effect
  - No cursor visible
  - Text selection enabled
  - Cannot input commands

- **Interactive Mode**:
  - Orange border with soft glow effect
  - Blinking cursor visible
  - Full input capability
  - Use with caution - you're controlling a live session

### Creating Sessions

Click the **New Session** button to create a new bash terminal session.

### Managing Sessions

- **Kill**: Terminate an individual session
- **Kill Selected**: Select multiple sessions using checkboxes and terminate them together
- **Kill All**: Terminate all active sessions (use with caution)

## Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose -f docker-compose.admin.yml up -d

# View logs
docker-compose -f docker-compose.admin.yml logs

# Stop the container
docker-compose -f docker-compose.admin.yml down
```

## Security Notes

This MVP implementation is designed for single-developer use and does not include authentication. Do not expose the admin interface to public networks without implementing proper security measures.

## Technical Implementation

The admin feature uses:
- `AdminSessionProxy` for clean separation of admin access from regular sessions
- WebSocket messages prefixed with `admin-` for admin operations
- REST API endpoints under `/api/admin/` for session information
- Real-time updates via WebSocket for live terminal output