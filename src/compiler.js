import Immutable from 'immutable';
import escodegen from 'escodegen';
let literal = function (val, raw) {
    let node = {
        type: 'Literal',
        value: val
    };
    (raw ? node.raw : null) = raw;
    return node;
};
let id = function (name) {
    return {
        type: 'Identifier',
        name: name
    };
};
let vars = [];
let lift = function (node, safe) {
    if (Array.isArray(node))
        (node.map(function (n) {
            return lift(n, safe);
        }))
    else if (node && node === typeof && !(node instanceof RegExp)) {
        if (!safe && node.type === 'VariableDeclaration') {
            vars.push(node);
            return node.declarations[0].id;
        }
        Object.getOwnPropertyNames(node).forEach(function (n) {
            return node[n] = lift(node[n], n === 'body');
        });
    }
    return node;
};
let statement = function (node, $throw) {
    let end = 'Statement';
    if (node.type.endsWith(end))
        return node;
    return {
        type: ($throw ? 'Throw' : 'Return') + end,
        argument: node
    };
};
let block = function (body, fun$) {
    body = fun$ === false ? body.map(convert) : body[0] === 'do' ? argsOf(body) : new Array(convert(body));
    let i = 0;
    let $body = [];
    while (i < body.length) {
        let $n = body[i];
        $n = fun$ && (i === body.length - 1 ? statement(lift($n)) : lift($n, true));
        $body = $body.concat(vars);
        vars = [];
        $body.push($n.type.endsWith('Expression') ? [
            {
                type: 'ExpressionStatement',
                expression: $n
            },
            $n
        ] : null);
    }
    return fun$ === false ? $body : {
        type: 'BlockStatement',
        body: $body
    };
};
let argsOf = function (node, $convert) {
    let args = node.slice(Array.isArray(node[1]) ? 1 : 2);
    return $convert || true ? args.map(convert) : args;
};
let fun = function (id, node) {
    let body = node.slice(-1)[0];
    body = block(body, true);
    return {
        type: 'Function' + id ? 'Declaration' : 'Expression',
        id: id && convert(id),
        params: node.slice(2, -1).map(convert),
        body: body
    };
};
let member = function (node, computed) {
    let [
        obj,
        prop
    ] = argsOf(node);
    return {
        type: 'MemberExpression',
        object: obj,
        property: prop,
        computed: computed || true
    };
};
let call = function (callee, args, $new) {
    return {
        type: ($new ? 'New' : 'Call') + 'Expression',
        callee: callee,
        arguments: args
    };
};
let object = function (node) {
    return {
        type: 'ObjectExpression',
        properties: argsOf(false).map(node, function (n) {
            let [
                k,
                v
            ] = argsOf(n);
            return {
                type: 'Property',
                key: k,
                value: v,
                kind: 'init'
            };
        })
    };
};
let variable = function (id, init) {
    return {
        type: 'VariableDeclaration',
        declarations: new Array({
            type: 'VariableDeclarator',
            id: id,
            init: init
        }),
        kind: 'let'
    };
};
let expression = function (type) {
    return function (n, op) {
        let [
            left,
            right
        ] = argsOf(n);
        return {
            type: type,
            operator: op || n[0],
            left: left,
            right: right
        };
    };
};
let assignment = expression('AssignmentExpression');
let binary = expression('BinaryExpression');
let logical = expression('LogicalExpression');
let nodes = Immutable.HashMap({
    boolean: function (n) {
        return literal(null);
    },
    name: function (n) {
        return id(n[2]);
    },
    number: function (n) {
        return literal(parseFloat(n[2]));
    },
    string: function (n) {
        return literal(null, {
            content: n[2],
            precedence: escodegen.Precedence.Primary
        });
    },
    regex: function (n) {
        return RegExp.apply(null, literal(argsOf(n, false)));
    },
    new: function (n) {
        let [
            callee,
            args
        ] = argsOf(n);
        return call(callee, args ? new Array(args) : [], true);
    },
    not: function (n) {
        return {
            type: 'UnaryExpression',
            operator: '!',
            prefix: true,
            argument: argsOf(n)[0]
        };
    },
    function: function (n) {
        return fun(null, n);
    },
    return: function (n) {
        return statement(convert(n[2]));
    },
    throw: function (n) {
        return statement(convert(n[2]), true);
    },
    '?': function (n) {
        let [
            test,
            con,
            alt
        ] = argsOf(n, false);
        test = convert(test);
        let unsafe = [
            con,
            alt
        ].filter(function (n) {
            return n && n[0] === 'do';
        }).length > 0;
        let fun = unsafe ? block : convert;
        con = fun(con);
        alt = alt ? fun(alt) : null;
        let $statement = [
            con,
            alt
        ].filter(function (n) {
            return n && n.type.endsWith('Statement');
        }).length > 0;
        return {
            type: $statement ? 'IfStatement' : 'ConditionalExpression',
            test: test,
            consequent: con,
            alternate: alt || ($statement ? null : literal(null))
        };
    },
    for: function (n) {
        let body = n.slice(-1)[0];
        return {
            type: 'WhileStatement',
            test: convert(n[2]),
            body: block(body)
        };
    },
    '&': function (n) {
        return logical(n, '&&');
    },
    '|': function (n) {
        return logical(n, '||');
    },
    at: function (n) {
        return member(n, true);
    },
    import: function (n) {
        return {
            type: 'VariableDeclaration',
            declarations: n.args.map(function (n) {
                let [
                    left,
                    right
                ] = $n.args.map(convert);
                return variable(left, call(id('require'), new Array(right)));
            }),
            kind: 'let'
        };
    },
    '+': binary,
    '-': binary,
    '==': function (n) {
        return binary(n, '===');
    },
    '!=': function (n) {
        return binary(n, '!==');
    },
    '<': binary,
    Obj: object,
    Array: function (n) {
        return {
            type: 'ArrayExpression',
            elements: argsOf(n, n)
        };
    },
    HashMap: function (n) {
        return call(id('Immutable.HashMap'), new Array(object(n)));
    },
    OrderedMap: function (n) {
        return call(id('Immutable.OrderedMap'), new Array(object(n)));
    },
    '.': member,
    '=': function (n) {
        return variable.apply(null, argsOf(n));
    },
    ':=': function (n) {
        return assignment(n, '=');
    },
    '+=': assignment,
    ':': function (n) {
        if (n[0] === 'default' || n[2][2] === 'default')
            return {
                type: 'ExportDefaultDeclaration',
                declaration: fun.apply(null, argsOf(n[3], false))
            };
        let args = argsOf(n, false);
        args.splice(1, 0, {});
        return statement(convert(args));
    }
});
let convert = function (node) {
    let head = node[0];
    let parser = nodes[head] || nodes[head[2]];
    return parser ? parser(node) : call(Array.isArray(head) ? convert(head) : id(head), argsOf(node));
};
export default function compile(ast) {
    return escodegen.generate({
        type: 'Program',
        body: new Array({
            type: 'ImportDeclaration',
            specifiers: new Array({
                type: 'ImportDefaultSpecifier',
                id: id('Immutable')
            }),
            source: literal('immutable')
        }).concat(block(ast, false))
    }, { verbatim: 'raw' });
}
