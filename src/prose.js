#! /usr/bin/env node

import fs from 'fs';

import lex from './lexer';
import parse from './parser';
import compile from './compiler';

let file = fs.readFileSync(process.argv[2]);
let tokens = lex(file.toString()); 
let ast = parse(tokens);
console.log(JSON.stringify(compile(ast), null, 1));
