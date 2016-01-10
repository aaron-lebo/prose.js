#! /usr/bin/env node

import(
    fs: 'fs',
    parseArgs: 'minimist',
    lex: './lexer',
    parse: './parser',
    compile: './compiler'
)

args = process.argv.slice(2) parseArgs
ast = fs.readFileSync(args['_'][0]).toString() lex parse
args.n if( 
    ast JSON.stringify(nil, 1),
    ast compile
) console.log
