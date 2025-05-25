import { readFile } from "fs/promises";
import { LocalBrowserComputer } from './computers/localbrowser-computer.js';
import { AzureOpenAICUA } from './models/azure-openai-cua.js';  
import { LOG } from './logger.js';
import process from 'process';
import path from 'path';

async function main() {
    
    // Save the results to a path of /outputs/cua-test-<dd-mm-yyyy>-<hh-mm-ss>/
    const date = new Date().toISOString().replace(/[:.]/g, '-');
    LOG.setLogPath(path.join('./outputs', `cua-test-${date}`));

    // Parse CLI arguments
    const { instructionsFile } = getCliArgs();
    const instructions = await loadInstructions(instructionsFile);

    const computer = new LocalBrowserComputer(instructions.startUrl, instructions.headless);
    await computer.start();

    const model = new AzureOpenAICUA(computer);

    // Loop through the instructions provided, and execute each of them using the model provided.
    await model.executeInstructions(instructions.instructions);

    await computer.stop();
    process.exit(0);

}

async function loadInstructions(instructionsFile) {
    const fileContent = await readFile(instructionsFile, "utf-8");
    let parsed;
    try {
        parsed = JSON.parse(fileContent);
    } catch (e) {
        throw new Error("Instructions file must be valid JSON with 'startUrl' and 'instructions' fields.");
    }
    if (!Array.isArray(parsed.instructions)) {
        throw new Error("Instructions file must contain an 'instructions' array.");
    }
    return {
        name: parsed.name || null,
        description: parsed.description || null,
        startUrl: parsed.startUrl || null,
        headless: typeof parsed.headless === "boolean" ? parsed.headless : false,
        instructions: parsed.instructions.map(line => line.trim()).filter(line => line.length > 0),
    };
}


function getCliArgs() {
    const args = process.argv.slice(2);
    let instructionsFile;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--instructions-file' && args[i + 1]) {
            instructionsFile = args[i + 1];
            i++; // skip next arg since it's the filename
            continue;
        }
    }
    if (!instructionsFile) {
        instructionsFile = './instructions/slotmachine.json';
    }
    return { instructionsFile };
}


main();