function node(head) {
    return {
        prefix: (token, tokens) => {
            return {
                head: head, 
                args: [token.value], 
                line: token.line
            };
        }
    }
}

function parseArgs(end, tokens) {
    let args = [];
    while (true) {
        let next = tokens[0];
        if (!next) {
           throw 'expected: , or ' + end;
        } 
        if ([',', end].indexOf(next.type) == -1) { 
            args.push(expression(tokens, 0));
            continue;
        }
        tokens.shift();
        if (next.type == end) {
            return args;
        }
    }     
}

function wrapper(end) {
    return {
        power: 5,
        prefix: (token, tokens) => {
            return {
                head: token.type, 
                args: parseArgs(end, tokens), 
                line: token.line
            };
        },
        infix: (left, token, tokens) => {
            return {
                head: left, 
                args: parseArgs(end, tokens), 
                line: left.line
            };
        }
    };
}    

let parselets = { 
    name: node('name'),
    number: node('number'), 
    string: node('string'),
    '(': wrapper(')'), 
    '[': wrapper(']'), 
    '{': wrapper('}'), 
    ')': {},
    ',': {}
};

function operator(head, power, infix) {
    parselets[head] = {
        power: power,
        infix: infix ? infix : (left, token, tokens) => {
            return {
                head: head,
                args: [left, expression(tokens, power)],
                line: token.line
            };
        } 
    };
}

function terminator(left, token, tokens) {
    if (tokens.length == 0) {
        return left;
    }
    return [left, expression(tokens, 0.5)];
}

operator(';', 1, terminator);
operator('newline', 1, terminator);
operator(':', 2);
operator('=', 3);
operator(':=', 3);
operator(' ', 4);
operator('-', 5);
operator('+', 5);
operator('.', 6);
 
function expression(tokens, power=0) {
    let token = tokens.shift();
    let parselet = parselets[token.type];
    if (!parselet) {
        throw token.line + ': could not parse "' + token.type + '"';
    }
    let left = parselet.prefix && parselet.prefix(token, tokens);
    let next = parselets[tokens[0] && tokens[0].type];
    while (tokens.length > 0 && power < (next && next.power || 0)) {
        token = tokens.shift();
        left = parselets[token.type].infix(left, token, tokens);
        next = parselets[tokens[0] && tokens[0].type];
    }
    return left;
}

export default function parse(tokens) {
    let ast = [];
    while (tokens.length > 0) {
        let node = expression(tokens);
        if (node) {
            ast.push(node);
        }
    }
    return ast;
}
