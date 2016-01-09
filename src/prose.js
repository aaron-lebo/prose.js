#! /usr/bin/env node

import fs from 'fs';
import parseArgs from 'minimist';

import lex from './lexer';
import parse from './parser';
import compile from './compiler';

let args = parseArgs(process.argv.slice(2));
let file = fs.readFileSync(args['_'][0]);
let tokens = lex(file.toString()); 
let ast = parse(tokens);
if (args.n) {
    console.log(JSON.stringify(ast, null, 1));
} else {
    console.log(compile(ast));
}
