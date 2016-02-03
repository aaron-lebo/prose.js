let symbols = {};

function symbol(id, prefix, infix, power=0) {
    let sym = symbols[id];
    if (!sym) {
        sym = symbols[id] = {
            id: id,
            prefix: prefix || (t => null),
            infix: infix || (l => {
                throw 'missing operator'
            }),
            power: power
        };
    }
    return sym;
}

function node(head, args, line) {
    return [head, {line: line}].concat(args);
}

function literal(ids) {
    return ids.map(i => { 
        return symbol(i, t => node(i, [t.value], t.line));
    }); 
}

function infix(power, ids, right=false) {
    return (Array.isArray(ids) ? ids : [ids]).map(i => { 
        return symbol(
            i, 
            null, 
            (l, t, ts) => {
                let exp = expression(ts, right ? power - 1 : power);
                return node(i, [l, exp], t.line);
            },
            power 
        ); 
    }); 
}

function infixR(power, ids) {
    return infix(power, ids, true);
}

function getArgs(tokens, end) {
    let token = tokens[0], arg = [], args = [];
    while (token) {
        if ([';', 'newline'].indexOf(token.type) > -1) {
            tokens.shift();
        } else if ([end, ','].indexOf(token.type) > -1) {
            tokens.shift();
            if (arg.length != 0) {
                args.push(arg.length == 1 ? arg[0] : arg);
                arg = [];
            }
            if (token.type == end) {
                return args;
            } 
        } else { 
            arg.push(expression(tokens));
        } 
        token = tokens[0];
    }
}

function container(power, start, end, $0, $1, $2) {    
    return symbol(
        start, 
        (t, ts) => {
            let args = getArgs(ts, end);
            if (args.filter(n => n[0] != ':').length == 0) {
                return $0(t, args);
            }
            return $1(t, args); 
        },
        (l, t, ts) => $2(l, t, getArgs(ts, end)),
        power
    );
}

literal(['#', 'boolean', 'name', 'number', 'string']); 
symbol('regex', t => node('regex', t.value.split('`').slice(1), t.line));
infix(18, '.');
container(18, '[', ']',  
    (t, args) => node('OrderedMap', args, t.line),
    (t, args) => node('List', args. t.line),
    (l, t, args) => node('at', [l].concat(args), t.line)
);
container(18, '{', '}', 
    (t, args) => node('HashMap', args, t.line),
    (t, args) => node('function', args, t.line),
    (l, t, args) => null 
);
container(17, '(', ')', 
    (t, args) => node('object', args, t.line),
    (t, args) => args.length == 1 ? args[0] : node('Array', args, t.line),
    (l, t, args) => node(l, args, t.line)
);
infix(13, ['+', '-']);
infix(10, ['==', '!=']);
infix(7, '&');
infix(6, '|');
infixR(4, '?');
infix(3.5, ' ');
infixR(3, ['=', ':=', '+=', '-=']);
infixR(2, ':');

function expression(tokens, power=0) {
    let token = tokens.shift();
    let sym = symbol(token.type);
    let left = sym.prefix(token, tokens); 
    while (tokens[0] && power < symbol(tokens[0].type).power) {
        token = tokens.shift();
        sym = symbol(token.type); 
        left = sym.infix(left, token, tokens);
    }
    return left;
}

export default function parse(tokens) {
    let ast = [];
    while (tokens[0]) {
        if ([';', 'newline'].indexOf(tokens[0].type) > -1) {
            tokens.shift();
        } else {
            ast.push(expression(tokens)); 
        }
    }
    return ast;
}
