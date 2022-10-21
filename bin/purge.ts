#!/usr/bin/env node

import chalk from 'chalk';
import gradient from 'gradient-string';
import inquirer from 'inquirer';
import mongoose from 'mongoose';
import { createSpinner } from 'nanospinner';
import getAllDBs from '../lib/db/getAll';
import getCollections from '../lib/db/getCollections';
import getURI from '../lib/db/getURI';

const { prompt } = inquirer;

(async () => {
	console.log('Welcome to', gradient('#ff0000', '#990000')('Mongoba Purge!'));

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

	console.log(
		"This tool allows you to purge specific collections or even databases. It's useful when you want to remove all data from a database or collection.",
	);

	const { confirmed } = await prompt([
		{
			name: 'confirmed',
			type: 'confirm',
			message: 'Purging cannot be undone. Are you sure you want to continue?',
			default: false,
		},
	]);

	if (!confirmed) {
		await mongoose.connection.close();
		console.log(chalk.yellow('Purge cancelled.'));
		return;
	}

	const databaseList = await (await getAllDBs(mongoose.connection))
		.map((d) => d.name)
		.sort((a, b) => a.localeCompare(b));

	const { databases }: { databases: string[] } = await prompt([
		{
			type: 'checkbox',
			name: 'databases',
			message: 'Select the databases you want to purge anything from',
			choices: databaseList.map((db) => ({
				name: db,
				value: db,
				disabled: db === 'admin' || db === 'config' || db === 'local',
			})),
		},
	]);

	const collectionList = await getCollections(databases, mongoose.connection);

	const collections: Record<string, string[]> = await prompt(
		collectionList.map((c) => ({
			type: 'checkbox',
			name: c.db,
			message: `Select the collections you want to purge from ${c.db}`,
			choices: c.collections.map((col) => ({
				name: col,
				value: col,
				checked: true,
			})),
		})),
	);

	const collectionsArray = Object.entries(collections).map(([db, cols]) => ({
		db,
		collections: cols,
	}));

	const purgeConfirmString = collectionsArray
		.map((c) => {
			return `- ${c.db}\n   - ${c.collections.join('\n   - ')}`;
		})
		.join('\n');

	console.log('The following entries will be purged:');
	console.log(purgeConfirmString);

	const { purgeConfirmed } = await prompt([
		{
			name: 'purgeConfirmed',
			type: 'confirm',
			message: 'Are you sure you want to continue?',
			default: false,
		},
	]);

	if (!purgeConfirmed) {
		await mongoose.connection.close();
		console.log(chalk.yellow('Purge cancelled.'));
		return;
	}

	const purgeSpinner = createSpinner('Purging...').start();

	try {
		await Promise.all(
			collectionsArray.map(async (c) => {
				await Promise.all(
					c.collections.map(async (col) => {
						await mongoose.connection.useDb(c.db).db.collection(col).drop();
					}),
				);
			}),
		);
	} catch (e) {
		purgeSpinner.error({ text: 'Failed to purge!' });
		console.log(chalk.red(e));
		process.exit(1);
	}

	purgeSpinner.success({ text: 'Purged!' });

	await mongoose.connection.close();

	console.log(chalk.green('Purge completed!'));

	console.log('Bye!');
})();
