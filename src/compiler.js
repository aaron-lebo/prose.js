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
            body = body.args[0].map(convert);
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
    '->': n => nodes.do(n),
    'return': n => {
        return {
            type: 'ReturnStatement',
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
        if (a.type == 'VariableDeclaration') {
            return literal(null);
        }
        return exp;  
    },      
    '?': n => nodes.if(n),    
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
        n.node = '===';
        return nodes['+'](n);
    }, 
    '!=': n => nodes['+'](n), 
    'object': n => {
        let args = n.args;
        if (args.length == 1) { 
            return Array.isArray(args[0]) ? args[0] : convert(args[0]);
        }
        return { 
            type: 'SequenceExpression',
            expressions: args.map(convert)
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
    '[': n => {
        return {
            type: 'CallExpression',
            callee: {type: 'Identifier', name: 'Immutable.Array'},
            arguments: n.args.map(convert)
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
        }
    },
    '+=': n => nodes[':='](n),
    ':': n => {
        let [left, right] = n.args.map(convert);
        left.node = 'exports.' + left.node;
        return {
            type: 'AssignmentExpression',
            operator: '=', 
            left:  left,
            right: right
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
    let $ast = []
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

export default function compile(ast) {
    return escodegen.generate({
        type: 'Program',
        body: stripComments(ast).map(convert) 
    });
}
