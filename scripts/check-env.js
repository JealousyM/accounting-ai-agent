#!/usr/bin/env node

/**
 * Environment check script
 * Validates that all required environment variables and services are available
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkNodeVersion() {
  log('📦 Checking Node.js version...', colors.cyan);
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);
  
  if (major < 18) {
    log('❌ Node.js 18 or higher is required', colors.red);
    log(`   Current version: ${version}`, colors.yellow);
    return false;
  }
  
  log(`✓ Node.js version OK (${version})`, colors.green);
  return true;
}

function checkEnvFile(filePath, name) {
  if (!fs.existsSync(filePath)) {
    log(`⚠️  ${name} .env not found`, colors.yellow);
    
    const examplePath = `${filePath}.example`;
    if (fs.existsSync(examplePath)) {
      log(`   Copying from ${name} .env.example...`, colors.yellow);
      fs.copyFileSync(examplePath, filePath);
      log(`✓ Created ${name} .env`, colors.green);
    } else {
      log(`❌ ${name} .env.example not found`, colors.red);
      return false;
    }
  } else {
    log(`✓ ${name} .env exists`, colors.green);
  }
  return true;
}

function checkEnvFiles() {
  log('\n🔍 Checking environment files...', colors.cyan);
  
  const apiEnv = path.join(__dirname, '../packages/api/.env');
  const webEnv = path.join(__dirname, '../packages/web/.env');
  
  const apiOk = checkEnvFile(apiEnv, 'API');
  const webOk = checkEnvFile(webEnv, 'Web');
  
  return apiOk && webOk;
}

function checkDocker() {
  log('\n🐳 Checking Docker...', colors.cyan);
  
  try {
    execSync('docker info', { stdio: 'ignore' });
    log('✓ Docker is running', colors.green);
    return true;
  } catch (error) {
    log('❌ Docker is not running', colors.red);
    log('   Please start Docker and try again', colors.yellow);
    return false;
  }
}

function checkService(serviceName) {
  try {
    const output = execSync('docker ps --format "{{.Names}}"', { encoding: 'utf-8' });
    return output.includes(serviceName);
  } catch (error) {
    return false;
  }
}

function checkServices() {
  log('\n🔍 Checking services...', colors.cyan);
  
  const postgres = checkService('postgres');
  const redis = checkService('redis');
  
  if (!postgres) {
    log('⚠️  PostgreSQL not running', colors.yellow);
    log('   Run: docker-compose up -d postgres', colors.yellow);
  } else {
    log('✓ PostgreSQL is running', colors.green);
  }
  
  if (!redis) {
    log('⚠️  Redis not running', colors.yellow);
    log('   Run: docker-compose up -d redis', colors.yellow);
  } else {
    log('✓ Redis is running', colors.green);
  }
  
  return postgres && redis;
}

function checkDependencies() {
  log('\n📦 Checking dependencies...', colors.cyan);
  
  const nodeModules = path.join(__dirname, '../node_modules');
  
  if (!fs.existsSync(nodeModules)) {
    log('⚠️  Dependencies not installed', colors.yellow);
    log('   Run: npm install', colors.yellow);
    return false;
  }
  
  log('✓ Dependencies installed', colors.green);
  return true;
}

async function main() {
  log('🚀 Environment Check\n', colors.cyan);
  
  const checks = [
    checkNodeVersion(),
    checkEnvFiles(),
    checkDocker(),
    checkServices(),
    checkDependencies(),
  ];
  
  const allPassed = checks.every(check => check);
  
  log('\n' + '='.repeat(50), colors.cyan);
  
  if (allPassed) {
    log('✨ All checks passed!', colors.green);
    log('Ready to start development', colors.green);
    process.exit(0);
  } else {
    log('❌ Some checks failed', colors.red);
    log('Please fix the issues above and try again', colors.yellow);
    process.exit(1);
  }
}

main().catch(error => {
  log(`\n❌ Error: ${error.message}`, colors.red);
  process.exit(1);
});
