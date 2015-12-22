function node(head) {
    return {
        parse: token => {
            return {
                head: head, 
                args: [token.value], 
                line: token.line
            };
        }
    }
}

let prefixes = { 
    name: node('name'),
    number: node('number'), 
    string: node('string'),
    newline: { 
        parse: token => {} 
    }
};

let infixes = { 
    leftParen: {
        parse: (tokens, left, token) => {
            let args = [];
            while (true) {
                let next = tokens.shift();
                if (!next) {
                    throw 'expected: , or )';
                } 
                if (next.type == 'rightParen') {
                    return {head: left.args[0], meta: left, args: args};
                }
                if ('comma' != next.type) {
                    args.push(prefixes[next.type].parse(next));
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
    let ast = [];
    while (tokens.length > 0) {
        let token = parseX(tokens);
        if (token) {
            ast.push(token);
        }
    }
    return ast;
}
