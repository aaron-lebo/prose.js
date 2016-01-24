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

function operator(op, power, right=false) {
    infix(op, power, (left, token) => {
        return node(op, [left, expression(right ? power - 1 : power)], token.line);
    });
}

function getArgs(end) {
    let next = tokens[0];
    let arg = [];
    let args = [];
    while (next) {
        if ([';', 'newline'].indexOf(next.type) != -1) {
            tokens.shift();
        } else if ([end, ','].indexOf(next.type) == -1) {
            arg.push(expression());
        } else { 
            tokens.shift();
            if (arg.length != 0) {
                args.push(arg.length == 1 ? arg[0] : arg);
                arg = [];
            }
            if (next.type == end) {
                return args;
            } 
        } 
        next = tokens[0];
    }
}

function wrapper(start, end) {
    prefix(start, t => node(t.type, getArgs(end), t.line));
    infix(start, 6, (l, t) => node(l, getArgs(end), l.line));
}    

function literal(key) {
    prefix(key, token => node(key, [token.value], token.line));
}

function terminator(op, power=1) {
    infix(op, power, (left, token) => left);
}

prefix('quote', t => node('quote', [expression()], t.line));
literal('#');
literal('boolean');
literal('name');
literal('number'); 
literal('string'); 
prefix('regex', t => node('regex', t.value.split('`').slice(1), t.line));
operator(':', 3, true);
operator('?', 3.5);
operator('=', 4, true);
operator(':=', 4, true);
operator('+=', 4, true);
operator('->', 4.5);
operator('|', 4.8);
operator('==', 5);
operator('!=', 5);
operator('@', 5);
operator('-', 5);
operator('+', 5);
operator(' ', 5);
operator('.', 6);
prefix('(', t => {
    let args = getArgs(')');
    if (args.length == 0 || args.filter(n => n.node != ':')[0]) {
        if (args.length == 1) {
            return args[0];
        }
        return node('Array', args, t.line);
    }
    return node('object', args, t.line);
});
infix('(', 6, (l, t) => node(l, [].concat(getArgs(')')), l.line));
prefix('[', t => {
    let args = getArgs(']');
    if (!args[0] || args.filter(n => n.node != ':')[0]) {
        return node('List', args, t.line);
    }
    return node('OrderedMap', args, t.line);
});
infix('[', 6, (l, t) => node('at', [l].concat(getArgs(']')), l.line));
prefix('{', t => {
    let args = getArgs('}');
    if (!args[0] || args.filter(n => n.node != ':')[0]) {
        return node('List', args, t.line);
    }
    return node('HashMap', args, t.line);
});
infix('{', 6, (l, t) => node('set', [l].concat(getArgs('}')), l.line));

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
        if ([';', 'newline'].indexOf(tokens[0].type) == -1) {
            ast.push(expression()); 
        } else {
            tokens.shift();
        }
    }
    return ast;
}
