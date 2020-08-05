#!/usr/bin/env node
const { spawnSync, execSync } = require("child_process");

const { program } = require('commander');

var commands = require('require-all')({
  dirname     :  __dirname + '/commands',
  excludeDirs :  /^\.(git|svn)$/,
  recursive   : true
});


program
  .option('-d, --debug', 'output extra debugging')
  .option('-i, --init', 'init atom component')
  .option('-s, --start', 'start atom nucleus daemon')
  .option('-ss, --signal', 'send signal');

 if (process.argv.length <= 2) {
 	program.help();
 };

program.parse(process.argv);

// console.log("program = ", program);

// if (program.args.length === 0) {
//   program.help();
// }

process.on('exit', function() {
	console.log('process killing');
	// console.log('killing', children.length, 'child processes');
	// children.forEach(function(child) {
	// 	child.kill();
	// });
});

process.on('close', function() {
  console.log('process closing');
  // children.forEach(function(child) {
  //   child.kill();
  // });
});

if (program.debug) console.log(program.opts());
if (program.init) {
	console.log('init atom component');
	// console.log("commands = ", commands);
	commands.init_atom_component();
};
if (program.start) {
	console.log('start/run atom.nucleus daemon');
	// console.log("commands = ", commands);
	commands.start_nucleus_daemon();
};
if (program.signal) {
	console.log('cli to send atom signals');
	// console.log("commands = ", commands);
	commands.send_signal();
};