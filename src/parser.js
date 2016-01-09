let parselets = {};
let tokens = [];

function merge(key, obj) { 
    parselets[key] = Object.assign(parselets[key] || {}, obj);    
}

function prefix(key, fn) {
    merge(key, {prefix: fn});    
}

function infix(key, power, fn) {
    merge(key, {power: power, infix: fn});    
}

function node(head, args, line) {
    return {node: head, args: args, line: line};
}

function operator(op, power) {
    infix(op, power, (left, token) => {
        return node(op, [left, expression(power)], token.line);
    });
}

function getArgs(end) {
    let next = tokens[0];
    let arg = [];
    let args = [];
    while (next) {
        if ([end, ','].indexOf(next.type) != -1) {
            tokens.shift();
            args.push(arg.length == 1 ? arg[0] : arg);
            arg = [];
            if (next.type == end) {
                return args;
            } 
        } else {
            arg.push(expression());
        } 
        next = tokens[0];
    }
}

function wrapper(start, end) {
    prefix(start, token => {
        return node(token.type, getArgs(end), token.line);
    });
    infix(start, 6, (left, token) => {
        return node(left, getArgs(end), left.line);
    });
    parselets[end] = {};
}    

function literal(key) {
    prefix(key, token => node(key, [token.value], token.line));
}

function terminator(op, power=1) {
    infix(op, power, (left, token) => left);
}

prefix('quote', token => node('quote', [expression()], token.line));
literal('#');
literal('name');
literal('number'); 
literal('regex');
prefix('string', t => node('string', [t.value.slice(1, -1)], t.line));
terminator('newline');
terminator(';');
operator(':', 3);
operator('=', 4);
operator(':=', 4);
operator('->', 4);
operator('-', 5);
operator('+', 5);
operator(' ', 5);
operator('.', 6);
wrapper('(', ')');
wrapper('[', ']');
wrapper('{', '}');

function expression(power=0) {
    let token = tokens.shift();
    let parselet = parselets[token.type];
    if (!parselet) {
        throw token.line + ': could not parse "' + token.type + '"';
    }
    let left = parselet.prefix && parselet.prefix(token);
    let next = parselets[tokens[0] && tokens[0].type];
    while (tokens[0] && power < (next && next.power || 0)) {
        token = tokens.shift();
        left = parselets[token.type].infix(left, token);
        next = parselets[tokens[0] && tokens[0].type];
    }
    return left;
}

export default function parse($tokens) {
    tokens = $tokens;
    let ast = [];
    while (tokens[0]) {
        ast.push(expression()); 
    }
    return ast;
}
