import escodegen from 'escodegen';

function literal(val) {
    return {type: 'Literal', value: val};
}

function id(name) {
    return {type: 'Identifier', name: name};
} 

function block(body) {
    return {type: 'BlockStatement', body: body}; 
}

function statement(type, node) {
    return {type: type + 'Statement', argument: node};
}

function argsOf(node) {
    return node.slice(Array.isArray(node[1]) ? 1 : 2);
}

function member(node, computed=false) {
    let [obj, prop] = argsOf(node).map(convert);
    return {
        type: 'MemberExpression',
        object: obj,
        property: prop,
        computed: computed 
    };
}
 
function call(callee, args) {
    return {type: 'CallExpression', callee: callee, arguments: args};
}
 
function object(node) {
    return {
        type: 'ObjectExpression', 
        properties: argsOf(node).map(n => {
            let [k, v] = argsOf(n).map(convert);
            return {
                type: 'Property',
                key: k,
                value: v,
                kind: 'init'
            };
        })
    };
}
 
function expression(type) {
    return (n, op) => {
        let [left, right] = argsOf(n).map(convert);
        return {
            type: type,
            operator: op || n[0],
            left: left,
            right: right
        };
    };
}    

let assignment = expression('AssignmentExpression');
let binary = expression('BinaryExpression');

let nodes = {
    boolean: n => literal(null), 
    name: n => id(n[2]),
    number: n => literal(parseFloat(n[2])),
    string: n => ({
          type: 'Literal', 
          raw: { 
              content: n[2],
              precedence: escodegen.Precedence.Primary
          }
    }),
    regex: n => literal(RegExp.apply(null, argsOf(n))),
    function: n => {
        let body = n.slice(-1)[0];
        body = body[0] == 'do' ? argsOf(body).map(convert) : [convert(body)];
        body[body.length - 1] = statement('Return', body[body.length - 1]);
        return {
            type: 'FunctionExpression',
            params: n.slice(2, -1).map(convert),
            body: block(body)
        };
    },   
    return: n => statement('Return', convert(n[2])),
    throw: n => statement('Throw', convert(n[2])),
    if: n => {
        let [a, b, c] = n.args.map(convert);
        return {
            type: 'IfStatement',
            test: a,
            consequent: block([b]),
            alternate: c && block([c])
        }
    },      
    '?': n => {
        let [a, b, c] = argsOf(n).map(convert);
        return {
            type: 'ConditionalExpression',
            test: a,
            consequent: b,
            alternate: c || literal(null)
        }
    },      
    for: n => {
        let body = n.slice(-1)[0];
        body = body[0] == 'do' ? argsOf(body).map(convert) : [convert(body)];
        return {
            type: 'WhileStatement',
            test: convert(n[2]),
            body: block(body.map($n => $n.type.endsWith('Expression') 
                ? {type: 'ExpressionStatement', expression: $n} : $n
            ))
        };
    },    
    '|': n => {
        let [left, right] = n.args.map(convert);
        return {
            type: 'LogicalExpression',
            operator: n.node,
            left: left,
            right: right
        }
    },    
    at: n => member(n, true),
    import: n => {
        return {
            type: 'VariableDeclaration',
            declarations: n.args.map($n => {
                let [left, right] = $n.args.map(convert);
                return { 
                    type: 'VariableDeclarator', 
                    id: left, 
                    init: call(id('require'), [right])
                }; 
            }),
            kind: 'let'
        };       
    },
    '+': binary,
    '-': binary,
    '==': n => binary(n, '==='),
    '!=': n => binary(n, '!=='),
    object: n => {
        let args = argsOf(n);
        if (args.length == 1) { 
            let arg = args[0];
            return Array.isArray(arg) ? arg : convert(arg);
        }
        return object(n); 
    },
    Array: n => ({type: 'ArrayExpression', elements: n.slice(2).map(convert)}),      
    HashMap: n => call(id('Immutable.HashMap'), [object(n)]),
    OrderedMap: n => call(id('Immutable.OrderedMap'), [object(n)]),    
    '.': n => member(n), 
    '=': n => {
        let [left, right] = n.slice(2).map(convert);
        return {
            type: 'VariableDeclaration',
            declarations: [{
                type: 'VariableDeclarator', 
                id: left, 
                init: right
            }],
            kind: 'let'
        }
    },
    ':=': n => assignment(n, '='),
    '+=': assignment, 
    default: n => {
        let args = n.args[1].args;
        let body = args.slice(-1)[0].args[1];
        if (body.node == 'object') {
            body = body.args.map(convert);
        } else {
            body = Array.isArray(body) ? body.map(convert) : [convert(body)];
        }
        body[body.length - 1] = statement('Return', body[body.length - 1]);
        return {
            type: 'ExportDefaultDeclaration',
            declaration: {
                type: 'FunctionDeclaration',
                id: convert(args[0]),
                params: args[1].args.slice(0, -1).map(convert),
                body: block(body)
            }
        };
    }
}

function convert(node) {
    let head = node[0]; 
    let parser = nodes[head];
    if (parser) {
        return parser(node);
    }
    return call(
        Array.isArray(head) ? convert(head) : id(head), 
        argsOf(node).map(convert)
    );
}

export default function compile(ast) {
    return escodegen.generate({
        type: 'Program',
        body: [{
            type: 'ImportDeclaration',
            specifiers: [{
                type: 'ImportDefaultSpecifier', 
                id: id('Immutable') 
            }],
            source: literal('immutable') 
        }].concat(ast.map(convert))     
    }, {verbatim: 'raw'});
}
