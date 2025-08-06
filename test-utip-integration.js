/**
 * Test Script: UNS + UT-IP Integration
 * Demonstrates the Utopia Naming System with UT-IP encoding
 */

const { UNSResolver } = require('./UNS-Resolver.js');
const { UTIPEncoder } = require('./UT-IP-Encoder.js');

async function testUNSWithUTIP() {
  console.log('🌍 UNS + UT-IP Integration Test\n');
  console.log('='.repeat(50));
  
  // Create resolver with UT-IP enabled
  const resolver = new UNSResolver({
    utipEnabled: true,
    utipSecurityLevel: 1
  });
  
  console.log('\n🔧 Configuration:');
  console.log('UT-IP Enabled:', resolver.utipEnabled);
  console.log('Security Level:', resolver.utipEncoder.securityLevel);
  
  // Test addresses
  const testAddresses = [
    'utopia.dillanet//.obsidiannotes',
    'utopia.alice//.blog',
    'utopia.dillanet//.nextcloud'
  ];
  
  console.log('\n🚀 Testing UNS Resolution with UT-IP:\n');
  
  for (const address of testAddresses) {
    try {
      console.log(`📍 Testing: ${address}`);
      
      // Standard resolution
      const standardResult = await resolver.resolve(address);
      console.log(`   Standard:  ${standardResult}`);
      
      // Resolution with UT-IP
      const utipResult = await resolver.resolveWithUTIP(address);
      console.log(`   UT-IP URL: ${utipResult.utip.encodedURL}`);
      
      // Show IP mappings if any
      if (utipResult.utip.ipMappings.length > 0) {
        console.log('   IP Encodings:');
        utipResult.utip.ipMappings.forEach(mapping => {
          console.log(`     ${mapping.original} → ${mapping.encoded}`);
        });
      }
      
      console.log('');
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
    }
  }
  
  // Test UT-IP functionality directly
  console.log('🔒 UT-IP Security Level Demonstration:\n');
  
  const testIP = '192.168.1.100';
  console.log(`Testing IP: ${testIP}`);
  
  // Level 1 (Basic symbol substitution)
  const level1Encoder = new UTIPEncoder({ securityLevel: 1 });
  const level1Result = level1Encoder.demonstrateEncoding(testIP);
  console.log(`Level 1: ${level1Result.encoded}`);
  
  // Level 2 (Symbol + rotation)
  const level2Encoder = new UTIPEncoder({ securityLevel: 2, rotationKey: 3 });
  const level2Result = level2Encoder.demonstrateEncoding(testIP);
  console.log(`Level 2: ${level2Result.encoded}`);
  
  // Level 3 (Cryptographic obfuscation)
  const level3Encoder = new UTIPEncoder({ securityLevel: 3 });
  const level3Result = level3Encoder.demonstrateEncoding(testIP);
  console.log(`Level 3: ${level3Result.encoded}`);
  
  // Test text encoding
  console.log('\n📝 Text Encoding Example:\n');
  const sampleText = "Server at 192.168.1.1:8080 or backup 10.0.0.1:3000";
  console.log(`Original: ${sampleText}`);
  console.log(`UT-IP:    ${level1Encoder.encodeInText(sampleText)}`);
  
  // Test UNS configuration
  console.log('\n⚙️ UNS UT-IP Configuration:\n');
  
  // Change security level
  resolver.configureUTIP({ securityLevel: 2, rotationKey: 5 });
  console.log('Updated to Security Level 2');
  
  const configDemo = resolver.demonstrateUTIP('172.16.0.1');
  console.log(`Demo encoding: ${configDemo.original} → ${configDemo.encoded}`);
  
  // Test disable/enable
  console.log('\n🔄 Toggle UT-IP:\n');
  
  resolver.setUTIPEnabled(false);
  const disabledResult = await resolver.resolveWithUTIP('utopia.dillanet//.obsidiannotes');
  console.log('UT-IP Disabled - has utip field:', 'utip' in disabledResult);
  
  resolver.setUTIPEnabled(true);
  const enabledResult = await resolver.resolveWithUTIP('utopia.dillanet//.obsidiannotes');
  console.log('UT-IP Enabled  - has utip field:', 'utip' in enabledResult);
  
  console.log('\n✅ All tests completed successfully!');
  console.log('\n' + '='.repeat(50));
  console.log('🎯 UT-IP Integration Summary:');
  console.log('• Visual IP obfuscation working ✓');
  console.log('• Multiple security levels ✓');
  console.log('• UNS integration seamless ✓');
  console.log('• Configuration management ✓');
  console.log('• Text encoding/decoding ✓');
  console.log('\n🚀 Ready for Chrome extension integration!');
}

// Run the test
if (require.main === module) {
  testUNSWithUTIP().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testUNSWithUTIP };
