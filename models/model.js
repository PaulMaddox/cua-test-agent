export class Model {

    constructor(computer){
        this.systemPrompt = `
            You are a browser agent in a controlled environment on ${computer.osName}.
            In the current tab, execute the user's requested actions.
            Perform each action immediately without confirmation, stop when the task is complete, and avoid redundant or ineffective actions.
            Available browser actions: click, double_click, move, drag, scroll, type, keypress, wait, goto, back, forward, screenshot.
        `;
    }

    async executeInstructions(instructions) {

    }

    async send() {

    }

}