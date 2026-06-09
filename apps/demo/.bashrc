# Shelltender Demo - Bash Profile
# A nice terminal experience for the demo container

# Colors
export TERM=xterm-256color

# Color definitions
RED='\[\e[0;31m\]'
GREEN='\[\e[0;32m\]'
YELLOW='\[\e[0;33m\]'
BLUE='\[\e[0;34m\]'
MAGENTA='\[\e[0;35m\]'
CYAN='\[\e[0;36m\]'
WHITE='\[\e[0;37m\]'
BOLD='\[\e[1m\]'
RESET='\[\e[0m\]'

# Git branch in prompt
parse_git_branch() {
    git branch 2>/dev/null | sed -e '/^[^*]/d' -e 's/* \(.*\)/ (\1)/'
}

# Custom prompt: user@host:dir (git-branch)$
PS1="${BOLD}${GREEN}\u${RESET}${WHITE}@${CYAN}shelltender${RESET}:${BOLD}${BLUE}\w${YELLOW}\$(parse_git_branch)${RESET}\n${MAGENTA}\$${RESET} "

# History settings
HISTSIZE=5000
HISTFILESIZE=10000
HISTCONTROL=ignoreboth:erasedups
shopt -s histappend

# Better shell options
shopt -s checkwinsize
shopt -s cdspell
shopt -s dirspell 2>/dev/null

# Useful aliases
alias ll='ls -alF --color=auto'
alias la='ls -A --color=auto'
alias l='ls -CF --color=auto'
alias ls='ls --color=auto'
alias grep='grep --color=auto'
alias ..='cd ..'
alias ...='cd ../..'
alias cls='clear'
alias h='history'
alias tree='find . -print | sed -e "s;[^/]*/;|____;g;s;____|;  |;g"'

# Directory colors
export LS_COLORS='di=1;34:ln=1;36:so=1;35:pi=33:ex=1;32:bd=1;33:cd=1;33:su=1;31:sg=1;31:tw=1;34:ow=1;34'

# Welcome message
echo ""
echo -e "\e[1;36m  _____ _          _ _ _                 _           \e[0m"
echo -e "\e[1;36m / ____| |        | | | |               | |          \e[0m"
echo -e "\e[1;36m| (___ | |__   ___| | | |_ ___ _ __   __| | ___ _ __ \e[0m"
echo -e "\e[1;36m \___ \| '_ \ / _ \ | | __/ _ \ '_ \ / _\` |/ _ \ '__|\e[0m"
echo -e "\e[1;36m ____) | | | |  __/ | | ||  __/ | | | (_| |  __/ |   \e[0m"
echo -e "\e[1;36m|_____/|_| |_|\___|_|_|\__\___|_| |_|\__,_|\___|_|   \e[0m"
echo ""
echo -e "\e[0;33mPersistent Terminal Sessions Demo\e[0m"
echo -e "\e[0;37m─────────────────────────────────────────────────────\e[0m"
echo -e "\e[0;32mType 'help' for available commands\e[0m"
echo ""

# Help function
help() {
    echo ""
    echo -e "\e[1;36mShelltender Demo Commands:\e[0m"
    echo -e "\e[0;37m─────────────────────────────────────────────────────\e[0m"
    echo -e "  \e[1;32mll\e[0m        - List files (detailed)"
    echo -e "  \e[1;32mla\e[0m        - List all files"
    echo -e "  \e[1;32mtree\e[0m      - Show directory tree"
    echo -e "  \e[1;32m..\e[0m        - Go up one directory"
    echo -e "  \e[1;32m...\e[0m       - Go up two directories"
    echo -e "  \e[1;32mcls\e[0m       - Clear screen"
    echo -e "  \e[1;32mh\e[0m         - Show command history"
    echo ""
    echo -e "\e[1;33mTry these demos:\e[0m"
    echo -e "  \e[0;37m• Open multiple browser tabs - sessions sync!\e[0m"
    echo -e "  \e[0;37m• Close a tab and reopen - session persists!\e[0m"
    echo -e "  \e[0;37m• Run 'top' or 'htop' for interactive apps\e[0m"
    echo ""
}

# Make help available as a command
export -f help
