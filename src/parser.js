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
            return token;
        }
    },
    whitespace: {
        parse: token => {
            return token;
        }
    }

};
let infixes = {};

function parseX(tokens) {
    let token = tokens.shift(),
        prefix = prefixes[token.type];
    if (!prefix) {
        throw 'line ' + token.line + ': could not parse "' + token.value + '"';
    }
    let left = prefix.parse(token);
    token = tokens[1] || {};
    let infix = infixes[token.type];
    if (!infix) {
         return left;
    }
    tokens.shift();
    return infix.parse(left, token);
}

export default function parse(tokens) {
    while (tokens.length > 0) {
        console.log(parseX(tokens));
    }
}
