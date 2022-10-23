#!/usr/bin/env node

import chalk from 'chalk';
import Cryptr from 'cryptr';
import { existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import gradient from 'gradient-string';
import inquirer from 'inquirer';
import moment from 'moment';
import mongoose from 'mongoose';
import { createSpinner } from 'nanospinner';
import path from 'path';
import getAllDBs from './lib/db/getAll';
import getCollections from './lib/db/getCollections';
import getDocuments from './lib/db/getDocuments';
import getURI from './lib/db/getURI';
import encryptFunc from './lib/util/ecrypt';
import fileSelector from './lib/util/fileSelector';
import stringifyJson from './lib/util/stringifyJson';

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

	const uri = await getURI();

	const spinner = createSpinner('Connecting to MongoDB server...').start();

	try {
		await mongoose.connect(uri);
	} catch (err) {
		spinner.error({ text: 'Failed to connect to MongoDB server!' });
		console.log(chalk.red(err));
		return;
	}

	spinner.success({ text: 'Connected to MongoDB server!' });

	// Log all DBs
	const dbs = await getAllDBs(mongoose.connection);

	console.log();

	const { dbs: backup }: { dbs: string[] } = await prompt([
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

	// Get all collections in each DB
	const collections = await getCollections(backup, mongoose.connection);

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
	const documents = await getDocuments(
		collectionsToBackupArray,
		mongoose.connection,
	);

	const closeSpinner = createSpinner('Closing connection...').start();
	await mongoose.connection.close();
	closeSpinner.success({ text: 'Connection closed.' });

	// Prompt for file path
	const { file: backupPath, format } = await fileSelector(
		true,
		true,
		['.json'],
		`./backup_${moment().unix()}.json`,
	);

	let stringifiedJson = stringifyJson(documents, format);

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

	const writeSpinner = createSpinner('Writing backup file...').start();

	const resolvedPath = path.resolve(`${backupPath}${encrypt ? '.enc' : ''}`);

	if (encrypt) {
		const encryptSpinner = createSpinner('Encrypting backup file...').start();

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
		)('Backup complete! Thank you for using Mongoba!'),
	);

	console.log();

	console.log('Bye!');
})();
