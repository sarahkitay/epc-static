#!/bin/bash
# Simple local development server for EPC Client Management System

echo "🚀 Starting EPC Client Management System..."
echo ""
echo "Access the system at: http://localhost:3000/clients/"
echo "Password: 15225"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Try npx serve first (if available)
if command -v npx &> /dev/null; then
    npx serve . -l 3000
# Fallback to Python if npx not available
elif command -v python3 &> /dev/null; then
    echo "Using Python HTTP server..."
    cd "$(dirname "$0")"
    python3 -m http.server 3000
else
    echo "❌ Error: Neither npx nor python3 found. Please install Node.js or Python."
    exit 1
fi
