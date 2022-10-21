export default function stringifyJson(inp: string, format: boolean = false) {
	return format ? JSON.stringify(inp, null, 2) : JSON.stringify(inp);
}
