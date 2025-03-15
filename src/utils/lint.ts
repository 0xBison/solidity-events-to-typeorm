import { ESLint } from 'eslint';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
const filesToLint: Set<string> = new Set();

const lintConfigPath = path.resolve(__dirname, '../lint/.eslintrc.js');

export async function lintAndFixFile(filePath: string) {
  console.log(chalk.blue(`Linting file: ${filePath}`));

  const eslint = new ESLint({
    overrideConfigFile: lintConfigPath,
    fix: true,
  });

  const results = await eslint.lintFiles([filePath]);

  // Fix the linting issues
  await ESLint.outputFixes(results);
}

export async function writeFileToLint(filePath: string, fileContent: string) {
  fs.writeFileSync(filePath, fileContent);
  console.log(chalk.blue(`Adding file to lint: ${filePath}`));
  filesToLint.add(filePath);
}

export async function lintFiles() {
  console.log(chalk.blue('Linting files...'));

  const lintPromises = [];

  for (const filePath of filesToLint) {
    lintPromises.push(lintAndFixFile(filePath));
  }

  await Promise.all(lintPromises);

  console.log(chalk.green('Linting files completed successfully'));
}
