# ✨ `cmdly`

A drop-in replacement for the recently deprecated [`gh-copilot`](https://github.com/github/gh-copilot) with multi-provider support. Generate shell commands with natural language and get detailed explanation.

https://github.com/user-attachments/assets/d3dda9c8-e202-4d7a-bbc8-bac9b32f7ac7

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
  - [suggest](#suggest)
  - [explain](#explain)
  - [configure](#configure)
- [Configuration](#configuration)

## Installation

Download prebuilt binary from GitHub Releases.

### Linux x64

```bash
curl -fsSL -o /tmp/cmdly-linux-x64.tar.gz https://github.com/Armadillidiid/cmdly/releases/latest/download/cmdly-linux-x64.tar.gz
tar -xzf /tmp/cmdly-linux-x64.tar.gz -C /tmp
install -m 755 /tmp/cmdly-linux-x64 ~/.local/bin/cmdly
```

### macOS arm64

```bash
curl -fsSL -o /tmp/cmdly-darwin-arm64.tar.gz https://github.com/Armadillidiid/cmdly/releases/latest/download/cmdly-darwin-arm64.tar.gz
tar -xzf /tmp/cmdly-darwin-arm64.tar.gz -C /tmp
install -m 755 /tmp/cmdly-darwin-arm64 ~/.local/bin/cmdly
```

Ensure `~/.local/bin` is on `PATH`.

### Verify checksum (optional)

```bash
curl -fsSL -O https://github.com/Armadillidiid/cmdly/releases/latest/download/cmdly-linux-x64.tar.gz
curl -fsSL -O https://github.com/Armadillidiid/cmdly/releases/latest/download/cmdly-linux-x64.tar.gz.sha256
sha256sum -c cmdly-linux-x64.tar.gz.sha256
```

### Supported targets

- `linux-x64`
- `linux-arm64`
- `darwin-arm64`

### Not supported in v1

- Windows
- Intel macOS (`darwin-x64`)

### SEA build notes (dev)

- Configured targets: `darwin-arm64`, `darwin-x64`, `linux-x64`, `linux-arm64`
- Runtime excludes `darwin-x64` and prints warning with reason
- SEA entry is CommonJS (`format: "cjs"`, `mainFormat: "commonjs"`) because ESM bundle hit dynamic `require("node:assert")` path at runtime

## Quick Start

1. **Configure your AI provider:**

```bash
cmdly configure
```

2. **Get command suggestions:**

```bash
cmdly suggest "find all typescript files modified in the last week"
```

3. **Explain complex commands:**

```bash
cmdly explain "find . -name '*.ts' -type f -mtime -7"
```

> **💡 Pro Tip:** Create shell alias for easier access:
>
> ```bash
> alias cm='cmdly' # or cly
> ```

## Commands

### suggest

Generate command suggestions from natural language descriptions.

**Usage:**

```bash
cmdly suggest [prompt] [options]
```

**Arguments:**

- `prompt` (optional) - Natural language description of what you want to do. If omitted, you'll be prompted interactively.

**Options:**

- `-t, --target <type>` - Target command type: `shell` (default) or `git`

**Examples:**

```bash
# Interactive mode
cmdly suggest

# Direct prompt
cmdly suggest "list all processes using port 3000"

# Direct prompt with target
cmdly suggest "show diff for the last merge commit" --target git
```

**Interactive Actions:**

After receiving a suggestion, you can:

- **Run** - Execute the command immediately
- **Revise** - Refine the suggestion with additional context
- **Explain** - Get a detailed breakdown of how the command works
- **Copy** - Copy the command to your clipboard
- **Cancel** - Exit without taking action

**Example Session:**

```bash
$ cmdly suggest "find large files over 100MB"

find . -type f -size +100M

? What would you like to do? (Use arrow keys)
❯ Run
  Revise
  Explain
  Copy
  Cancel
```

### explain

Get detailed explanations of shell commands with component breakdowns.

**Usage:**

```bash
cmdly explain [command]
```

**Arguments:**

- `command` (optional) - The command to explain. If omitted, you'll be prompted to enter one.

**Examples:**

```bash
# Interactive mode
cmdly explain

# Direct command
cmdly explain "tar -xzf archive.tar.gz -C /destination"
```

**Example Output:**

```bash
$ cmdly explain "rm -rf /tmp/cache"

## Summary

Recursively deletes the /tmp/cache directory and all its contents without
prompting for confirmation.

## Breakdown

• `rm`: The remove command, used to delete files and directories
  • `-r` (recursive): Deletes directories and all their contents
  • `-f` (force): Skips confirmation prompts
    • `/tmp/cache`: The target directory path to be deleted
```

### configure

Set up or update your preferences and authentication.

**Usage:**

```bash
cmdly configure
```

**What you'll configure:**

1. **AI Provider** - Choose from OpenAI, Anthropic, Google, GitHub Models, or GitHub Copilot
2. **Authentication** - API key or OAuth (GitHub Copilot)
3. **Default Model** - Select from available models for your provider
4. **Syntax Theme** - Choose your preferred highlighting theme
5. **Default Action** - Set a default action to auto run after suggestions

## Configuration

**Default config (`~/.config/cmdly/cmdly.json`):**

```json
{
  "provider": "github-copilot",
  "model": "gpt-5-mini",
  "theme": "github-dark-default",
  "default_suggest_action": "copy"
}
```

**Fields:**

- `provider` (string, required) - AI provider identifier
- `model` (string, required) - Model identifier for the provider from [models.dev](https://models.dev/)
- `theme` (string, optional) - Syntax highlighting theme from [Shiki themes](https://shiki.style/themes)
- `default_suggest_action` (string, optional) - `run`, `revise`, `explain`, `copy`, or `cancel`. Leave unset to always ask.
