#!/usr/bin/env node

import chalk from 'chalk';
import { readFile } from 'fs/promises';
import gradient from 'gradient-string';
import inquirer from 'inquirer';
import mongoose from 'mongoose';
import { createSpinner } from 'nanospinner';
import pathLib from 'path';
import getURI from '../lib/db/getURI';

const { prompt } = inquirer;

(async () => {
	console.log('Welcome to', gradient('green', 'yellow')('Mongoba Restore!'));

	console.log("First, let's connect to your MongoDB database.");

	const uri = await getURI();

	const connectSpinner = createSpinner(
		'Connecting to MongoDB server...',
	).start();

	try {
		await mongoose.connect(uri);
	} catch (e) {
		connectSpinner.error({ text: 'Failed to connect to MongoDB server!' });
		console.log(chalk.red(e));
		return;
	}

	connectSpinner.success({ text: 'Connected to MongoDB server!' });

	const { path: unresolvedPath }: { path: string } = await prompt([
		{
			name: 'path',
			type: 'input',
			default: './backup.json',
			message: 'Enter the path to the backup file',
		},
	]);

	const path = pathLib.resolve(unresolvedPath);

	if (unresolvedPath.endsWith('.json.enc')) {
		await mongoose.connection.close();
		console.log(
			chalk.red(
				`${chalk.yellow(
					'[!]',
				)} Seems like the backup file is encrypted. Please decrypt it first using the "mongobad" command.`,
			),
		);
		return;
	}

	if (!unresolvedPath.endsWith('.json')) {
		await mongoose.connection.close();
		console.log(
			chalk.red(
				`${chalk.yellow(
					'[!]',
				)} The backup file must be a JSON file. Please make sure that the file extension is ".json".`,
			),
		);
		return;
	}

	const backup: {
		db: string;
		collections: { collection: string; documents: Record<string, any>[] }[];
	}[] = JSON.parse(await readFile(path, 'utf-8'));

	const { dbs }: { dbs: string[] } = await prompt([
		{
			name: 'dbs',
			type: 'checkbox',
			message: 'Select the databases to restore',
			choices: backup.map((b) => ({
				checked: true,
				name: b.db,
				value: b.db,
			})),
		},
		{
			name: 'confirm',
			type: 'confirm',
			message: 'Are you sure you want to restore the selected databases?',
			default: true,
		},
	]);

	const dbsToRestore = backup.filter((b) => dbs.includes(b.db));

	const restoreSpinner = createSpinner('Restoring backup...').start();

	try {
		await Promise.all(
			dbsToRestore.map(async (db) => {
				await Promise.all(
					db.collections.map(async (collection) => {
						const col = await mongoose.connection
							.useDb(db.db)
							.db.collection(collection.collection);

						if (collection.documents.length > 0) {
							try {
								await col.insertMany(collection.documents, {
									ordered: true,
								});
							} catch (e) {}
						}
					}),
				);
			}),
		);
	} catch (e) {
		restoreSpinner.error({ text: 'Failed to restore backup!' });
		console.log(chalk.red(e));
		process.exit(1);
	}

	restoreSpinner.success({ text: 'Restored backup!' });

	mongoose.connection.close();
})();
