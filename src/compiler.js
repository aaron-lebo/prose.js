import escodegen from 'escodegen';

let nodes = {
    'boolean': n => {
        return {
            type: 'Literal',
            value: null 
        };
    },
    'name': node => {
        return {
            type: 'Identifier',
            name: node.args[0]
        }
    },
    'number': node => {
        return {
            type: 'Literal',
            value: parseFloat(node.args[0])
        }
    },       
    'string': node => {
        return {
            type: 'Literal',
            value: node.args[0]
        }
    },   
    'do': node => {
        let body = node.args.slice(-1)[0];
        return {
            type: 'FunctionExpression',
            params: node.args.slice(0, -1).map(convert),
            body: {
                type: 'BlockStatement', 
                body: Array.isArray(body) ? body.map(convert) : [convert(body)]
            }
        }
    },
    'if': n => {
        let [a, b, c] = n.args.map(convert);
        return {
            type: 'ConditionalExpression',
            test: a,
            consequent: b,
            alternate: c
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
            operator: '+',
            left: left,
            right: right
        }
    },    
    '->': node => {
        let body = node.args[1];
        return {
            type: 'FunctionExpression',
            params: [convert(node.args[0])],
            body: {
                type: 'BlockStatement', 
                body: Array.isArray(body) ? body.map(convert) : [convert(body)]
            }
        }
    },
    '(': n => {
        if (n.node == '(') {
            let args = n.args[0];
            if (Array.isArray(args)) { 
                return {
                    type: 'SequenceExpression', 
                    expressions: args.map(convert)
                };
            } 
            return convert(args);
        }
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
                return convert($n);
            }) 
        }
    },
    '[': node => {
        return {
            type: 'CallExpression',
            callee: {type: 'Identifier', name: 'Immutable.Array'},
            arguments: node.args.map(convert)
        }
    },
    ' ': node => {
        let [left, right] = node.args;
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
    '=': node => {
        let [left, right] = node.args;
        return {
            type: 'VariableDeclaration',
            declarations: [{
                type: 'VariableDeclarator', 
                id: convert(left), 
                init: convert(right)
            }],
            kind: 'let'
        }
    },
    ':=': node => {
        let [left, right] = node.args;
        return {
            type: 'AssignmentExpression',
            operator: '=', 
            left: convert(left), 
            right: convert(right)
        }
    }
}

function convert(ast) {
    if (typeof(ast.node) == 'string') {
        return nodes[ast.node](ast);
    } 
    let args = ast.node.args;
    let node = nodes[args && args[0]] || nodes['('];
    return node(ast); 
}

function filter(nodes) {
    return nodes.filter(n => n.node != '#');
}

function stripComments(ast) { 
    if (Array.isArray(ast)) {
        return filter(ast);
    }
    if (ast.args) {
        ast.args = filter(ast.args).map(stripComments);
    } 
    return ast;
}

export default function compile(ast) {
    let $ast = stripComments(ast);
    return escodegen.generate({
        type: 'Program',
        body: Array.isArray($ast) ? $ast.map(convert) : [convert(Rast)] 
    });
}
