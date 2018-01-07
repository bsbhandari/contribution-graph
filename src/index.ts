#!/usr/bin/env node

import { execSync } from 'child_process';
import { randomBytes } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import moment from 'moment';
import { terminal as term } from 'terminal-kit';
import { Command } from 'commander';
import alphabet from './symbol';

interface PackageJson {
  name: string;
  description: string;
  version: string;
}

const p: PackageJson = require('../package.json');
const dayInWeek = 7;
const chars = ['░', '▒', '▓', '█'];
const readme = 'This is a tool to visualize git contributions and commit patterns';

const mapRange = (
  x: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number => (x - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;

// Add empty space to alphabet
alphabet[' '] = alphabet[' '] || new Array(dayInWeek).fill(' ');

const program = new Command();

program
  .name(p.name)
  .description(p.description)
  .version(p.version)
  .option('-s, --startdate [date]', 'Set the start date (rounded to week)')
  .option('-o, --origin [url]', 'Add origin url')
  .option('-p, --push', 'Push to origin')
  .option('-f, --force', 'Force push')
  .option('-t, --text [text]', 'Text to draw')
  .option('-b, --branch [branch]', 'Set the branch')
  .option('-m, --multiplier [number]', 'Commit multiplier', '1');

program.parse();

const options = program.opts();

if (options.push && !options.origin) {
  console.warn('Option --origin required');
}

let startDate: moment.Moment;
let pattern: string[];

if (options.startdate) {
  startDate = moment(options.startdate);
  startDate.day(0);
} else {
  startDate = moment('/01/01' + new Date().getFullYear());
  startDate.day(0);
}
startDate.set({ hour: 0, minute: 0, second: 0, millisecond: 0 });

if (options.text) {
  pattern = new Array(dayInWeek).fill(' ');
  for (const l of options.text) {
    if (!(l in alphabet)) {
      console.warn(`'${l}' character not supported`);
      console.info('Charset: ' + Object.keys(alphabet).join(' '));
      process.exit(1);
    }
    const letter = alphabet[l];
    for (let i = 0; i < letter.length; i++) {
      pattern[i] += letter[i] + ' ';
    }
  }
} else {
  console.warn('Option --text required');
  process.exit(1);
}

pattern = pattern.map(l => l.replace(/ /g, '0'));
const matrix = pattern.map(line => line.split('').map(c => parseInt(c)));

let seconds = startDate.unix();
const file = 'readme.md';

writeFileSync(join(file), readme);
execSync(`git add ${file}`);

term.windowTitle(p.name);
term.reset();
term.hideCursor();

const maxWeeks = Math.max(...matrix.map(line => line.length));
const area = maxWeeks * dayInWeek;

let commits = 0;
for (let week = 0; week < maxWeeks; week++) {
  for (let day = 0; day < dayInWeek; day++) {
    const dayPassed = week * dayInWeek + day + 1;
    const progress = dayPassed / area;
    term.moveTo(1, dayInWeek + 1);
    term.bar(progress, { barStyle: term.brightWhite, innerSize: maxWeeks });
    
    const commitsPerDay = matrix[day][week] * parseInt(options.multiplier || '1');
    for (let commit = 0; commit < commitsPerDay; commit++) {
      let progress2 = mapRange(commit, 0, commitsPerDay - 1, 0, chars.length - 1);
      if (isNaN(progress2)) progress2 = chars.length - 1;
      term.moveTo(week + 1, day + 1, chars[Math.floor(progress2)]);
      execSync(`git commit --allow-empty --date="${seconds}" -am '${p.name}'`);
      commits++;
    }
    seconds += 24 * 60 * 60;
  }
}

term.moveTo(1, dayInWeek + 1);
term.eraseLine();
term.hideCursor(false);

console.info(`file generated (${commits} commits), starting date ${startDate.format('ddd MMM DD YYYY')}`);

if (options.push) {
  process.stdout.write('Pushing... ');
  execSync(`git push ${options.force ? '--force' : ''} -u origin ${options.branch || 'main'}`);
} 