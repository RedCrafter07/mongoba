import Cryptr from 'cryptr';

export default function decrypt(inp: string, key: string) {
	const cryptr = new Cryptr(key);

	return cryptr.decrypt(inp);
}
