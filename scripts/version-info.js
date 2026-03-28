#!/usr/bin/env node

/**
 * version-info.js
 *
 * Display current version information and git status
 *
 * Usage: node scripts/version-info.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const versionFile = path.join(projectRoot, 'VERSION');
const packageJsonFile = path.join(projectRoot, 'package.json');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function getGitInfo() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: projectRoot,
      encoding: 'utf8',
    }).trim();

    const hash = execSync('git rev-parse --short HEAD', {
      cwd: projectRoot,
      encoding: 'utf8',
    }).trim();

    const tag = execSync('git describe --tags --exact-match 2>/dev/null || echo ""', {
      cwd: projectRoot,
      encoding: 'utf8',
      shell: true,
    }).trim();

    const dirty = execSync('git status --short', {
      cwd: projectRoot,
      encoding: 'utf8',
    }).trim();

    return {
      branch,
      hash,
      tag,
      isDirty: dirty.length > 0,
      status: dirty,
    };
  } catch (error) {
    return null;
  }
}

function main() {
  try {
    const version = readFile(versionFile).trim();
    const packageJson = JSON.parse(readFile(packageJsonFile));
    const git = getGitInfo();

    log('\n╔════════════════════════════════════════╗', 'cyan');
    log('║       WARGA DIGITAL - VERSION INFO     ║', 'cyan');
    log('╚════════════════════════════════════════╝\n', 'cyan');

    log('Project Information:', 'blue');
    log(`  Name:        ${packageJson.name}`, 'reset');
    log(`  Version:     ${version}`, 'green');
    log(`  Description: ${packageJson.description || 'N/A'}`, 'reset');
    log(`  Private:     ${packageJson.private ? 'Yes' : 'No'}`, 'reset');

    if (git) {
      log('\nGit Information:', 'blue');
      log(`  Branch:      ${git.branch}`, 'reset');
      log(`  Commit:      ${git.hash}`, 'reset');
      if (git.tag) {
        log(`  Tag:         ${git.tag}`, 'green');
      }
      log(`  Status:      ${git.isDirty ? 'Modified (dirty)' : 'Clean'}`, git.isDirty ? 'yellow' : 'green');

      if (git.isDirty && git.status) {
        log('\n  Modified files:', 'yellow');
        git.status.split('\n').forEach(line => {
          log(`    ${line}`, 'yellow');
        });
      }
    }

    log('\nDependencies:', 'blue');
    const deps = Object.keys(packageJson.dependencies || {});
    const devDeps = Object.keys(packageJson.devDependencies || {});
    log(`  Production:  ${deps.length} packages`, 'reset');
    log(`  Development: ${devDeps.length} packages`, 'reset');

    log('\nAvailable Scripts:', 'blue');
    const scripts = packageJson.scripts || {};
    Object.entries(scripts).forEach(([name, cmd]) => {
      if (name.startsWith('version:') || name === 'dev' || name === 'build' || name === 'lint') {
        log(`  npm run ${name}`, 'cyan');
      }
    });

    log('\n');
  } catch (error) {
    log(`\n❌ Error: ${error.message}\n`, 'yellow');
    process.exit(1);
  }
}

main();
