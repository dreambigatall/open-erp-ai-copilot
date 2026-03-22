/**
 * Shell completion scripts for OpenDB.
 * Usage: opendb completion bash >> ~/.bashrc
 *        opendb completion zsh >> ~/.zshrc
 *        opendb completion fish >> ~/.config/fish/completions/opendb.fish
 */

export function bashCompletion(): string {
  return `_opendb_completions()
{
  local cur prev commands
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  commands="ask doctor init config completion help"

  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
    return 0
  fi

  case "\${prev}" in
    config)
      COMPREPLY=( $(compgen -W "init show get set" -- "\${cur}") )
      return 0
      ;;
    completion)
      COMPREPLY=( $(compgen -W "bash zsh fish" -- "\${cur}") )
      return 0
      ;;
  esac
}
complete -F _opendb_completions opendb
`
}

export function zshCompletion(): string {
  return `#compdef opendb

_opendb() {
  local -a commands
  commands=(
    'ask:Run a one-shot natural-language query'
    'doctor:Check DB connection and AI provider status'
    'init:Run interactive setup wizard'
    'config:Manage configuration'
    'completion:Generate shell completions'
    'help:Show help'
  )

  _arguments -C \\
    '1:command:->command' \\
    '*::arg:->args'

  case $state in
    command)
      _describe 'command' commands
      ;;
    args)
      case $words[1] in
        config)
          _describe 'config subcommand' \
            'init:Initialize .env from .env.example' \
            'show:Print current config' \
            'get:Read one config variable' \
            'set:Set a config variable'
          ;;
        completion)
          _values 'shell' bash zsh fish
          ;;
      esac
      ;;
  esac
}

_opendb "$@"
`
}

export function fishCompletion(): string {
  return `# Fish completions for opendb

complete -c opendb -f

# Commands
complete -c opendb -n '__fish_use_subcommand' -a ask -d 'Run a one-shot query'
complete -c opendb -n '__fish_use_subcommand' -a doctor -d 'Check DB connection'
complete -c opendb -n '__fish_use_subcommand' -a init -d 'Run setup wizard'
complete -c opendb -n '__fish_use_subcommand' -a config -d 'Manage configuration'
complete -c opendb -n '__fish_use_subcommand' -a completion -d 'Generate shell completions'
complete -c opendb -n '__fish_use_subcommand' -a help -d 'Show help'

# Config subcommands
complete -c opendb -n '__fish_seen_subcommand_from config' -a init -d 'Initialize .env'
complete -c opendb -n '__fish_seen_subcommand_from config' -a show -d 'Print config'
complete -c opendb -n '__fish_seen_subcommand_from config' -a get -d 'Read variable'
complete -c opendb -n '__fish_seen_subcommand_from config' -a set -d 'Set variable'

# Completion subcommands
complete -c opendb -n '__fish_seen_subcommand_from completion' -a bash
complete -c opendb -n '__fish_seen_subcommand_from completion' -a zsh
complete -c opendb -n '__fish_seen_subcommand_from completion' -a fish
`
}
