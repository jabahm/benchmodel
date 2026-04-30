#!/usr/bin/env node
/* eslint-disable */
'use strict';

const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

function parseArgs(argv) {
  const args = { port: undefined };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--port' || a === '-p') {
      args.port = argv[++i];
    } else if (a.startsWith('--port=')) {
      args.port = a.slice('--port='.length);
    } else if (a === '--help' || a === '-h') {
      args.help = true;
    } else if (a === '--version' || a === '-v') {
      args.version = true;
    }
  }
  return args;
}

function printHelp() {
  console.log(`benchmodel
Postman for open source LLMs.

Usage:
  benchmodel [options]

Options:
  -p, --port <number>   Port to listen on (default 3737, env BENCHMODEL_PORT)
  -h, --help            Show this help
  -v, --version         Show version
`);
}

const args = parseArgs(process.argv);

if (args.help) {
  printHelp();
  process.exit(0);
}

const pkg = require(path.join(__dirname, '..', 'package.json'));

if (args.version) {
  console.log(pkg.version);
  process.exit(0);
}

const port = Number(args.port || process.env.BENCHMODEL_PORT || 3737);
const dataDir = path.join(os.homedir(), '.benchmodel');
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'data.db');

process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.PORT = String(port);
process.env.HOSTNAME = process.env.HOSTNAME || '127.0.0.1';
process.env.BENCHMODEL_PORT = String(port);
if (!process.env.DATABASE_URL) process.env.DATABASE_URL = `file:${dbPath}`;

const standaloneServer = path.join(__dirname, '..', '.next', 'standalone', 'server.js');
if (!fs.existsSync(standaloneServer)) {
  console.error('benchmodel: build artifacts not found. Did you run "pnpm build"?');
  process.exit(1);
}

console.log('Benchmodel');
console.log(`  data:  ${dbPath}`);
console.log(`  url:   http://${process.env.HOSTNAME}:${port}`);
console.log('');

require(standaloneServer);
