import { readdir } from 'fs/promises';
import { prompt } from 'inquirer';

export default async function fileSelector(
	withFormat = false,
	noSearch = false,
	endings: ('.json' | '.json.enc')[] = ['.json', '.json.enc'],
) {
	const { file, format }: { file: string; format: boolean } = await prompt([
		{
			type: 'list',
			name: 'type',
			choices: [
				{
					name: 'File',
					value: 'file',
				},
				{
					name: 'Search',
					value: 'search',
				},
			],
			message: 'Select an action',
			when: !noSearch,
		},
		{
			type: 'file',
			name: 'file',
			message: 'Select a file',
			validate: (input: string) => {
				return endings.some((ending) => input.endsWith(ending))
					? true
					: 'Please select a valid file';
			},
			when: (answers) => answers.type === 'file' || noSearch,
		},
		{
			type: 'list',
			name: 'file',
			choices: (
				await readdir('./', {
					withFileTypes: true,
				})
			)
				.map((d) => d.name)
				.filter((d) => endings.some((ending) => d.endsWith(ending))),
			when: (answers) => answers.type === 'search' && !noSearch,
		},
		{
			type: 'confirm',
			name: 'format',
			message: 'Do you want to format the backup file?',
			default: false,
			when: () => withFormat,
		},
	]);

	if (withFormat) {
		return { file, format };
	}

	return { file };
}
