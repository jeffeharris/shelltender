#!/bin/bash
# Docker development helper script

case "$1" in
  start)
    echo "Starting Shelltender development environment..."
    docker compose up -d
    echo ""
    echo "✅ Shelltender is running!"
    echo ""
    echo "🌐 Web Interface: http://localhost:5173"
    echo "🔌 API Server: http://localhost:3001"
    echo "📡 WebSocket: ws://localhost:8081"
    echo ""
    echo "To view logs: docker compose logs -f"
    ;;
  
  stop)
    echo "Stopping Shelltender..."
    docker compose down
    ;;
  
  restart)
    echo "Restarting Shelltender..."
    docker compose restart
    ;;
  
  logs)
    docker compose logs -f shelltender
    ;;
  
  shell)
    echo "Opening shell in container..."
    docker compose exec shelltender /bin/bash
    ;;
  
  rebuild)
    echo "Rebuilding container..."
    docker compose down
    docker compose build --no-cache
    docker compose up -d
    ;;
  
  status)
    docker compose ps
    ;;
  
  *)
    echo "Usage: $0 {start|stop|restart|logs|shell|rebuild|status}"
    echo ""
    echo "Commands:"
    echo "  start    - Start the development environment"
    echo "  stop     - Stop all containers"
    echo "  restart  - Restart containers"
    echo "  logs     - Follow container logs"
    echo "  shell    - Open bash shell in container"
    echo "  rebuild  - Rebuild and restart containers"
    echo "  status   - Show container status"
    exit 1
    ;;
esac