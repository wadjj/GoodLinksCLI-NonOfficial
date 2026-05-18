#!/usr/bin/env node

const helpText = `GoodLinks CLI

Usage:
  goodlinks --help
`;

export function main(argv = process.argv.slice(2)): number {
  if (argv.includes("--help") || argv.includes("-h") || argv.length === 0) {
    process.stdout.write(helpText);
    return 0;
  }

  process.stderr.write(`Unknown command: ${argv.join(" ")}\n`);
  return 2;
}

process.exitCode = main();
