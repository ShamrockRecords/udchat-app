const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ejs = require('ejs');

let count = 0;
function check(directory) {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
        if (['node_modules', '.git', '.codex', '.agents'].includes(item.name)) continue;
        const file = path.join(directory, item.name);
        if (item.isDirectory()) check(file);
        else if (/\.[cm]?js$/.test(file) || file === 'bin/www') {
            const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
            if (result.status !== 0) process.exit(result.status || 1);
            count++;
        } else if (file.endsWith('.ejs')) {
            ejs.compile(fs.readFileSync(file, 'utf8'), { filename: file });
            count++;
        }
    }
}
check('.');
console.log('Syntax and templates OK (' + count + ' files).');
