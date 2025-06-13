#!/bin/bash

echo "=== Terminal Formatting Test ==="
echo ""

# Test 1: Basic alignment
echo "1. Basic file listing alignment:"
ls -la | head -5

echo ""
echo "2. Unicode character support:"
echo "   ASCII: Hello World"
echo "   Chinese: 你好世界"
echo "   Japanese: こんにちは"
echo "   Emoji: 🚀 🎉 ✨ 🔥"
echo "   Symbols: ▶ ▷ ▸ ▹ ► ▻"

echo ""
echo "3. Box drawing characters:"
echo "┌─────────────────┐"
echo "│ Box Drawing Test│"
echo "├─────────────────┤"
echo "│ ▪ Item 1       │"
echo "│ ▪ Item 2       │"
echo "└─────────────────┘"

echo ""
echo "4. Color test:"
echo -e "\033[31mRed\033[0m \033[32mGreen\033[0m \033[33mYellow\033[0m \033[34mBlue\033[0m \033[35mMagenta\033[0m \033[36mCyan\033[0m"

echo ""
echo "5. Tab alignment:"
echo -e "Name\t\tSize\tType"
echo -e "file1.txt\t1024\ttext"
echo -e "script.sh\t2048\tscript"
echo -e "data.json\t4096\tdata"