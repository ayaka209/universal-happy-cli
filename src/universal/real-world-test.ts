/**
 * Real-world application test
 */

import { SessionManager } from './index.js';

async function realWorldTest() {
  console.log('🌍 Real-world Application Test');

  const sessionManager = new SessionManager();
  await sessionManager.initialize();

  // Simulate typical development workflow
  const workflow = [
    {
      name: 'Check Git Status',
      command: 'git',
      args: ['status', '--porcelain'],
      description: 'Quick git status check'
    },
    {
      name: 'List Files',
      command: 'cmd',
      args: ['/c', 'dir', '/b'],
      description: 'List directory contents'
    },
    {
      name: 'Node Version',
      command: 'node',
      args: ['--version'],
      description: 'Check Node.js version'
    },
    {
      name: 'Check NPM Config',
      command: 'npm',
      args: ['config', 'get', 'registry'],
      description: 'Check NPM registry'
    }
  ];

  const sessions = [];

  // Start all sessions concurrently
  console.log('\n🚀 Starting concurrent sessions...');
  for (const task of workflow) {
    try {
      const sessionId = await sessionManager.createSession({
        command: task.command,
        args: task.args,
        autoStart: true
      });

      sessions.push({ ...task, sessionId });
      console.log(`✅ Started: ${task.name} (${sessionId.slice(0, 8)})`);
    } catch (error) {
      console.log(`❌ Failed to start: ${task.name} - ${error}`);
    }
  }

  // Wait for all to complete
  console.log('\n⏳ Waiting for completion...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Collect results
  console.log('\n📊 Results:');
  for (const session of sessions) {
    const sessionInfo = sessionManager.getSession(session.sessionId);
    const history = sessionManager.getSessionHistory(session.sessionId, 'text');

    console.log(`\n📝 ${session.name}:`);
    console.log(`   Status: ${sessionInfo?.status}`);
    console.log(`   Output lines: ${history.length}`);
    console.log(`   Sample output: ${JSON.stringify(history[0]?.substring(0, 50) || 'No output')}`);

    // Test different formats for the first session
    if (session === sessions[0] && history.length > 0) {
      console.log('\n🎨 Format examples:');
      const htmlHistory = sessionManager.getSessionHistory(session.sessionId, 'html');
      const jsonHistory = sessionManager.getSessionHistory(session.sessionId, 'json');

      console.log(`   HTML: ${htmlHistory[0]?.substring(0, 100)}...`);
      console.log(`   JSON: ${jsonHistory[0]?.substring(0, 100)}...`);
    }
  }

  // Test session management operations
  console.log('\n🎮 Testing session management:');

  // Create a long-running session
  const longSessionId = await sessionManager.createSession({
    command: 'node',
    args: ['-e', 'setInterval(() => console.log(new Date().toISOString()), 1000)'],
    autoStart: true
  });

  console.log(`✅ Started long-running session: ${longSessionId.slice(0, 8)}`);

  // Let it run for a bit
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check its output
  const longSessionHistory = sessionManager.getSessionHistory(longSessionId, 'text');
  console.log(`📜 Long session generated ${longSessionHistory.length} lines`);

  // Terminate it
  await sessionManager.terminateSession(longSessionId);
  console.log(`🛑 Terminated long-running session`);

  // Final statistics
  console.log('\n📈 Final Statistics:');
  const stats = sessionManager.getStats();
  console.log(`   Total sessions created: ${stats.totalSessions}`);
  console.log(`   Currently running: ${stats.runningSessions}`);
  console.log(`   Terminated: ${stats.terminatedSessions}`);
  console.log(`   Remote connections: ${stats.totalRemoteConnections}`);

  await sessionManager.shutdown();
  console.log('\n✅ Real-world test completed successfully!');
}

realWorldTest().catch(console.error);