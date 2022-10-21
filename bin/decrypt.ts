#!/usr/bin/env node

import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import inquirer from 'inquirer';
import { createSpinner } from 'nanospinner';
import path from 'path';
import decrypt from '../lib/util/decrypt';
import stringifyJson from '../lib/util/stringifyJson';

const { prompt } = inquirer;

(async () => {
	const {
		path: unresolvedFilePath,
		decryptionKey,
		outputPath: unresolvedOutputFilePath,
		format,
	}: {
		path: string;
		decryptionKey: string;
		outputPath: string;
		format: boolean;
	} = await prompt([
		{
			type: 'input',
			name: 'path',
			message: 'What is the path to the file you want to decrypt?',
			default: './backup.json.enc',
		},
		{
			type: 'input',
			name: 'decryptionKey',
			message: 'What is the key you have encrypted the file with?',
		},
		{
			type: 'input',
			name: 'outputPath',
			message: 'Where do you want to save the decrypted file?',
			default: './backup.json',
		},
		{
			type: 'confirm',
			name: 'format',
			message:
				'Do you want to format the decrypted file? (This may increase the file size)',
			default: false,
		},
	]);

	const spinner = createSpinner('Decrypting file...');

	const filePath = path.resolve(unresolvedFilePath);

	const file = await readFile(filePath, 'utf-8');

	const decryptedFile = JSON.parse(decrypt(file, decryptionKey));

	spinner.success({ text: 'File decrypted!' });

	const writeSpinner = createSpinner('Writing file...');

	const outputPath = path.resolve(unresolvedOutputFilePath);

	if (await existsSync(outputPath)) {
		writeSpinner.error({ text: 'File already exists!' });

		const { overwrite }: { overwrite: boolean } = await prompt([
			{
				type: 'confirm',
				name: 'overwrite',
				message: 'Do you want to overwrite the file?',
				default: false,
			},
		]);

		if (!overwrite) return;
		else {
			writeSpinner.start({ text: 'Writing file...' });
		}
	}

	await writeFile(outputPath, stringifyJson(decryptedFile, format));

	writeSpinner.success({ text: 'File written!' });
})();
