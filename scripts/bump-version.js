#!/usr/bin/env node

/**
 * bump-version.js
 *
 * Utility script to bump semantic versions and update changelog
 *
 * Usage:
 *   node scripts/bump-version.js major
 *   node scripts/bump-version.js minor
 *   node scripts/bump-version.js patch
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const bumpType = args[0];

if (!bumpType || !['major', 'minor', 'patch'].includes(bumpType)) {
  console.error('Usage: node scripts/bump-version.js [major|minor|patch]');
  process.exit(1);
}

// Helper functions
function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf-8');
}

function getCurrentVersion(filePath) {
  const content = readFile(filePath).trim();
  return content.split('\n')[0];
}

function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`Invalid version format: ${version}`);
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

function formatVersion(parsed) {
  return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
}

function bumpVersion(currentVersion, type) {
  const parsed = parseVersion(currentVersion);

  switch (type) {
    case 'major':
      parsed.major += 1;
      parsed.minor = 0;
      parsed.patch = 0;
      break;
    case 'minor':
      parsed.minor += 1;
      parsed.patch = 0;
      break;
    case 'patch':
      parsed.patch += 1;
      break;
    default:
      throw new Error(`Unknown bump type: ${type}`);
  }

  return formatVersion(parsed);
}

function formatDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function updateChangelog(filePath, newVersion) {
  let content = readFile(filePath);
  const releaseDate = formatDate();

  // Replace [Unreleased] section with new version
  const versionHeader = `## [${newVersion}] - ${releaseDate}`;

  // Find the Unreleased section and extract its content
  const unreleasedPattern = /## \[Unreleased\]([\s\S]*?)(?=## \[[\d.]+\]|-{3,}|$)/;
  const match = content.match(unreleasedPattern);

  if (!match) {
    console.warn('Warning: Could not find [Unreleased] section in CHANGELOG.md');
    return content;
  }

  const unreleasedContent = match[1];

  // Create new changelog with bumped version
  const newChangelog = content.replace(
    /## \[Unreleased\]([\s\S]*?)(?=## \[[\d.]+\]|-{3,})/,
    `## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

---

${versionHeader}${unreleasedContent}`
  );

  return newChangelog;
}

try {
  const versionFile = path.join(__dirname, '../VERSION');
  const packageJsonFile = path.join(__dirname, '../package.json');
  const changelogFile = path.join(__dirname, '../CHANGELOG.md');

  // Get current version
  const currentVersion = getCurrentVersion(versionFile);
  console.log(`Current version: ${currentVersion}`);

  // Calculate new version
  const newVersion = bumpVersion(currentVersion, bumpType);
  console.log(`New version: ${newVersion}`);

  // Update VERSION file
  writeFile(versionFile, `${newVersion}\n`);
  console.log('✓ Updated VERSION file');

  // Update package.json
  const packageJson = JSON.parse(readFile(packageJsonFile));
  packageJson.version = newVersion;
  writeFile(packageJsonFile, JSON.stringify(packageJson, null, 2) + '\n');
  console.log('✓ Updated package.json');

  // Update CHANGELOG.md
  const newChangelog = updateChangelog(changelogFile, newVersion);
  writeFile(changelogFile, newChangelog);
  console.log('✓ Updated CHANGELOG.md');

  console.log(`\n✅ Version bumped from ${currentVersion} to ${newVersion}`);
  console.log('\nNext steps:');
  console.log(`1. Review the changes in CHANGELOG.md`);
  console.log(`2. Commit: git add -A && git commit -m "chore: release v${newVersion}"`);
  console.log(`3. Tag: git tag v${newVersion}`);
  console.log(`4. Push: git push && git push --tags`);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
