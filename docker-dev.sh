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
    echo "🤖 AI Monitor: http://localhost:3002"
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
    if [ "$2" = "ai" ]; then
      docker compose logs -f ai-monitor
    else
      docker compose logs -f shelltender
    fi
    ;;
  
  shell)
    if [ "$2" = "ai" ]; then
      echo "Opening shell in AI Monitor container..."
      docker compose exec ai-monitor /bin/sh
    else
      echo "Opening shell in Shelltender container..."
      docker compose exec shelltender /bin/bash
    fi
    ;;
  
  ai-status)
    echo "🤖 AI Monitor Status:"
    echo ""
    curl -s http://localhost:3002/api/stats | jq . || echo "AI Monitor not responding"
    echo ""
    echo "Sessions needing attention:"
    curl -s http://localhost:3002/api/attention | jq . || echo "Could not fetch"
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
    echo "Usage: $0 {start|stop|restart|logs|shell|rebuild|status|ai-status}"
    echo ""
    echo "Commands:"
    echo "  start      - Start the development environment"
    echo "  stop       - Stop all containers"
    echo "  restart    - Restart containers"
    echo "  logs [ai]  - Follow container logs (add 'ai' for AI Monitor logs)"
    echo "  shell [ai] - Open shell in container (add 'ai' for AI Monitor)"
    echo "  rebuild    - Rebuild and restart containers"
    echo "  status     - Show container status"
    echo "  ai-status  - Show AI Monitor statistics"
    echo ""
    echo "Examples:"
    echo "  $0 logs ai     # View AI Monitor logs"
    echo "  $0 shell ai    # Shell into AI Monitor container"
    echo "  $0 ai-status   # Check AI Monitor stats"
    exit 1
    ;;
esac