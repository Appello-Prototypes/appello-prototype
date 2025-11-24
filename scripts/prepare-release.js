#!/usr/bin/env node

/**
 * Prepare Release Script for Appello Lab
 * 
 * This script prepares a release by:
 * 1. Incrementing the version based on release type
 * 2. Creating a git commit with the version change
 * 3. Creating a git tag
 * 4. Providing instructions for deployment
 * 
 * Usage:
 *   node scripts/prepare-release.js patch   # Prepare patch release
 *   node scripts/prepare-release.js minor   # Prepare minor release
 *   node scripts/prepare-release.js major   # Prepare major release
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const versionScript = path.join(__dirname, 'version.js');

function runCommand(command, description) {
  try {
    console.log(`\n📋 ${description}...`);
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed`);
  } catch (error) {
    console.error(`❌ Error: ${description} failed`);
    console.error(error.message);
    process.exit(1);
  }
}

function getCurrentVersion() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  return packageJson.version;
}

function getGitStatus() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    return status.trim();
  } catch (error) {
    return '';
  }
}

function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    return 'unknown';
  }
}

// Main execution
const releaseType = process.argv[2];

if (!releaseType || !['major', 'minor', 'patch'].includes(releaseType)) {
  console.error(`
Usage: node scripts/prepare-release.js <release-type>

Release Types:
  patch   - Bug fixes and minor changes (1.1.0 → 1.1.1)
  minor   - New features, backward compatible (1.1.0 → 1.2.0)
  major   - Breaking changes (1.1.0 → 2.0.0)

Example:
  node scripts/prepare-release.js patch
  `);
  process.exit(1);
}

const currentBranch = getCurrentBranch();
const gitStatus = getGitStatus();

if (gitStatus) {
  console.warn('\n⚠️  Warning: You have uncommitted changes:');
  console.warn(gitStatus);
  console.warn('\nPlease commit or stash your changes before preparing a release.');
  process.exit(1);
}

if (currentBranch !== 'main' && currentBranch !== 'master') {
  console.warn(`\n⚠️  Warning: You are on branch '${currentBranch}', not 'main' or 'master'`);
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  readline.question('Continue anyway? (y/N): ', (answer) => {
    readline.close();
    if (answer.toLowerCase() !== 'y') {
      console.log('Release preparation cancelled.');
      process.exit(0);
    }
    proceedWithRelease();
  });
} else {
  proceedWithRelease();
}

function proceedWithRelease() {
  const oldVersion = getCurrentVersion();
  
  console.log(`\n🚀 Preparing ${releaseType} release...`);
  console.log(`Current version: ${oldVersion}`);
  
  // Increment version
  runCommand(`node ${versionScript} ${releaseType}`, `Incrementing ${releaseType} version`);
  
  const newVersion = getCurrentVersion();
  
  // Create git commit
  const commitMessage = `chore: bump version to ${newVersion}`;
  runCommand(`git add package.json`, 'Staging package.json');
  runCommand(`git commit -m "${commitMessage}"`, 'Creating version commit');
  
  // Create git tag
  const tagName = `v${newVersion}`;
  const tagMessage = `Release ${newVersion}`;
  runCommand(`git tag -a ${tagName} -m "${tagMessage}"`, `Creating git tag ${tagName}`);
  
  console.log(`\n✅ Release preparation complete!`);
  console.log(`\nVersion: ${oldVersion} → ${newVersion}`);
  console.log(`Tag: ${tagName}`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Review the changes: git log -1`);
  console.log(`   2. Push to GitHub: git push origin ${currentBranch}`);
  console.log(`   3. Push tags: git push origin ${tagName}`);
  console.log(`   4. Vercel will auto-deploy from GitHub`);
  console.log(`   5. Verify deployment: npm run test:e2e:production`);
}

