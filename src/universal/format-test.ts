/**
 * Test different output formats
 */

import { FormatProcessor } from './index.js';

async function testFormats() {
  console.log('🎨 Testing Output Formats');

  const formatProcessor = new FormatProcessor();

  // Create test output with various ANSI sequences
  const testData = [
    '\x1b[31mRed text\x1b[0m',
    '\x1b[32;1mBold green\x1b[0m',
    '\x1b[33;4mYellow underlined\x1b[0m',
    '\x1b[44mBlue background\x1b[0m',
    '\x1b[1;31;43mBold red on yellow\x1b[0m',
    'Progress: \x1b[32m████████\x1b[37m░░\x1b[0m 80%',
    '\x1b[2J\x1b[H\x1b[31mCleared screen\x1b[0m',
  ];

  for (const [i, testInput] of testData.entries()) {
    console.log(`\n📝 Test ${i + 1}: ${JSON.stringify(testInput)}`);

    const output = formatProcessor.processOutput(Buffer.from(testInput), 'stdout');

    console.log('📄 Text format:', JSON.stringify(output.text));
    console.log('🌐 HTML format:', formatProcessor.serializeForTransmission(output, 'html'));
    console.log('📊 JSON format (first 100 chars):',
      formatProcessor.serializeForTransmission(output, 'json').substring(0, 100) + '...'
    );
    console.log('💾 Raw format (base64, first 50 chars):',
      formatProcessor.serializeForTransmission(output, 'raw').substring(0, 50) + '...'
    );

    console.log(`🔍 Found ${output.formatted.length} ANSI sequences:`);
    output.formatted.forEach((seq, idx) => {
      console.log(`   ${idx + 1}. ${seq.type}: ${seq.description}`);
    });
  }

  // Test progress bar detection
  console.log('\n🔄 Testing Progress Bar Detection:');
  const progressTexts = [
    'Download: ████████████████████████████████ 100%',
    'Installing: ⠋ Please wait...',
    'Building: [█████████████████████     ] 75%',
    '\rProgress: 45%\rProgress: 46%\rProgress: 47%',
  ];

  progressTexts.forEach((text, i) => {
    console.log(`\n📊 Progress test ${i + 1}:`);
    console.log('Original:', JSON.stringify(text));
    console.log('Contains progress:', formatProcessor.containsProgressIndicators(text));
    console.log('Stripped:', JSON.stringify(formatProcessor.stripProgressIndicators(text)));
  });
}

testFormats().catch(console.error);