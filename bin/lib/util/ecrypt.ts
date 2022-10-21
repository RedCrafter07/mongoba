import Cryptr from 'cryptr';

export default function encrypt(toEncrypt: string, key: string) {
	const cryptr = new Cryptr(key);

	return cryptr.encrypt(toEncrypt);
}
