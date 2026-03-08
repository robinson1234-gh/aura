import { spawn, type ChildProcess, type SpawnOptions } from 'child_process';

/**
 * Spawn a process safely on Windows, handling paths with spaces.
 *
 * On Windows with shell: true, Node concatenates args into a single
 * command string without quoting. This function wraps any argument
 * containing spaces in double-quotes so cmd.exe parses them correctly.
 */
export function spawnSafe(
  command: string,
  args: string[],
  options: SpawnOptions = {}
): ChildProcess {
  const isWindows = process.platform === 'win32';

  if (isWindows && options.shell) {
    const quotedArgs = args.map(arg =>
      arg.includes(' ') && !arg.startsWith('"') ? `"${arg}"` : arg
    );
    return spawn(command, quotedArgs, options);
  }

  return spawn(command, args, options);
}
