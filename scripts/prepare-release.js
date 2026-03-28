#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * prepare-release.js
 *
 * Script to prepare a new release by:
 * 1. Validating the current state
 * 2. Prompting for version number
 * 3. Updating VERSION, package.json, and CHANGELOG.md
 * 4. Creating a release commit and tag
 *
 * Usage: node scripts/prepare-release.js [major|minor|patch]
 */

const projectRoot = path.resolve(__dirname, '..');
const versionFile = path.join(projectRoot, 'VERSION');
const packageJsonFile = path.join(projectRoot, 'package.json');
const changelogFile = path.join(projectRoot, 'CHANGELOG.md');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function parseVersion(versionString) {
  const match = versionString.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid version format: ${versionString}. Expected: X.Y.Z`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

function bumpVersion(version, type) {
  const { major, minor, patch } = version;

  switch (type.toLowerCase()) {
    case 'major':
      return { major: major + 1, minor: 0, patch: 0 };
    case 'minor':
      return { major, minor: minor + 1, patch: 0 };
    case 'patch':
      return { major, minor, patch: patch + 1 };
    default:
      throw new Error(`Invalid bump type: ${type}. Expected: major, minor, or patch`);
  }
}

function versionToString(version) {
  return `${version.major}.${version.minor}.${version.patch}`;
}

function getCurrentDate() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

function updateVersionFile(newVersion) {
  const versionString = versionToString(newVersion);
  writeFile(versionFile, `${versionString}\n`);
  log(`✓ Updated VERSION to ${versionString}`, 'green');
}

function updatePackageJson(newVersion) {
  const versionString = versionToString(newVersion);
  const packageJson = JSON.parse(readFile(packageJsonFile));
  packageJson.version = versionString;
  writeFile(packageJsonFile, JSON.stringify(packageJson, null, 2) + '\n');
  log(`✓ Updated package.json to version ${versionString}`, 'green');
}

function updateChangelog(oldVersion, newVersion) {
  const versionString = versionToString(newVersion);
  const date = getCurrentDate();
  let changelog = readFile(changelogFile);

  // Find the [Unreleased] section
  const unreleasedPattern = /## \[Unreleased\]([\s\S]*?)(?=\n## \[|$)/;
  const match = changelog.match(unreleasedPattern);

  if (!match) {
    throw new Error('Could not find [Unreleased] section in CHANGELOG.md');
  }

  const unreleasedContent = match[1];

  // Create new version section
  const newVersionSection = `## [${versionString}] - ${date}${unreleasedContent}`;

  // Create new unreleased section
  const newUnreleasedSection = `## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

---

`;

  // Replace in changelog
  changelog = changelog.replace(
    /## \[Unreleased\][\s\S]*?(?=\n## \[)/,
    newUnreleasedSection + newVersionSection + '\n'
  );

  writeFile(changelogFile, changelog);
  log(`✓ Updated CHANGELOG.md with version ${versionString}`, 'green');
}

function createGitCommit(version) {
  const versionString = versionToString(version);
  try {
    execSync('git add VERSION package.json CHANGELOG.md', { cwd: projectRoot });
    execSync(`git commit -m "chore: release v${versionString}"`, { cwd: projectRoot });
    log(`✓ Created git commit for v${versionString}`, 'green');
  } catch (error) {
    log(`⚠ Git commit failed: ${error.message}`, 'yellow');
  }
}

function createGitTag(version) {
  const versionString = versionToString(version);
  try {
    execSync(`git tag v${versionString}`, { cwd: projectRoot });
    log(`✓ Created git tag v${versionString}`, 'green');
  } catch (error) {
    log(`⚠ Git tag creation failed: ${error.message}`, 'yellow');
  }
}

function main() {
  try {
    log('\n🚀 Warga Digital Release Preparation\n', 'blue');

    // Get current version
    const currentVersionString = readFile(versionFile).trim();
    const currentVersion = parseVersion(currentVersionString);
    log(`Current version: ${currentVersionString}`, 'blue');

    // Get bump type from CLI argument or prompt
    let bumpType = process.argv[2];

    if (!bumpType) {
      log('\nSpecify bump type as argument:', 'yellow');
      log('  node scripts/prepare-release.js [major|minor|patch]', 'yellow');
      log('\nExamples:', 'yellow');
      log('  node scripts/prepare-release.js major  # 0.1.0 → 1.0.0', 'yellow');
      log('  node scripts/prepare-release.js minor  # 0.1.0 → 0.2.0', 'yellow');
      log('  node scripts/prepare-release.js patch  # 0.1.0 → 0.1.1', 'yellow');
      process.exit(1);
    }

    // Bump version
    const newVersion = bumpVersion(currentVersion, bumpType);
    const newVersionString = versionToString(newVersion);

    log(`\nPreparing release: ${currentVersionString} → ${newVersionString}`, 'blue');
    log(`Bump type: ${bumpType.toUpperCase()}`, 'blue');

    // Update files
    updateVersionFile(newVersion);
    updatePackageJson(newVersion);
    updateChangelog(currentVersion, newVersion);

    // Create git commit and tag
    log('\nCreating git commit and tag...', 'blue');
    createGitCommit(newVersion);
    createGitTag(newVersion);

    log(`\n✅ Release preparation complete!`, 'green');
    log(`\nNext steps:`, 'blue');
    log(`  1. Review the changes: git show HEAD`, 'blue');
    log(`  2. Push to remote: git push origin main --tags`, 'blue');
    log(`  3. Create a GitHub Release from the tag: https://github.com/your-org/warga-digital/releases/new?tag=v${newVersionString}`, 'blue');
    log('', 'reset');

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
