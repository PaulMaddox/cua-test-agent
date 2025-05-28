import { Model } from "./model.js";
import axios from "axios";
import axiosRetry from "axios-retry";
import { LOG } from "../logger.js";

export class AzureOpenAICUA extends Model {

    constructor(computer, azureConfig) {
        super(computer);
        this.computer = computer || null;
        this.previousResponseId = null;
        this.azureConfig = azureConfig || {};
        this.costPerInputToken = 3.00 / 1_000_000; // $3.00 per million input tokens
        this.costPerOutputToken = 12.00 / 1_000_000; // $12.00 per million output tokens
        this.inputTokensUsed = 0;
        this.outputTokensUsed = 0;  
        this.systemPrompt = `
            You are a browser agent in a controlled environment. 
            In the current tab, execute the user's requested actions.
            Perform each action immediately without confirmation, stop when the task is complete, and avoid redundant or ineffective actions.
            Available browser actions: click, double_click, move, drag, scroll, type, keypress, wait, goto, back, forward, screenshot.
        `;
        
        // Apply a retry strategy to handle transient errors
        // This will retry up to 3 times with exponential backoff for network errors or 5xx responses
        axiosRetry(axios, {
            retries: 3,
            retryDelay: axiosRetry.exponentialDelay,
            shouldResetTimeout: true
        });

        LOG.info("[Azure OpenAI CUA] Initialized with configuration:");
        LOG.info(`Endpoint: ${this.azureConfig.endpoint}`);
        LOG.info(`Deployment: ${this.azureConfig.deployment}`);
        LOG.info(`API Version: ${this.azureConfig.apiVersion}`);
    }

    async executeInstructions(instructions) {
        await super.executeInstructions(instructions);

        // Iterate through the provided instructions, and execute each one using the Azure OpenAI API.
        //let previousMessageId;
        for (const instruction of instructions) {

            LOG.info(`[Azure OpenAI CUA] System Prompt: ${this.systemPrompt}`);
            LOG.info(`[Azure OpenAI CUA] User Instruction: ${instruction}`);

            const response = await this.send([
                { role: "system", content: this.systemPrompt },
                { role: "user", content: instruction },
            ]);

           // previousMessageId = response.id;

            await this.handleActions(response, response.id);

        }

        LOG.ok("[Azure OpenAI CUA] All instructions completed!");
        const cost = ((this.inputTokensUsed * this.costPerInputToken) + (this.outputTokensUsed * this.costPerOutputToken)).toFixed(6)
        LOG.warn(`[Azure OpenAI Usage] Total ${this.inputTokensUsed} input tokens, ${this.outputTokensUsed} output tokens ($${cost})`);

    }

    async handleActions(response, previousResponseId) {

        if (!response || !response.output || response.output.length === 0) {
            LOG.warn("[Azure OpenAI CUA] No actions to perform in the response.");
            return;
        }

        // Collect outputs for computer_call actions
        const computerCallOutputs = [];

        for (const action of response.output) {
            switch (action.type) {
                case "reasoning": {
                    for (const summary of action.summary) {
                        LOG.info(`[Azure OpenAI CUA] Reasoning: ${summary.text}`);
                    }
                    break;
                }
                case "message": {
                    for (const content of action.content) {
                        LOG.ok(`[Azure OpenAI CUA] Message: ${content.text}`);
                    }
                    break;
                }
                case "computer_call": {
                    LOG.debug(`[Azure OpenAI CUA] Executing computer call: ${action.action.type} (call_id: ${action.call_id})`);
                    await this.computer.handleAction(action.action);

                    // Take a screenshot after handling the action
                    const screenshot = await this.computer.screenshot();

                    // Prepare the output for this call
                    computerCallOutputs.push({
                        type: "computer_call_output",
                        call_id: action.call_id,
                        status: "completed",
                        output: {
                            type: "computer_screenshot",
                            image_url: `data:image/png;base64,${screenshot}`,
                            // detail: "low", // This helps reduce the token cost of image processing, but you can change it to "high" if needed
                        }
                    });
                    break;
                }
            }
        }

        // If there were any computer_call actions, send all outputs together
        if (computerCallOutputs.length > 0) {
            const followupResponse = await this.send(computerCallOutputs, previousResponseId);

            // Update previousResponseId to the new response ID
            previousResponseId = followupResponse.id;

            LOG.debug(`[Azure OpenAI CUA] Responded for computer calls: ${computerCallOutputs.map(o => o.call_id).join(", ")}`);
            
            // Recursively handle any further actions (new computer_call actions in followupResponse)
            await this.handleActions(followupResponse, previousResponseId);
        }

    }

    async send(input, previousResponseId = null) {
        await super.send(input);

        const url = `${this.azureConfig.endpoint}/openai/responses?api-version=${this.azureConfig.apiVersion}`;
        const headers = {
            "Content-Type": "application/json",
            "api-key": this.azureConfig.apiKey,
        }

        const body = {
            model: this.azureConfig.deployment,
            previous_response_id: previousResponseId || undefined,
            tools: [{
                type: "computer_use_preview",
                environment: "browser",
                display_width: this.computer.displayWidth,
                display_height: this.computer.displayHeight,
            }],
            input,
            store: true,
            reasoning: { generate_summary: "concise" },
            truncation: "auto",
        }

        // Log the request body for debugging, but truncate the image URL if it exists to avoid cluttering the logs
        const debugOutputBody = JSON.parse(JSON.stringify(body));
        if (debugOutputBody.input && debugOutputBody.input[0].output && debugOutputBody.input[0].output.image_url) {
            debugOutputBody.input[0].output.image_url = debugOutputBody.input[0].output.image_url.slice(0, 100) + '...';
        }
        LOG.debug("[Azure OpenAI Request] " + JSON.stringify(debugOutputBody, null, 2));

        let response;
        try {
            response = await axios.post(url, body, { headers });
        } catch (error) {
            LOG.error("[Azure OpenAI CUA] Error sending request to Azure OpenAI: " + error.message);
            if (error.response) {
                LOG.error("[Azure OpenAI CUA] Response data: " + JSON.stringify(error.response.data, null, 2));
            }
            process.exit(1);
        }

        LOG.debug("[Azure OpenAI Response] " + JSON.stringify(response.data, null, 2));

        if (response.data && response.data.usage && response.data.usage.input_tokens !== undefined && response.data.usage.output_tokens !== undefined) {
            this.inputTokensUsed += response.data.usage.input_tokens;
            this.outputTokensUsed += response.data.usage.output_tokens; 
            const cost = ((response.data.usage.input_tokens * this.costPerInputToken) + (response.data.usage.output_tokens * this.costPerOutputToken)).toFixed(6)
            LOG.warn(`[Azure OpenAI Usage] ${response.data.usage.input_tokens} input tokens, ${response.data.usage.output_tokens} output tokens ($${cost})`);
        }

        return response.data;
    }

}