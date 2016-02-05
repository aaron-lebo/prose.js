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
    return {type: type + 'Statement', argument: convert(node[2])};
}

function argsOf(node) {
    return node.slice(Array.isArray(node[1]) ? 1 : 2);
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
    return: n => statement('Return', n),
    throw: n => statement('Throw', n),
    if: n => {
        let [a, b, c] = n.args.map(convert);
        let exp = {
            type: 'IfStatement',
            test: a,
            consequent: block([b]),
            alternate: c && block([c])
        }
        return exp;  
    },      
    '?': n => {
        let [a, b, c] = argsOf(n).map(convert);
        let exp = {
            type: 'ConditionalExpression',
            test: a,
            consequent: b,
            alternate: c || literal(null)
        }
        return exp;  
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
    at: n => {
        let [left, right] = argsOf(n).map(convert);
        return {
            type: 'MemberExpression',
            object: left,
            property: right,
            computed: true 
        }
    },
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
    '==': n => binary(n, '==='),
    '!=': n => binary(n, '!=='),
    object: n => {
        let args = n.args;
        if (args.length == 1) { 
            let arg = args[0];
            return Array.isArray(arg) ? arg : convert(arg);
        }
        return object(n); 
    },
    '(': n => call(convert(n[0]), argsOf(n).map(convert)),
    Array: n => ({type: 'ArrayExpression', elements: n.slice(2).map(convert)}),      
    HashMap: n => call(id('Immutable.HashMap'), [object(n)]),
    OrderedMap: n => call(id('Immutable.OrderedMap'), [object(n)]),    
    '.': n => {
        let [left, right] = n.slice(2).map(convert);
        return {
            type: 'MemberExpression',
            object: left,
            property: right,
            computed: false 
        }
    },
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
 
function convert(ast) {
    let head = ast[0];
    return (nodes[head] || nodes[head[2]] || nodes['('])(ast); 
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
