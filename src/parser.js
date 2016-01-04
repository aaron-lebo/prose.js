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
    infix(start, 7, (left, token) => {
        return node(left, getArgs(end), left.line);
    });
    parselets[end] = {};
}    

function literal(key) {
    prefix(key, token => node(key, [token.value], token.line));
}

function terminator(op, power=1) {
    infix(op, power, (left, token) => {
        if (!tokens[0]) {
            return left;
        }
        return (Array.isArray(left) ? left : [left]).concat(expression(power));
    });
}

prefix('quote', token => node('quote', [expression()], token.line));
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
    let left = parselet.prefix && parselet.prefix(token);
    let next = parselets[tokens[0] && tokens[0].type];
    while (tokens[0] && power < (next && next.power || 0)) {
        token = tokens.shift();
        left = parselets[token.type].infix(left, token);
        next = parselets[tokens[0] && tokens[0].type];
    }
    return left;
}

export default function parse(_tokens) {
    tokens = _tokens;
    return expression(); 
}
