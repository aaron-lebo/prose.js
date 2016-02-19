#! /usr/bin/env node
import Immutable from 'immutable';
import fs from 'fs';
import parseArgs from 'minimist';
import lex from './lexer';
import parse from './parser';
import compile from './compiler';
let args = parseArgs(process.argv.slice(2));
let ast = parse(lex(fs.readFileSync(args['_'][0]).toString()));
console.log(args.n ? JSON.stringify(ast, null, 1) : compile(ast));
