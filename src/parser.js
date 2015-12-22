let prefixes = { 
    name: {
        parse: token => {
            return token;
        }
    },
    number: {
        parse: token => {
            return token;
        }
    },
    string: {
        parse: token => {
            return token;
        }
    },
    newline: { 
        parse: token => {
            return;
        }
    },
    whitespace: {
        parse: token => {
            return token;
        }
    }
};

let infixes = { 
    leftParen: {
        parse: (tokens, left, token) => {
            let next,
                args = [];
            while (true) {
                next = tokens.shift();
                if (!next) {
                    throw 'expected: , or )';
                } 
                if (next.type == 'rightParen') {
                    return [left.value, left, args];
                }
                if ('comma' != next.type) {
                    args.push(next);
                }
           }
        }
    }
};

function parseX(tokens) {
    let token = tokens.shift(),
        prefix = prefixes[token.type];
    if (!prefix) {
        throw 'line ' + token.line + ': could not parse "' + token.value + '"';
    }
    let left = prefix.parse(token);
    token = tokens[0] || {};
    let infix = infixes[token.type];
    if (!infix) {
         return left;
    }
    tokens.shift();
    return infix.parse(tokens, left, token);
}

export default function parse(tokens) {
    let token, 
        ast = [];
    while (tokens.length > 0) {
        token = parseX(tokens);
        if (token) {
            ast.push(token);
        }
    }
    return ast;
}
