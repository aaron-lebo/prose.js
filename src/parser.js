function node(head) {
    return {
        prefix: t => {
            return {
                head: head, 
                args: [t.value], 
                line: t.line
            };
        }
    }
}

let parselets = { 
    name: node('name'),
    number: node('number'), 
    string: node('string'),
    newline: {},
    leftParen: {
        power: 1,
        infix: (tokens, left, token) => {
            let args = [];
            while (true) {
                let next = tokens[0];
                if (!next) {
                    throw 'expected: , or )';
                } 
                if (next.type == 'rightParen') {
                    return {head: left.args[0], args: args, line: left.line};
                }
                if ('comma' != next.type) {
                    args.push(expression(tokens, 1));
                } else {
                    tokens.shift();
                }
           }
        }
    },
    rightParen: {},
    comma: {},
};

function expression(tokens, power=0) {
    let token = tokens.shift();
    let parselet = parselets[token.type];
    if (!parselet) {
        throw token.line + ': could not parse "' + token.type + '"';
    }
    let left = parselet.prefix && parselet.prefix(token);
    while (tokens.length > 0 && power < (parselets[tokens[0].type].power || 0)) {
        token = tokens.shift();
        left = parselets[token.type].infix(tokens, left, token);
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
