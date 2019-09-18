import DataClient from "@financial-times/origami-repo-data-client"

let prototypeKeys = Reflect.ownKeys(DataClient.prototype)
let commandMatcher = /^(create|delete|get|list)([A-Za-z]+)$/
let commandTree = prototypeKeys.reduce(
	(commandTree, key) => {
		let match = commandMatcher.exec(String(key))
		if (!match) {
			return commandTree
		}
		let [, type, target] = match
		target = target.replace(/(.)/, first => first.toLowerCase())
		target = target.replace(
			/([a-z])([A-Z])/g,
			(_, lower, upper) => lower + "-" + upper.toLowerCase()
		)
		commandTree[type][target] = DataClient.prototype[key]
		return commandTree
	},
	{
		create: {},
		delete: {},
		get: {},
		list: {},
	}
)

function printHelp(commandTree) {
	process.stdout.write("commands:\n\n")
	for (let type in commandTree) {
		process.stdout.write(type)
		process.stdout.write("\t")
		let first = true
		process.stdout.write("<")
		for (let target in commandTree[type]) {
			if (first) {
				first = false
			} else {
				process.stdout.write("|")
			}
			process.stdout.write(target)
		}
		process.stdout.write(">")
		process.stdout.write("\n")
	}
}

let tryParse = arg => {
	try {
		return eval(`(${arg})`)
	} catch {
		return arg
	}
}

void (async function() {
	let [, , type, target] = process.argv
	let targetTree = commandTree[type]
	let command = targetTree && targetTree[target]
	if (!command) {
		printHelp(commandTree)
		process.exit(1)
	}
	let client = new DataClient({
		apiKey: process.env.ORIGAMI_REPO_DATA_KEY,
		apiSecret: process.env.ORIGAMI_REPO_DATA_SECRET,
	})
	let result = await command
		.apply(client, process.argv.slice(4).map(tryParse))
		.catch(() => printHelp(commandTree))
	let output = typeof result == "string" ? result : JSON.stringify(result)
	process.stdout.write(output)
})()
