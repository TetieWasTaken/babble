import inquirer from "inquirer";
import fetch from "node-fetch";

export async function startCLI() {
	let exit = false;

	while (!exit) {
		const { action } = await inquirer.prompt({
			type: "list",
			name: "action",
			message: "Choose an action:",
			choices: ["add", "fetch", "modify", "remove", "exit"],
		});

		if (action === "exit") {
			exit = true;
			break;
		}

		const { key } = await inquirer.prompt({
			type: "input",
			name: "key",
			message: "Document key:",
		});

		let body;
		if (action === "add" || action === "modify") {
			const { json } = await inquirer.prompt({
				type: "editor",
				name: "json",
				message: "Enter document as JSON:",
			});
			try {
				body = JSON.parse(json);
			} catch {
				console.error("Invalid JSON, aborting this operation.");
				continue;
			}
		}

		const url = `http://localhost:6363/server/${action}/${encodeURIComponent(key)}`;
		const res = await fetch(url, {
			method: action === "add" ? "POST" : action === "fetch" ? "GET" : action === "modify" ? "PATCH" : "DELETE",
			headers: { "Content-Type": "application/json" },
			body: body ? JSON.stringify(body) : undefined,
		});
		const data = await res.json();
		console.log("→", data);
	}
}
