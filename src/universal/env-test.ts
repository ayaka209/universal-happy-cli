#!/usr/bin/env tsx

/**
 * Environment Variables Inheritance Test
 *
 * Tests that all environment variables from the parent process
 * are correctly inherited by spawned processes.
 */

import { SessionManager } from './SessionManager.js';

// Set some test environment variables
process.env.UHAPPY_TEST_VAR = 'test_value_123';
process.env.CUSTOM_PATH = '/custom/test/path';
process.env.NESTED_VALUE = JSON.stringify({ nested: true, value: 42 });

console.log('🧪 Testing Environment Variables Inheritance...\n');

// Show current environment variables (subset)
console.log('📋 Current Parent Process Environment:');
const relevantEnvVars = Object.entries(process.env)
  .filter(([key]) =>
    key.startsWith('UHAPPY_') ||
    key.startsWith('CUSTOM_') ||
    key.startsWith('NESTED_') ||
    key === 'PATH' ||
    key === 'HOME' ||
    key === 'USER' ||
    key === 'NODE_VERSION'
  )
  .slice(0, 10); // Show first 10 relevant vars

relevantEnvVars.forEach(([key, value]) => {
  console.log(`  ${key}=${value?.substring(0, 100)}${value && value.length > 100 ? '...' : ''}`);
});

console.log(`\n📊 Total environment variables: ${Object.keys(process.env).length}\n`);

async function testEnvironmentInheritance() {
  const sessionManager = new SessionManager();

  try {
    console.log('🔄 Testing Node.js process environment inheritance...');

    // Test 1: Node.js script to check environment variables
    const nodeSessionId = await sessionManager.createSession({
      command: 'node',
      args: ['-e', `
        console.log('=== Child Process Environment Check ===');
        console.log('UHAPPY_TEST_VAR:', process.env.UHAPPY_TEST_VAR);
        console.log('CUSTOM_PATH:', process.env.CUSTOM_PATH);
        console.log('NESTED_VALUE:', process.env.NESTED_VALUE);
        console.log('PATH exists:', !!process.env.PATH);
        console.log('HOME exists:', !!process.env.HOME);
        console.log('Total env vars:', Object.keys(process.env).length);

        // Check if specific parent env vars are present
        const parentVars = ['UHAPPY_TEST_VAR', 'CUSTOM_PATH', 'NESTED_VALUE'];
        const inherited = parentVars.filter(v => process.env[v]);
        console.log('Inherited custom vars:', inherited.length + '/' + parentVars.length);
      `]
    });

    // Wait for session to complete
    await new Promise(resolve => {
      const checkStatus = () => {
        const session = sessionManager.getSession(nodeSessionId);
        if (session && (session.status === 'terminated' || session.status === 'error')) {
          resolve(session);
        } else {
          setTimeout(checkStatus, 100);
        }
      };
      checkStatus();
    });

    console.log('\n🔄 Testing system command environment inheritance...');

    // Test 2: System command to check environment
    let systemCommand: string;
    let systemArgs: string[];

    if (process.platform === 'win32') {
      systemCommand = 'cmd';
      systemArgs = ['/c', 'echo UHAPPY_TEST_VAR=%UHAPPY_TEST_VAR% && echo CUSTOM_PATH=%CUSTOM_PATH%'];
    } else {
      systemCommand = 'sh';
      systemArgs = ['-c', 'echo "UHAPPY_TEST_VAR=$UHAPPY_TEST_VAR" && echo "CUSTOM_PATH=$CUSTOM_PATH"'];
    }

    const systemSessionId = await sessionManager.createSession({
      command: systemCommand,
      args: systemArgs
    });

    // Wait for system session to complete
    await new Promise(resolve => {
      const checkStatus = () => {
        const session = sessionManager.getSession(systemSessionId);
        if (session && (session.status === 'terminated' || session.status === 'error')) {
          resolve(session);
        } else {
          setTimeout(checkStatus, 100);
        }
      };
      checkStatus();
    });

    console.log('\n🔄 Testing custom environment variable override...');

    // Test 3: Custom environment variable override
    const customSessionId = await sessionManager.createSession({
      command: 'node',
      args: ['-e', `
        console.log('=== Custom Environment Override Test ===');
        console.log('UHAPPY_TEST_VAR (should be overridden):', process.env.UHAPPY_TEST_VAR);
        console.log('CUSTOM_OVERRIDE_VAR (should be new):', process.env.CUSTOM_OVERRIDE_VAR);
        console.log('PATH still exists:', !!process.env.PATH);
      `],
      env: {
        UHAPPY_TEST_VAR: 'overridden_value',
        CUSTOM_OVERRIDE_VAR: 'new_custom_value'
      }
    });

    // Wait for custom session to complete
    await new Promise(resolve => {
      const checkStatus = () => {
        const session = sessionManager.getSession(customSessionId);
        if (session && (session.status === 'terminated' || session.status === 'error')) {
          resolve(session);
        } else {
          setTimeout(checkStatus, 100);
        }
      };
      checkStatus();
    });

    console.log('\n✅ Environment inheritance test completed!');

  } catch (error) {
    console.error('❌ Environment inheritance test failed:', error);
  } finally {
    await sessionManager.shutdown();
  }
}

// Add verification function
function verifyCurrentEnvironment() {
  console.log('🔍 Verifying current process environment...');

  // Check critical environment variables
  const criticalVars = ['PATH', 'HOME', 'USER', 'NODE_VERSION', 'npm_config_user_config'];
  const missingVars = criticalVars.filter(v => !process.env[v]);

  if (missingVars.length > 0) {
    console.warn(`⚠️  Missing critical environment variables: ${missingVars.join(', ')}`);
  } else {
    console.log('✅ All critical environment variables present');
  }

  // Check our test variables
  const testVars = ['UHAPPY_TEST_VAR', 'CUSTOM_PATH', 'NESTED_VALUE'];
  const presentTestVars = testVars.filter(v => process.env[v]);
  console.log(`📋 Test variables set: ${presentTestVars.length}/${testVars.length}`);

  console.log('');
}

// Run tests
verifyCurrentEnvironment();
testEnvironmentInheritance();