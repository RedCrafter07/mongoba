export default function stringifyJson(
	inp: Record<string, any> | any[],
	format: boolean = false,
) {
	return format ? JSON.stringify(inp, null, 2) : JSON.stringify(inp);
}
