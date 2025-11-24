#!/usr/bin/env node

/**
 * Version Management Script for Appello Lab
 * 
 * Manages semantic versioning (major.minor.patch) and updates package.json
 * 
 * Usage:
 *   node scripts/version.js patch   # Increment patch version (1.1.0 -> 1.1.1)
 *   node scripts/version.js minor   # Increment minor version (1.1.0 -> 1.2.0)
 *   node scripts/version.js major    # Increment major version (1.1.0 -> 2.0.0)
 *   node scripts/version.js get      # Get current version
 *   node scripts/version.js set 1.2.3 # Set specific version
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');

function getCurrentVersion() {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    console.error('Error reading package.json:', error.message);
    process.exit(1);
  }
}

function setVersion(newVersion) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const oldVersion = packageJson.version;
    packageJson.version = newVersion;
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    
    console.log(`✅ Version updated: ${oldVersion} → ${newVersion}`);
    return newVersion;
  } catch (error) {
    console.error('Error updating package.json:', error.message);
    process.exit(1);
  }
}

function incrementVersion(type) {
  const currentVersion = getCurrentVersion();
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  let newVersion;
  switch (type) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
    default:
      console.error(`Invalid version type: ${type}. Use 'major', 'minor', or 'patch'`);
      process.exit(1);
  }
  
  return setVersion(newVersion);
}

function validateVersion(version) {
  const versionRegex = /^\d+\.\d+\.\d+$/;
  if (!versionRegex.test(version)) {
    console.error(`Invalid version format: ${version}. Use major.minor.patch (e.g., 1.2.3)`);
    process.exit(1);
  }
  return version;
}

// Main execution
const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case 'get':
    console.log(getCurrentVersion());
    break;
    
  case 'set':
    if (!arg) {
      console.error('Usage: node scripts/version.js set <version>');
      process.exit(1);
    }
    setVersion(validateVersion(arg));
    break;
    
  case 'major':
  case 'minor':
  case 'patch':
    incrementVersion(command);
    break;
    
  default:
    console.log(`
Version Management Script for Appello Lab

Usage:
  node scripts/version.js <command> [args]

Commands:
  get                    Get current version
  set <version>          Set specific version (e.g., 1.2.3)
  major                  Increment major version (1.1.0 → 2.0.0)
  minor                  Increment minor version (1.1.0 → 1.2.0)
  patch                  Increment patch version (1.1.0 → 1.1.1)

Current version: ${getCurrentVersion()}
    `);
    break;
}

