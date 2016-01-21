import escodegen from 'escodegen';

function literal(val) {
    return {
        type: 'Literal',
        value: val 
    };
}
 
let nodes = {
    'boolean': n => literal(null), 
    'name': n => {
        return {
            type: 'Identifier',
            name: n.args[0]
        }
    },
    'number': n => literal(parseFloat(n.args[0])),
    'string': n => literal(n.args[0]),
    'regex': n => literal(RegExp(n.args[0])),
    'do': n => {
        let body = n.args.slice(-1)[0];
        if (body.node == 'object') {
            body = body.args.map(convert);
        } else {
            body = Array.isArray(body) ? body.map(convert) : [convert(body)];
        }
        body[body.length - 1] = {
            type: 'ReturnStatement',
            argument: body[body.length - 1]
        }
        return {
            type: 'FunctionExpression',
            params: n.args.slice(0, -1).map(convert),
            body: {
                type: 'BlockStatement', 
                body: body
            }
        };
    },   
    '->': n => {
        let [param, body] = n.args;
        body = Array.isArray(body) ? body.map(convert) : [convert(body)];
        body[body.length - 1] = {
            type: 'ReturnStatement',
            argument: body[body.length - 1]
        }
        return {
            type: 'FunctionExpression',
            params: [convert(param)],
            body: {
                type: 'BlockStatement', 
                body: body
            }
        };
    },    
    'return': n => {
        return {
            type: 'ReturnStatement',
            argument: convert(n.args[0]) 
        };
    },    
    'throw': n => {
        return {
            type: 'ThrowStatement',
            argument: convert(n.args[0]) 
        };
    },
    'if': n => {
        let [a, b, c] = n.args.map(convert);
        let exp = {
            type: 'ConditionalExpression',
            test: a,
            consequent: b,
            alternate: c || literal(null)
        }
        return exp;  
    },      
    '?': n => nodes.if(n),            
    'for': n => {
        let body = n.args.slice(-1)[0];
        body = Array.isArray(body) ? body.map(convert) : [convert(body)];
        return {
            type: 'WhileStatement',
            body: {
                type: 'BlockStatement', 
                body: body
            },
            test: convert(n.args[0])
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
    'at': n => {
        let [left, right] = n.args.map(convert);
        return {
            type: 'MemberExpression',
            object: left,
            property: right,
            computed: true 
        }
    },
    '@': n => nodes.at(n),
    'import': node => {
        return {
            type: 'VariableDeclaration',
            declarations: node.args.map(n => {
                let [left, right] = n.args.map(convert);
                return { 
                    type: 'VariableDeclarator', 
                    id: left, 
                    init: {
                        type: 'CallExpression',
                        callee: {type: 'Identifier', name: 'require'},
                        arguments: [right]
                    }
                }; 
            }),
            kind: 'let'
        };       
    },
    '+': n => {
        let [left, right] = n.args.map(convert);
        return {
            type: 'BinaryExpression',
            operator: n.node,
            left: left,
            right: right
        }
    },    
    '-': n => nodes['+'](n), 
    '==': n => {
        let [left, right] = n.args.map(convert);
        return {
            type: 'BinaryExpression',
            operator: '===',
            left: left,
            right: right
        }
    },    
 
    '!=': n => { 
        n.node = '!==';
        return nodes['+'](n);
    },
    'object': n => {
        let args = n.args;
        if (args.length == 1) { 
            let arg = args[0];
            return Array.isArray(arg) ? arg : convert(arg);
        }
        return {
            type: 'ObjectExpression', 
            properties: args.map($n => {
                let [left, right] = $n.args.map(convert);
                return {
                    type: 'Property',
                    key: left,
                    value: right,
                    kind: 'init'
                };
            })
        };
    },
    '(': n => {
        return {
            type: 'CallExpression',
            callee: convert(n.node),
            arguments: n.args.map($n => { 
                if (Array.isArray($n)) { 
                    return {
                        type: 'SequenceExpression', 
                        expressions: $n.map(convert)
                    };
                } 
                if ($n.node == ':') {
                    $n.node = ':=';
                    return nodes[':=']($n);
                }
                return convert($n);
            }) 
        }
    },
    'List': n => {
        return {
            type: 'CallExpression',
            callee: {type: 'Identifier', name: 'Immutable.List'},
            arguments: n.args.map(convert)
        }
    },      
    'HashMap': n => {
        return {
            type: 'CallExpression',
            callee: {
                type: 'Identifier', 
                name: 'Immutable.HashMap'
            },
            arguments: [{
                type: 'ObjectExpression', 
                properties: n.args.map($n => {
                    let args = $n.args.map(convert);
                    return {
                        type: 'Property',
                        key: args[0],
                        value: args[1],
                        kind: 'init'
                    };
                })
            }]
        }
    },    
    'OrderedMap': n => {
        return {
            type: 'CallExpression',
            callee: {
                type: 'Identifier', 
                name: 'Immutable.OrderedMap'
            },
            arguments: [{
                type: 'ObjectExpression', 
                properties: n.args.map($n => {
                    let args = $n.args.map(convert);
                    return {
                        type: 'Property',
                        key: args[0],
                        value: args[1],
                        kind: 'init'
                    };
                })
            }]
        }
    },    
    '{': n => {
        return {
            type: 'CallExpression',
            callee: {type: 'Identifier', name: 'Immutable.HashMap'},
            arguments: n.args.map($n => { 
                if (Array.isArray($n)) { 
                    return {
                        type: 'SequenceExpression', 
                        expressions: $n.map(convert)
                    };
                } 
                if ($n.node == ':') {
                    $n.node = '=';
                    return nodes['=']($n);
                }
                return convert($n);
            }) 
        }
    },
    ' ': n => {
        let [left, right] = n.args;
        if (['.', 'name'].indexOf(right.node.node) == -1) {
            return convert({node: right, args: [left]});
        }
        right.args.splice(0, 0, left);
        return convert(right);
    },
    '.': n => {
        let [left, right] = n.args.map(convert);
        return {
            type: 'MemberExpression',
            object: left,
            property: right,
            computed: false 
        }
    },
    '=': n => {
        let [left, right] = n.args.map(convert);
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
    ':=': n => {
        let [left, right] = n.args.map(convert);
        n.node = '=';
        return {
            type: 'AssignmentExpression',
            operator: n.node, 
            left: left, 
            right: right
        };
    },
    '+=': n => {
        let [left, right] = n.args.map(convert);
        return {
            type: 'AssignmentExpression',
            operator: n.node, 
            left: left, 
            right: right
        };
    },
    ':': n => {
        let [left, right] = n.args[1].args;
        left.args[0] = 'exports.' + left.args[0];
        return {
            type: 'AssignmentExpression',
            operator: '=', 
            left: convert(left), 
            right: convert(right)
        }
 
    },
}

function convert(ast) {
    if (typeof(ast.node) == 'string') {
        return nodes[ast.node](ast);
    } 
    let args = ast.node.args;
    let node = nodes[args && args[0]] || nodes['('];
    return node(ast); 
}

function stripComments(ast) { 
    let $ast = [];
    for (let node of ast) {
        if (Array.isArray(node)) {
            node = stripComments(node); 
        }
        if (node.args) {
            node.args = stripComments(node.args);
        } 
        if (node.node != '#') {
            $ast.push(node);
        }
    }
    return $ast;
}

function liftStatements(ast) { 
    let $ast = [];
    for (let node of ast) {
        if (Array.isArray(node)) {
            node = liftStatements(node); 
        }
        if (node.args) {
            if (node.node == '->') {
                let body = node.args[1];
                if (!Array.isArray(body)) {
                    node.args[1] = body.args.map(n => {
                        return n;
                    });
                }
            }
            node.args = liftStatements(node.args);
        } 
        $ast.push(node);
    }
    return $ast;
}

export default function compile(ast) {
    return escodegen.generate({
        type: 'Program',
        body: liftStatements(stripComments(ast)).map(convert)     
    });
}
