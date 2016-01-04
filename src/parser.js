let parselets = {};
let tokens = [];

function prefix(key, fn) {
    parselets[key] = {prefix: fn};    
}

function literal(key) {
    prefix(key, token => node(key, [token.value], token.line));
}

function infix(key, power, fn) {
    parselets[key] = Object.assign(parselets[key] || {}, {power: power, infix: fn});    
}

function node(head, args, line) {
    return {
        head: head, 
        args: args, 
        line: line
    };
}

function operator(op, power) {
    infix(op, power, (left, token) => {
        return node(op, [left, expression(power)], token.line);
    });
}

function getArgs(end) {
    let args = expression();
    let next = tokens[0];
    if (!next || next.type != end) {
       throw 'expected ' + end;
    } 
    tokens.shift();
    return args;
}

function wrapper(start, end) {
    prefix(start, token => {
        return node(token.type, getArgs(end), token.line);
    });
    infix(start, 0, (left, token) => {
        return node(left, getArgs(end), left.line);
    });
    parselets[end] = {};
}    

function terminator(op, power=1) {
    infix(op, power, (left, token) => {
        if (!tokens[0]) {
            return left;
        }
        let right = expression(power);
        return Array.isArray(left) ? left.concat(right) : [left, right];
    });
}

prefix('quote', token => {
    return node('quote', [expression()], token.line);
});

literal('name');
literal('number'); 
literal('regex');
literal('string');
terminator(',');
terminator('newline', 2);
terminator(';', 2);
operator(':', 3);
operator('=', 4);
operator(':=', 4);
operator(' ', 5);
operator('-', 5);
operator('+', 6);
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
    let left = parselet.prefix && parselet.prefix(token, tokens);
    let next = parselets[tokens[0] && tokens[0].type];
    while (tokens[0] && power < (next && next.power || 0)) {
        token = tokens.shift();
        left = parselets[token.type].infix(left, token, tokens);
        next = parselets[tokens[0] && tokens[0].type];
    }
    return left;
}

export default function parse(ts) {
    tokens = ts;
    let ast = [];
    while (tokens[0]) {
        let node = expression();
        if (node) {
            ast.push(node);
        }
    }
    return ast;
}
