import inquirer from 'inquirer';

const { prompt } = inquirer;

export default async function getURI() {
	// Prompt for IP, Port, Username, Password, and optionally for authentication database
	const { ip, port, username, password, authDB } = await prompt([
		{
			type: 'input',
			name: 'ip',
			message: 'What is the IP of the MongoDB server?',
			default: 'localhost',
		},
		{
			type: 'input',
			name: 'port',
			message: 'What is the port of the MongoDB server?',
			default: '27017',
		},
		{
			type: 'confirm',
			name: 'auth',
			message: 'Does the MongoDB server require authentication?',
			default: true,
		},
		{
			type: 'input',
			name: 'username',
			message: 'What is the username of the MongoDB server?',
			default: 'admin',
			when: (answers) => answers.auth,
		},
		{
			type: 'password',
			name: 'password',
			message: 'What is the password of the MongoDB server?',
			default: 'admin',
			when: (answers) => answers.auth,
		},
		{
			type: 'input',
			name: 'authDB',
			message: 'What is the authentication database of the MongoDB server?',
			default: 'admin',
			when: (answers) => answers.auth,
		},
	]);

	// Connect to MongoDB server
	// Make password URI safe
	const passwordURI = encodeURIComponent(password);
	const uri = `mongodb://${username}:${passwordURI}@${ip}:${port}/${authDB}?authSource=${authDB}`;

	return uri;
}
