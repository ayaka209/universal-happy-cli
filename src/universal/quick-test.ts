/**
 * Quick test of core functionality
 */

import { SessionManager, FormatProcessor } from './index.js';

async function quickTest() {
  console.log('🚀 Quick Test of Universal CLI Wrapper');

  // Test 1: Format Processor with complex ANSI
  console.log('\n1️⃣ Testing ANSI Format Processing...');
  const formatProcessor = new FormatProcessor();

  const complexAnsi = '\x1b[1;31mError:\x1b[0m \x1b[33mWarning message\x1b[0m\n\x1b[32m✓ Success\x1b[0m\n\x1b[94mInfo: \x1b[4mUnderlined text\x1b[0m';
  const output = formatProcessor.processOutput(Buffer.from(complexAnsi), 'stderr');

  console.log('📝 Original ANSI:', JSON.stringify(complexAnsi));
  console.log('📝 Stripped text:', output.text);
  console.log('📝 Sequences found:', output.formatted.length);
  console.log('📝 HTML output:');
  console.log(formatProcessor.serializeForTransmission(output, 'html'));

  // Test 2: Session Manager with different commands
  console.log('\n2️⃣ Testing Session Manager...');
  const sessionManager = new SessionManager();
  await sessionManager.initialize();

  // Test multiple commands
  const commands = [
    { cmd: 'echo', args: ['Hello World!'] },
    { cmd: 'node', args: ['-e', 'console.log("Node.js:", process.version)'] },
    { cmd: 'cmd', args: ['/c', 'dir', '.'] } // Windows dir command
  ];

  for (const { cmd, args } of commands) {
    try {
      console.log(`\n🔄 Testing: ${cmd} ${args.join(' ')}`);

      const sessionId = await sessionManager.createSession({
        command: cmd,
        args,
        autoStart: true
      });

      console.log(`✅ Session created: ${sessionId.slice(0, 8)}`);

      // Wait for completion
      await new Promise(resolve => {
        const timeout = setTimeout(resolve, 3000);
        sessionManager.on('sessionTerminated', (id) => {
          if (id === sessionId) {
            clearTimeout(timeout);
            resolve(undefined);
          }
        });
      });

      const session = sessionManager.getSession(sessionId);
      console.log(`📊 Status: ${session?.status}, Exit code: ${session?.exitCode}`);

      // Get output
      const history = sessionManager.getSessionHistory(sessionId, 'text');
      console.log(`📜 Output (${history.length} lines):`);
      history.forEach((line, i) => {
        if (i < 3) console.log(`   ${line}`);
      });
      if (history.length > 3) console.log(`   ... and ${history.length - 3} more lines`);

    } catch (error) {
      console.error(`❌ Failed: ${error}`);
    }
  }

  // Test 3: Statistics
  console.log('\n3️⃣ System Statistics:');
  const stats = sessionManager.getStats();
  console.log(`📈 Total sessions: ${stats.totalSessions}`);
  console.log(`📈 Running: ${stats.runningSessions}`);
  console.log(`📈 Terminated: ${stats.terminatedSessions}`);

  await sessionManager.shutdown();
  console.log('\n✅ Quick test completed!');
}

quickTest().catch(console.error);