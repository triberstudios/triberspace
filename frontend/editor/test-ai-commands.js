// Test script to demonstrate new AI capabilities
// This is just for testing - remove after verification

import { AIManager } from './js/ai/AIManager.js';

async function testAICommands() {
    console.log('Testing enhanced AI capabilities...');

    const aiManager = AIManager.createDefault();
    await aiManager.initialize('mock'); // Using mock provider for testing

    const testCommands = [
        "Add a red cube",
        "Make it metallic",
        "Add a blue sphere",
        "Make the sphere transparent",
        "Rotate the cube 45 degrees",
        "Scale the sphere bigger",
        "Change the cube to green",
        "Make it rough"
    ];

    for (const command of testCommands) {
        console.log(`\nTesting: "${command}"`);
        try {
            const result = await aiManager.parseSceneCommand(command);
            console.log('Commands generated:', JSON.stringify(result.commands, null, 2));
            console.log('Response:', result.response);
        } catch (error) {
            console.error('Error:', error.message);
        }
    }

    aiManager.destroy();
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testAICommands().catch(console.error);
}