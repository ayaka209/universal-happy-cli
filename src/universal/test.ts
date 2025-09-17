/**
 * Universal CLI Wrapper - Basic Test
 *
 * Simple test to verify core functionality.
 */

import { SessionManager, FormatProcessor } from './index.js';

async function testBasicFunctionality() {
  console.log('🧪 Testing Universal CLI Wrapper...');

  // Test Format Processor
  console.log('\n📝 Testing Format Processor...');
  const formatProcessor = new FormatProcessor();

  const testAnsi = '\x1b[31mRed text\x1b[0m and \x1b[32mgreen text\x1b[0m';
  const output = formatProcessor.processOutput(Buffer.from(testAnsi), 'stdout');

  console.log('Raw ANSI:', JSON.stringify(testAnsi));
  console.log('Stripped text:', output.text);
  console.log('Parsed sequences:', output.formatted.length);

  // Test HTML conversion
  const html = formatProcessor.serializeForTransmission(output, 'html');
  console.log('HTML output:', html);

  // Test Session Manager
  console.log('\n🎮 Testing Session Manager...');
  const sessionManager = new SessionManager();
  await sessionManager.initialize();

  try {
    // Create a simple session
    const sessionId = await sessionManager.createSession({
      command: 'echo',
      args: ['Hello, Universal CLI!'],
      autoStart: true
    });

    console.log(`✅ Session created: ${sessionId}`);

    // Wait a bit for output
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get session info
    const session = sessionManager.getSession(sessionId);
    console.log(`📊 Session status: ${session?.status}`);
    console.log(`📜 History entries: ${session?.outputHistory.length || 0}`);

    // Get history
    const history = sessionManager.getSessionHistory(sessionId, 'text');
    console.log('📝 Session output:', history.join('\n'));

    // Cleanup
    await sessionManager.terminateSession(sessionId);
    console.log('🧹 Session terminated');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  await sessionManager.shutdown();
  console.log('\n✅ All tests completed!');
}

// Run tests if this file is executed directly
testBasicFunctionality().catch(console.error);