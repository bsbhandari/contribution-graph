const execSync = require('child_process').execSync;
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const program = require('commander');
const moment = require('moment');
const term = require('terminal-kit').terminal;
const p = require('./package.json'),
	dayInWeek = 7, chars = ['░', '▒', '▓', '█'],
	mapRange = (x, inMin, inMax, outMin, outMax) => (x - inMin) * (outMax - outMin) / (inMax - inMin) + outMin,
	readme = `This is a tool to analyze and visualize git contributions and commit patterns`;

let alphabet = require('./a');

program
	.version(p.version)
	.option('-s, --startdate [date]', 'Set the start date (rounded to week)')
	.option('-o, --origin [url]', 'Add origin url')
	.option('-p, --push', 'Push to origin')
	.option('-f, --force', 'Force push')
	.option('-t, --text [text]', 'Text to draw')
    .option('-b, --branch [branch]', 'Set the branch')
	.parse(process.argv);


    if (process.argv.length < 3) {
        program.help();
    }
    
    if (program.push && !program.origin) {
        console.warn('Option --origin required');
    }
    

    alphabet[' '] = alphabet[' '] || new Array(dayInWeek).fill(' ');
    
    let startDate, pattern;
    
    if (program.startdate) {
        startDate = moment(program.startdate);
        startDate.day(0);
    } else {
        startDate = moment.utc();
        startDate.subtract(53, 'week');
        startDate.day(7);
    }
    startDate.set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
    
    if (program.text) {
        pattern = new Array(dayInWeek).fill(' ');
        for (const l of program.text) {
            if (!(l in alphabet)) {
                console.warn(`'${l}' character not supported`);
                return console.info('Charset: ' + Object.keys(alphabet).join(' '));
            }
            const letter = alphabet[l];
            for (let i = 0; i < letter.length; i++) {
                pattern[i] += letter[i] + ' ';
            }
        }
    } else {
        return console.warn('Option --text required');
    }
    
    pattern = pattern.map(l => l.replace(/ /g, 0));
    let matrix = pattern.map(line => line.split('').map(c => parseInt(c)));
    
    let seconds = startDate.unix();
    const folder = 'contribution-graph-' + crypto.randomBytes(6).toString('hex'), file = 'readme.md';
    fs.mkdirSync(folder);
    execSync(`git init ${folder}`);
    fs.writeFileSync(`./${folder}/${file}`, readme);
    execSync(`git -C ${folder} add ${file}`);
    term.windowTitle(p.name);
    term.reset();
    term.hideCursor();
    
    const maxWeeks = Math.max(...matrix.map(line => line.length)), area = maxWeeks * dayInWeek;
    
    let commits = 0;
    for (let week = 0; week < maxWeeks; week++) {
        for (let day = 0; day < dayInWeek; day++) {
            const dayPassed = week * dayInWeek + day + 1;
            const progress = dayPassed / area;
            term.moveTo(1, dayInWeek + 1);
            term.bar(progress, { barStyle: term.brightWhite, innerSize: maxWeeks });
            const commitsPerDay = matrix[day][week] * program.multiplier;
            for (let commit = 0; commit < commitsPerDay; commit++) {
                let progress2 = mapRange(commit, 0, commitsPerDay - 1, 0, chars.length - 1);
                if (isNaN(progress2)) progress2 = chars.length - 1;
                term.moveTo(week + 1, day + 1, chars[progress2]);
                execSync(`git -C ${folder} commit --allow-empty --date="${seconds}" -am '${p.name}'`);
                commits++;
            }
            seconds += 24 * 60 * 60;
        }
    }
    term.moveTo(1, dayInWeek + 1);
    term.eraseLine();
    term.hideCursor(0);
    
    console.info(`${folder} generated (${commits} commits), starting date ${startDate.format('ddd MMM DD YYYY')}`);
    
    if (program.origin) {
        console.info(`Adding origin ${program.origin}`);
        execSync(`git -C ${folder} remote add origin ${program.origin}`);
    }
    
    if (program.push) {
        process.stdout.write('Pushing... ');
        execSync(`git -C ${folder} push ${program.force ? '--force' : ''} -u origin ${program.branch || 'main'}`);
    }