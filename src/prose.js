#! /usr/bin/env node

import fs from 'fs';

import lex from './lexer';
import parse from './parser';

let file = fs.readFileSync(process.argv[2]),
    tokens = lex(file.toString()); 

console.log(parse(tokens));
