const COMMANDS = [
  'compress', 'batch', 'report', 'stdin', 'repo', 'context',
  'watch', 'init', 'list-transforms', 'list-profiles',
  'list-tokenizers', 'list-modes', 'help', 'completions',
];

const FLAGS = [
  '--mode', '--profile', '--target-tokens', '--max-risk',
  '--tokenizer', '--enabled-transforms', '--out',
  '--report', '--dry-run', '--recursive', '--format', '--help',
];

const MODE_VALUES = ['light', 'normal', 'heavy', 'ultra', 'custom'];
const PROFILE_VALUES = ['general', 'agent-context', 'repo-context', 'logs', 'markdown-docs', 'chat-history'];
const RISK_VALUES = ['safe', 'low', 'medium', 'high'];
const TOKENIZER_VALUES = ['approx-generic', 'openai-cl100k', 'openai-o200k'];
const FORMAT_VALUES = ['json', 'text'];

function bashCompletion(): string {
  return `#!/bin/bash
# TokenTrim bash completion
# Source: eval "$(tokentrim completions bash)"

_tokentrim() {
  local cur prev opts
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"

  local commands="${COMMANDS.join(' ')}"
  local flags="${FLAGS.join(' ')}"

  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "\${commands}" -- \${cur}) )
    return 0
  fi

  case "\${prev}" in
    --mode)
      COMPREPLY=( $(compgen -W "${MODE_VALUES.join(' ')}" -- "\${cur}") )
      return 0
      ;;
    --profile)
      COMPREPLY=( $(compgen -W "${PROFILE_VALUES.join(' ')}" -- "\${cur}") )
      return 0
      ;;
    --max-risk)
      COMPREPLY=( $(compgen -W "${RISK_VALUES.join(' ')}" -- \${cur}) )
      return 0
      ;;
    --tokenizer)
      COMPREPLY=( $(compgen -W "${TOKENIZER_VALUES.join(' ')}" -- \${cur}) )
      return 0
      ;;
    --format)
      COMPREPLY=( $(compgen -W "${FORMAT_VALUES.join(' ')}" -- \${cur}) )
      return 0
      ;;
    completions)
      COMPREPLY=( $(compgen -W "bash zsh fish" -- \${cur}) )
      return 0
      ;;
  esac

  if [[ \${cur} == --* ]]; then
    COMPREPLY=( $(compgen -W "\${flags}" -- \${cur}) )
    return 0
  fi

  return 0
}

complete -F _tokentrim tokentrim
`;
}

function zshCompletion(): string {
  return `#!/bin/zsh
# TokenTrim zsh completion
# Source: eval "$(tokentrim completions zsh)"

_tokentrim() {
  local curcontext="$curcontext" state line
  typeset -A opt_args

  _arguments -C \\
    '1: :->command' \\
    '2: :->arg' \\
    '*:: :->args' \\
    '--mode[Compression mode]:mode:(${MODE_VALUES.join(' ')})' \\
    '--profile[Compression profile]:profile:(${PROFILE_VALUES.join(' ')})' \\
    '--target-tokens[Target token budget]:tokens:' \\
    '--max-risk[Max risk level]:risk:(${RISK_VALUES.join(' ')})' \\
    '--tokenizer[Tokenizer kind]:tokenizer:(${TOKENIZER_VALUES.join(' ')})' \\
    '--enabled-transforms[Comma-separated transform IDs]:transforms:' \\
    '--out[Output file path]:path:_files' \\
    '--report[Write report JSON]' \\
    '--dry-run[Simulate without writing]' \\
    '--recursive[Recurse into subdirectories]' \\
    '--format[Output format]:format:(${FORMAT_VALUES.join(' ')})' \\
    '--help[Show help]'

  case "$state" in
    command)
      _describe -t commands 'tokentrim command' \\
        ${COMMANDS.map(c => `(${c}) '${c} command'`).join(' \\\n        ')}
      ;;
    arg)
      case "$line[1]" in
        completions)
          _describe -t shells 'shell' '(bash:bash zsh:zsh fish:fish)'
          ;;
        compress|report)
          _files
          ;;
        batch|repo|context|watch)
          _path_files -/
          ;;
      esac
      ;;
  esac
}

compdef _tokentrim tokentrim
`;
}

function fishCompletion(): string {
  const flagCompletions = FLAGS.map((f) => {
    const desc = flagDescription(f);
    return `complete -c tokentrim -n '__fish_use_subcommand' -l ${f.slice(2)} -d '${desc}'`;
  }).join('\n');

  return `# TokenTrim fish completion
# Source: tokentrim completions fish | source

${COMMANDS.map((c) => `complete -c tokentrim -n '__fish_use_subcommand' -a '${c}' -d '${commandDescription(c)}'`).join('\n')}

${flagCompletions}

complete -c tokentrim -n '__fish_seen_subcommand_from completions' -a 'bash zsh fish'
complete -c tokentrim -n '__fish_seen_subcommand_from compress report' -a '(__fish_complete_path)'
complete -c tokentrim -n '__fish_seen_subcommand_from batch repo context watch' -a '(__fish_complete_directories)'
complete -c tokentrim -n '__fish_seen_subcommand_from compress batch report stdin repo context' -l mode -a 'light normal heavy ultra custom'
complete -c tokentrim -n '__fish_seen_subcommand_from compress batch report stdin repo context' -l profile -a 'general agent-context repo-context logs markdown-docs chat-history'
complete -c tokentrim -n '__fish_seen_subcommand_from compress batch report stdin repo context' -l max-risk -a 'safe low medium high'
complete -c tokentrim -n '__fish_seen_subcommand_from compress batch report stdin repo context' -l tokenizer -a 'approx-generic openai-cl100k openai-o200k'
complete -c tokentrim -n '__fish_seen_subcommand_from report list-transforms list-profiles list-tokenizers list-modes' -l format -a 'json text'
`;
}

function commandDescription(cmd: string): string {
  const map: Record<string, string> = {
    compress: 'Compress a single file',
    batch: 'Batch compress a directory',
    report: 'Generate compression report',
    stdin: 'Compress stdin',
    repo: 'Generate local context pack',
    context: 'Alias for repo',
    watch: 'Watch file or directory',
    init: 'Create starter config',
    'list-transforms': 'List available transforms',
    'list-profiles': 'List available profiles',
    'list-tokenizers': 'List tokenizer kinds',
    'list-modes': 'List compression modes',
    help: 'Show help',
    completions: 'Generate shell completions',
  };
  return map[cmd] ?? '';
}

function flagDescription(flag: string): string {
  const map: Record<string, string> = {
    '--mode': 'Compression mode',
    '--profile': 'Compression profile',
    '--target-tokens': 'Target token budget',
    '--max-risk': 'Max risk level',
    '--tokenizer': 'Tokenizer kind',
    '--enabled-transforms': 'Comma-separated transform IDs',
    '--out': 'Output file path',
    '--report': 'Write report JSON',
    '--dry-run': 'Simulate without writing',
    '--recursive': 'Recurse into subdirectories',
    '--format': 'Output format',
    '--help': 'Show help',
  };
  return map[flag] ?? '';
}

export function generateCompletionScript(shell: 'bash' | 'zsh' | 'fish'): string {
  switch (shell) {
    case 'bash': return bashCompletion();
    case 'zsh': return zshCompletion();
    case 'fish': return fishCompletion();
  }
}
