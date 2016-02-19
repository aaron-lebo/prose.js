import Immutable from 'immutable';
let symbols = {};
let symbol = function (id, prefix, infix, power) {
    return symbols[id] || (symbols[id] = {
        id: id,
        prefix: prefix || function (t) {
            return null;
        },
        infix: infix || function (l) {
            throw 'missing operator';
        },
        power: power || 0
    });
};
let node = function (head, args, x) {
    return [
        head,
        { x: x }
    ].concat(args);
};
let literal = function (ids) {
    return ids.map(function (i) {
        return symbol(i, function (t) {
            return node(i, [t.value], t.line);
        });
    });
};
let infix = function (ids, power, right) {
    return (Array.isArray(ids) ? ids : new Array(ids)).map(function (i) {
        return symbol(i, null, function (l, t, ts) {
            return node(i, [
                l,
                expression(ts, right ? power - 1 : power)
            ], t.line);
        }, power);
    });
};
let infixR = function (ids, power) {
    return infix(ids, power, true);
};
let getArgs = function (start, tokens, end) {
    let arg = [];
    let args = [];
    let token = tokens[0];
    while (token) {
        let cont = false;
        if ([
                ';',
                'newline'
            ].indexOf(token.type) !== -1) {
            cont = true;
            tokens.shift();
        }
        if ([
                end,
                ','
            ].indexOf(token.type) !== -1) {
            cont = true;
            tokens.shift();
            if (arg.length !== 0) {
                args.push(arg.length === 1 ? arg[0] : new Array('do').concat(arg));
                arg = [];
            }
            if (token.type === end)
                return args;
        }
        !cont ? arg.push(expression(tokens)) : null;
        token = tokens[0];
    }
    throw start.line + ': ' + start.value + ' not closed';
};
let wrap = function (ends, power, fun, fun1, fun2) {
    let [
        start,
        end
    ] = ends;
    return symbol(start, function (t, ts) {
        let args = getArgs(t, ts, end);
        if (args.length === 0 || args.filter(function (n) {
                return n[0] !== ':';
            }).length !== 0)
            return fun(t, args);
        return fun1(t, args);
    }, function (l, t, ts) {
        return fun2(l, t, getArgs(t, ts, end));
    }, power);
};
literal([
    '#',
    'boolean',
    'name',
    'number',
    'string'
]);
symbol('regex', function (t) {
    return node('regex', t.value.split('`').slice(1), t.line);
});
infixR(':', 5);
infixR([
    '=',
    ':=',
    '+=',
    '-='
], 10);
infixR('?', 20);
infix([
    '&',
    '|'
], 30);
symbol(' ', null, function (l, t, ts) {
    let exp = expression(ts, 35);
    if ([
            '.',
            'name'
        ].indexOf(exp[0]) > -1 || [
            '.',
            'name'
        ].indexOf(exp[0][2]) > -1)
        return [
            exp,
            l
        ];
    exp.splice(2, 0, l);
    return exp;
}, 35);
infix([
    '==',
    '!=',
    '<',
    '>'
], 40);
infix([
    '+',
    '-'
], 50);
infix([
    '*',
    '/'
], 60);
infix('.', 80);
wrap([
    '[',
    ']'
], 80, function (t, args) {
    return node('List', args, t.line);
}, function (t, args) {
    return node('OrderedMap', args, t.line);
}, function (l, t, args) {
    let $args = new Array();
    $args.push(l);
    return node('at', $args.concat(args), t.line);
});
wrap([
    '{',
    '}'
], 80, function (t, args) {
    return node('function', args, t.line);
}, function (t, args) {
    return node('HashMap', args, t.line);
});
wrap([
    '(',
    ')'
], 80, function (t, args) {
    return args.length === 1 ? args[0] : node('Array', args, t.line);
}, function (t, args) {
    return node('Obj', args, t.line);
}, function (l, t, args) {
    return node(l, args, t.line);
});
let expression = function (tokens, power) {
    let token = tokens.shift();
    let sym = symbol(token.type);
    let left = sym.prefix(token, tokens);
    while (tokens[0] && (power || 0) < symbol(tokens[0].type).power) {
        token = tokens.shift();
        sym = symbol(token.type);
        left = sym.infix(left, token, tokens);
    }
    return left;
};
export default function parse(tokens) {
    let ast = [];
    while (tokens[0]) {
        [
            ';',
            'newline'
        ].indexOf(tokens[0].type) !== -1 ? tokens.shift() : ast.push(expression(tokens));
    }
    return ast;
}
