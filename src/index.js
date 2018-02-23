#!/usr/bin/env node --harmony

const sade = require('sade');
const path = require('path');
const prog = sade('lg');
const execSh = require('exec-sh');
const pkg = require('../package.json');
const ora = require('ora');
const hasYarn = require('has-yarn');
const pify = require('pify');

// global.log = log;

const binPath = path.resolve(process.cwd(), 'node_modules', '.bin');

const commands = {
  depcheck: path.join(binPath, 'depcheck'),
  npm_check: path.join(binPath, 'npm-check'),
  ncu: path.join(binPath, 'ncu'),
};

const logReturn = (...args) => {
  console.log(args);
  return args[args.length - 1];
};

const exec = async (command, cwd = './', opts = {}, log = false) =>
  new Promise((resolve, reject) => {
    // const spinner = ora('deputil complete');
    const options = Object.assign({}, opts);
    delete options._;
    const keys = Object.keys(options);
    const params = (keys.length && ' -' + keys.join('')) || '';
    const cmd = command + params;
    log && console.log('> ' + cmd + ' ' + cwd + '\n');
    execSh('exec ' + cmd, { cwd: path.resolve(cwd) }, (err, stdout, stderr) => {
      if (!stderr) {
        resolve(stdout);
        return;
      }
      reject(stderr || err);
    });
  }).catch(e => logReturn('##### ERROR ##### ', e));

prog.version(pkg.version);

prog
  .command('ls [cwd]', 'list detailed infos and or update dependencies', { default: true })
  .option('-a', 'newest deps', true)
  .option('-u', 'update node modules')
  .option('-i', 'interactive')
  .option('-g', 'update global node modules')
  // .option('-s', 'update', true)
  // .option('-t', 'newest deps', true)
  .example('deputil')
  .example('deputil ./path/to/package')
  .action(async (cwd = './', opts) => {
    if (opts.u) {
      const command = opts.i ? commands.npm_check : commands.ncu;
      await exec(command, cwd, opts);
      const updateCmd = (!!opts.i && false) || (hasYarn(cwd) ? 'yarn install' : 'npm install');
      updateCmd && exec(updateCmd, cwd, {}, true);
      // opts.i(!opts.i && (hasYarn(cwd) && exec('yarn install', cwd, {}, true))) || exec('npm install', cwd, {}, true);
    } else {
      await exec(commands.npm_check, cwd, opts);
      console.log('\nUse depu [deputil] -u for update.\n');
    }
    return true;
  });

prog
  .command('up [cwd]', 'update deps')
  .option('-a', 'newest deps', true)
  .option('-u', 'update node modules', true)
  .option('-i', 'interactive mode')
  .example('up ./path/to/package')
  .example('up -u ./path/to/package')
  .action(async (cwd = './', opts) => {
    const res = opts.i ? await exec(commands.npm_check, cwd, opts) : await exec(commands.ncu, cwd, opts);
    return res;
  });

prog
  .command('check [cwd]', 'update deps')
  .example('check ./path/to/package/')
  .action(async (cwd, opts) => {
    const res = await exec(commands.depcheck, cwd, opts, true);
    console.log('\nUse depu [deputil] -u for update.\n');
    return res;
  });

prog.parse(process.argv);
