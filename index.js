import dotenv from 'dotenv';
import path from 'path';
import process from 'process';
import { readFile } from "fs/promises";
import yaml from 'js-yaml';
import { LocalBrowserComputer } from './computers/localbrowser-computer.js';
import { AzureOpenAICUA } from './models/azure-openai-cua.js';  
import { LOG } from './logger.js';

async function main() {
    
    // Load environment variables from .env file
    dotenv.config();

    // Save the results to a path of /outputs/cua-test-<dd-mm-yyyy>-<hh-mm-ss>/
    const date = new Date().toISOString().replace(/[:.]/g, '-');
    LOG.setLogPath(path.join('./outputs', `cua-test-${date}`));

    // Parse CLI arguments
    const { instructionsFile, headless } = getCliArgs();
    const instructions = await loadInstructions(instructionsFile);

    const computer = new LocalBrowserComputer(instructions.startUrl, headless);
    await computer.start();

    const model = new AzureOpenAICUA(computer, {
            endpoint: process.env.AZURE_OPENAI_ENDPOINT,
            apiKey: process.env.AZURE_OPENAI_API_KEY,
            deployment: process.env.AZURE_OPENAI_DEPLOYMENT || "computer-use-preview",
            apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2025-04-01-preview",
    });

    // Loop through the instructions provided, and execute each of them using the model provided.
    await model.executeInstructions(instructions.instructions);

    await computer.stop();
    process.exit(0);

}

async function loadInstructions(instructionsFile) {
    const fileContent = await readFile(instructionsFile, "utf-8");
    let parsed;
    try {
        parsed = yaml.load(fileContent);
    } catch (e) {
        throw new Error(`Instructions file must be valid YAML with 'startUrl' and 'instructions' fields. Error: ${e.message}`);
    }
    if (!parsed || !Array.isArray(parsed.instructions)) {
        throw new Error("Instructions file must contain an 'instructions' array.");
    }
    return {
        name: parsed.name || null,
        description: parsed.description || null,
        startUrl: parsed.startUrl || null,
        instructions: parsed.instructions.map(line => line.trim()).filter(line => line.length > 0),
    };
}


function getCliArgs() {
    const args = process.argv.slice(2);
    let instructionsFile;
    let headless = false;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--instructions-file' && args[i + 1]) {
            instructionsFile = args[i + 1];
            i++; // skip next arg since it's the filename
            continue;
        }
        if (args[i] === '--headless') {
            headless = true;
            continue;
        }
    }    if (!instructionsFile) {
        instructionsFile = './instructions/slotmachine.yaml';
    }
    return { instructionsFile, headless };
}


main();