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
    leftParen: {
        power: 3,
        infix: (left, token, tokens) => {
            let args = [];
            while (true) {
                let next = tokens[0];
                if (!next) {
                    throw 'expected: , or )';
                } 
                if (['comma', 'rightParen'].indexOf(next.type) == -1) { 
                    args.push(expression(tokens, 3));
                    continue;
                }
                tokens.shift();
                if (next.type == 'rightParen') {
                    return {
                        head: left.args[0], 
                        args: args, 
                        line: left.line
                    };
                }
            }
        }
    },
    rightParen: {},
    comma: {},
    newline: {},
};

function operator(head, power) {
    parselets[head] = {
        power: power,
        infix: (left, token, tokens) => {
            return {
                head: head,
                args: [left, expression(tokens, power)],
                line: token.line
            };
        } 
    };
}

operator('space', 1);
operator('-', 2);
operator('.', 3);
 
function expression(tokens, power=0) {
    let token = tokens.shift();
    let parselet = parselets[token.type];
    if (!parselet) {
        throw token.line + ': could not parse "' + token.type + '"';
    }
    let left = parselet.prefix && parselet.prefix(token);
    let next = parselets[tokens[0] && tokens[0].type];
    while (tokens.length > 0 && power < (next && next.power || 0)) {
        token = tokens.shift();
        left = parselets[token.type].infix(left, token, tokens);
        next = parselets[tokens[0].type];
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
