#!/usr/bin/env node

import chalk from 'chalk';
import Cryptr from 'cryptr';
import { existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import gradient from 'gradient-string';
import inquirer from 'inquirer';
import mongoose from 'mongoose';
import { createSpinner } from 'nanospinner';
import path from 'path';
import encryptFunc from './lib/ecrypt';

const { prompt } = inquirer;

/* 
 _      ____  _      _____ ____        ____  ____  ____  _  __ _     ____
/ \__/|/  _ \/ \  /|/  __//  _ \      /  _ \/  _ \/   _\/ |/ // \ /\/  __\
| |\/||| / \|| |\ ||| |  _| / \|_____ | | //| / \||  /  |   / | | |||  \/|
| |  ||| \_/|| | \||| |_//| \_/|\____\| |_\\| |-|||  \_ |   \ | \_/||  __/
\_/  \|\____/\_/  \|\____\\____/      \____/\_/ \|\____/\_|\_\\____/\_/
*/

(async () => {
	console.log('Welcome to', gradient('#ff3434', '#ffcc00')('Mongo-Backup!'));
	console.log("Let's get started!");

	console.log();
	console.log("Let's connect to your MongoDB database first.");
	console.log('Please authenticate as a user with admin privileges.');

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
			type: 'input',
			name: 'username',
			message: 'What is the username of the MongoDB server?',
			default: 'admin',
		},
		{
			type: 'password',
			name: 'password',
			message: 'What is the password of the MongoDB server?',
			default: 'admin',
		},
		{
			type: 'input',
			name: 'authDB',
			message: 'What is the authentication database of the MongoDB server?',
			default: 'admin',
		},
	]);

	const spinner = createSpinner('Connecting to MongoDB server...');

	// Connect to MongoDB server
	// Make password URI safe
	const passwordURI = encodeURIComponent(password);
	const uri = `mongodb://${username}:${passwordURI}@${ip}:${port}/${authDB}?authSource=${authDB}`;

	try {
		await mongoose.connect(uri, {});
	} catch (err) {
		spinner.error({ text: 'Failed to connect to MongoDB server!' });
		console.log(chalk.red(err));
		return;
	}

	spinner.success({ text: 'Connected to MongoDB server!' });

	// Log all DBs
	const dbs = await (
		await mongoose.connection.db.admin().listDatabases()
	).databases;

	console.log();

	const { dbs: dbsToBackup } = await prompt([
		{
			type: 'checkbox',
			choices: dbs
				.map((db) => ({
					name: db.name,
					value: db.name,
					checked:
						db.name !== 'admin' && db.name !== 'config' && db.name !== 'local',
				}))
				.sort((a, b) => a.name.localeCompare(b.name)),
			message: 'Which databases do you want to backup?',
			name: 'dbs',
		},
	]);

	const backup: string[] = dbsToBackup;

	// Get all collections in each DB
	const collections = await Promise.all(
		backup.map(async (db) => {
			const collections = await (
				await mongoose.connection.useDb(db).db.listCollections().toArray()
			).map((collection) => collection.name);
			return { db, collections };
		}),
	);

	// Prompt for collections to backup
	const collectionsToBackup: Record<string, string[]> = await prompt(
		collections.map((db) => ({
			message: `Which collections do you want to backup from the '${db.db}' database?`,
			name: db.db,
			type: 'checkbox',
			choices: db.collections.map((collection) => ({
				name: collection,
				value: collection,
				checked: true,
			})),
		})),
	);

	// Remap collections to backup to an array
	const collectionsToBackupArray = Object.entries(collectionsToBackup).map(
		([db, collections]) => ({
			db,
			collections,
		}),
	);

	// Get all documents from each collection
	const documents = (
		await Promise.all(
			collectionsToBackupArray.map(async (db) => {
				const documents = await Promise.all(
					db.collections.map(async (collection) => {
						const documents = await mongoose.connection
							.useDb(db.db)
							.collection(collection)
							.find({})
							.toArray();
						return { collection, documents };
					}),
				);
				return { db: db.db, collections: documents };
			}),
		)
	).filter(
		(d) => d.collections.filter((c) => c.documents.length > 0).length > 0,
	);

	const closeSpinner = createSpinner('Closing connection...');
	await mongoose.connection.close();
	closeSpinner.success({ text: 'Connection closed.' });

	// Prompt for file path
	const { path: backupPath, format: formatAny } = await prompt([
		{
			type: 'input',
			name: 'path',
			message: 'Where do you want to save the backup?',
			default: './backup.json',
		},
		{
			type: 'confirm',
			name: 'formatted',
			message: 'Do you want to format the backup file?',
			default: false,
		},
	]);

	const format: boolean = formatAny;

	const writeSpinner = createSpinner('Writing backup file...');

	let stringifiedJson: string = format
		? JSON.stringify(documents, null, 2)
		: JSON.stringify(documents);

	const {
		encrypt,
		password: encryptionPassword,
	}: { encrypt: boolean; password: string } = await prompt([
		{
			type: 'confirm',
			name: 'encrypt',
			message: 'Do you want to encrypt the backup file?',
			default: false,
		},
		{
			type: 'password',
			name: 'password',
			message: 'What is the password you want to encrypt the backup file with?',
			when: (answers) => answers.encrypt,
		},
	]);

	const resolvedPath = path.resolve(`${backupPath}${encrypt ? '.enc' : ''}`);

	if (encrypt) {
		const encryptSpinner = createSpinner('Encrypting backup file...');

		stringifiedJson = await encryptFunc(stringifiedJson, encryptionPassword);

		encryptSpinner.success({ text: 'Backup file encrypted!' });
	}

	// Check if file exists
	if (await existsSync(resolvedPath)) {
		const { overwrite } = await prompt([
			{
				type: 'confirm',
				name: 'overwrite',
				message: 'The file already exists. Do you want to overwrite it?',
				default: false,
			},
		]);

		if (!overwrite) {
			writeSpinner.warn({ text: 'Backup file not written.' });
			return;
		}
	}

	// Write backup file
	try {
		await writeFile(resolvedPath, stringifiedJson);
	} catch (err) {
		writeSpinner.error({ text: 'Failed to write backup file!' });
		console.log(chalk.red(err));
		return;
	}

	writeSpinner.success({ text: `Backup file written to ${resolvedPath}` });

	console.log();

	if (encrypt) {
		console.log(
			chalk.yellowBright('[!] To decrypt, use the mongobad command.'),
		);
	}

	console.log();

	console.log(
		gradient(
			'#4287f5',
			'#00dd00',
		)('Backup complete! Thank you for using Mongo-Backup!'),
	);

	console.log();

	console.log('Bye!');
})();
