# AI Assistant CLIs in Shelltender

The following AI coding assistants are pre-installed in the Docker container:

## Claude Code
- **Package**: `@anthropic-ai/claude-code`
- **Command**: `claude`
- **Authentication**:
  - **Option 1**: Max Plan Auth (Recommended) - Uses your Claude account login
  - **Option 2**: API Key - Set `ANTHROPIC_API_KEY` environment variable
- **Notes**: 
  - Max plan includes 5x-20x usage compared to API keys
  - Shares usage limits with Claude web/desktop/mobile apps
  - Config stored in `~/.claude/`

## OpenAI CLI
- **Package**: `openai-cli`
- **Command**: `ai`
- **Authentication**:
  - Set API key using `ai set-key` command
  - Or use `OPENAI_API_KEY` environment variable
  - Format: `sk-` followed by alphanumeric string
- **Available commands**:
  - `ai` - Help
  - `ai ask` - Ask questions
  - `ai set-key` - Change API key
  - `ai config` - Change configuration

## Google Gemini CLI
- **Package**: `@google/gemini-cli`
- **Command**: `gemini`
- **Authentication**:
  - **Option 1**: OAuth with Google account (60 req/min, 1000 req/day)
  - **Option 2**: API Key - Set `GEMINI_API_KEY` environment variable
  - **Option 3**: Google Cloud ADC - For service accounts
- **Notes**:
  - OAuth may have issues in Docker (requires browser)
  - API key authentication recommended for containers
  - Supports `.env` files for configuration

## Docker Setup

### Environment Variables
Add to your `.env.development` file:
```env
# Claude Code
ANTHROPIC_API_KEY=sk-ant-your-key-here

# OpenAI
OPENAI_API_KEY=sk-your-openai-key-here

# Google Gemini
GEMINI_API_KEY=your-gemini-api-key-here

# Optional: Google Cloud configuration
GOOGLE_CLOUD_PROJECT=your-project
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_GENAI_USE_VERTEXAI=true
```

### Volume Mounts (for persistent auth)
For Claude Code authentication persistence:
```yaml
volumes:
  - ~/.claude:/home/nodejs/.claude
```

## Security Best Practices
1. Never commit API keys to source control
2. Use `.env` files and add them to `.gitignore`
3. In production, use secure key management services
4. Rotate API keys regularly
5. Monitor usage to detect unauthorized access

## Troubleshooting

### Claude Code
- If login fails, try `claude /login` command
- For non-interactive mode issues, use API key instead of OAuth

### OpenAI CLI
- Run `ai set-key` to configure API key interactively
- Check key format starts with `sk-`

### Gemini CLI
- For Docker OAuth issues, use API key authentication
- If `GEMINI_API_KEY` not detected, check `.env` file location
- For rate limit increases, upgrade to paid tier