const CONFIG = {
    windowTitle: "reine@terminal — bash",
    promptSymbol: "reine@terminal:~$",
    pageTitle: "Reine Terminal",
    welcomeLines: ['Terminal v1.0.1 — type "help" to see available commands.', ""],
    notFoundText: (input) => `command not found: ${input}`,
    commands: {
        help: {
            description: "List all available commands",
            output: null,
        },
        about: {
            description: "Show information about this terminal",
            output: [
                "Reine is an API proxy for anilist.",
                "This website mimics a real terminal.",
                "Everything here is written in vanilla javascript.",
            ],
        },
        whoami: {
            description: "Display the current user",
            output: "You are the visitor.",
        },
        date: {
            description: "Show the current date and time in Indonesia",
            output: () => {
                const dt = new Date();

                const formatter = new Intl.DateTimeFormat("en-US", {
                    timeZone: "Asia/Jakarta",
                    weekday: "short",
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                });

                const parts = formatter.formatToParts(dt).reduce((acc, part) => {
                    acc[part.type] = part.value;
                    return acc;
                }, {});

                const baseString = `${parts.weekday} ${parts.month} ${parts.day} ${parts.year} ${parts.hour}:${parts.minute}:${parts.second}`;

                return `${baseString} GMT+0700 (Western Indonesia Time)`;
            },
        },
        contact: {
            description: "Show contact information",
            output: [
                "Email: harmonyhub.id@gmail.com",
                "GitHub: https://github.com/i46nScG",
                "Discord: https://discord.gg/ZUahYpXXBD",
            ],
        },
        clear: {
            description: "Clear the screen",
            output: null,
        },
        status: {
            description: "Show current proxy status",
            output: "Everything is run normally.",
        },
        anilist: {
            description: "The link to the Anilist website",
            output: "https://anilist.co/home",
        },
    },
};

const outputEl = document.getElementById("output");
const inputEl = document.getElementById("commandInput");
const promptLabelEl = document.getElementById("promptLabel");
const titleTextEl = document.getElementById("titleText");
const screenEl = document.getElementById("screen");

let commandHistory = [];
let historyIndex = -1;

function init() {
    document.title = CONFIG.pageTitle;
    titleTextEl.textContent = CONFIG.windowTitle;
    promptLabelEl.textContent = CONFIG.promptSymbol;
    printLines(CONFIG.welcomeLines, "lineMuted");
    inputEl.focus();
}

function printLine(text, className) {
    const line = document.createElement("div");
    line.className = `line ${className || "lineResponse"}`;
    line.textContent = text;
    outputEl.appendChild(line);
}

function printLines(lines, className) {
    lines.forEach((text) => printLine(text, className));
}

function printCommandEcho(rawInput) {
    const line = document.createElement("div");
    line.className = "line lineCommand";
    const symbol = document.createElement("span");
    symbol.className = "promptSymbol";
    symbol.textContent = CONFIG.promptSymbol;
    line.appendChild(symbol);
    line.appendChild(document.createTextNode(rawInput));
    outputEl.appendChild(line);
}

function scrollToBottom() {
    screenEl.scrollTop = screenEl.scrollHeight;
}

function resolveOutput(commandDef) {
    const raw = typeof commandDef.output === "function" ? commandDef.output() : commandDef.output;
    if (raw === null || raw === undefined) return [];
    return Array.isArray(raw) ? raw : [raw];
}

function buildHelpLines() {
    const names = Object.keys(CONFIG.commands).sort();
    const width = Math.max(...names.map((n) => n.length)) + 2;
    return names.map((name) => {
        const description = CONFIG.commands[name].description || "";
        return `  ${name.padEnd(width, " ")}${description}`;
    });
}

function executeCommand(rawInput) {
    const trimmed = rawInput.trim();
    const key = trimmed.toLowerCase();

    if (key === "") return;

    if (key === "clear" || key === "cls") {
        outputEl.innerHTML = "";
        return;
    }

    if (key === "help") {
        printLine("Available commands:", "lineResponse");
        printLines(buildHelpLines(), "lineResponse");
        return;
    }

    const commandDef = CONFIG.commands[key];
    if (!commandDef) {
        printLine(CONFIG.notFoundText(trimmed), "lineError");
        return;
    }

    const lines = resolveOutput(commandDef);
    printLines(lines, "lineResponse");
}

function handleSubmit() {
    const rawInput = inputEl.value;
    printCommandEcho(rawInput);

    if (rawInput.trim() !== "") {
        commandHistory.push(rawInput);
    }
    historyIndex = commandHistory.length;

    executeCommand(rawInput);
    inputEl.value = "";
    scrollToBottom();
}

function handleKeydown(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        handleSubmit();
        return;
    }

    if (event.key === "ArrowUp") {
        event.preventDefault();
        if (commandHistory.length === 0) return;
        historyIndex = Math.max(0, historyIndex - 1);
        inputEl.value = commandHistory[historyIndex] || "";
        return;
    }

    if (event.key === "ArrowDown") {
        event.preventDefault();
        if (commandHistory.length === 0) return;
        historyIndex = Math.min(commandHistory.length, historyIndex + 1);
        inputEl.value = commandHistory[historyIndex] || "";
    }
}

inputEl.addEventListener("keydown", handleKeydown);
document.addEventListener("click", () => inputEl.focus());

init();
