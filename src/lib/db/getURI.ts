import inquirer from 'inquirer';

const { prompt } = inquirer;

export default async function getURI() {
	// Prompt for IP, Port, Username, Password, and optionally for authentication database
	const {
		ip,
		port,
		username,
		password,
		authDB,
		auth,
		uri: promptURI,
		method,
	} = await prompt([
		{
			type: 'list',
			choices: [
				{
					name: 'prompt',
					value: 'prompt',
				},
				{
					name: 'uri',
					value: 'uri',
				},
			],
			message: 'Which entry method would you like to use?',
			name: 'method',
		},
		{
			type: 'input',
			name: 'uri',
			message: 'What is the URI of the database?',
			when: (answers) => answers.method === 'uri',
		},
		{
			type: 'input',
			name: 'ip',
			message: 'What is the IP of the MongoDB server?',
			default: '127.0.0.1',
			when: (answers) => answers.method === 'prompt',
		},
		{
			type: 'input',
			name: 'port',
			message: 'What is the port of the MongoDB server?',
			default: '27017',
			when: (answers) => answers.method === 'prompt',
		},
		{
			type: 'confirm',
			name: 'auth',
			message: 'Does the MongoDB server require authentication?',
			default: true,
			when: (answers) => answers.method === 'prompt',
		},
		{
			type: 'input',
			name: 'username',
			message: 'What is the username of the MongoDB server?',
			default: 'admin',
			when: (answers) => answers.auth && answers.method === 'prompt',
		},
		{
			type: 'password',
			name: 'password',
			message: 'What is the password of the MongoDB server?',
			default: 'admin',
			when: (answers) => answers.auth && answers.method === 'prompt',
		},
		{
			type: 'input',
			name: 'authDB',
			message: 'What is the authentication database of the MongoDB server?',
			default: 'admin',
			when: (answers) => answers.auth && answers.method === 'prompt',
		},
	]);

	if (method == 'uri') {
		return promptURI.replace('localhost', '127.0.0.1') as string;
	}

	// Connect to MongoDB server
	// Make password URI safe
	const passwordURI = encodeURIComponent(password);
	const uri = `mongodb://${
		auth ? `${username}:${passwordURI}@` : ''
	}${ip}:${port}${auth ? `/${authDB}?authSource=${authDB}` : ''}`;

	return uri;
}
