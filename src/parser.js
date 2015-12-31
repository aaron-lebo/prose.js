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

let parselets = { 
    name: node('name'),
    number: node('number'), 
    regex: node('regex'),
    string: node('string')
};

function terminator(op, power=1) {
    parselets[op] = {
        power: power,
        infix: (left, token, tokens) => {
            if (tokens.length == 0) {
                 return left;
            }
            let right = expression(tokens, power);
            if (left.head == token.head) { 
                left.args = left.args.concat(right);
                return left;
            }
            token.args = [left, right]
            return token; 
        }
    };
}

function operator(op, power) {
    parselets[op] = {
        power: power,
        infix: (left, token, tokens) => {
            return {
                head: op,
                args: [left, expression(tokens, power)],
                line: token.line
            };
        } 
    };
}

function parseArgs(end, tokens) {
    let args = expression(tokens);
    let next = tokens[0];
    if (!next || next.type != end) {
       throw 'expected ' + end;
    } 
    tokens.shift();
    return args;
}

function wrapper(start, end) {
    parselets[start] =  {
        power: 7,
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
    parselets[end] = {};
}    

terminator(',', 1);
terminator('newline');
terminator(';');
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
