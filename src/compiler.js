import escodegen from 'escodegen';

function literal(val) {
    return {type: 'Literal', value: val};
}

function id(name) {
    return {type: 'Identifier', name: name};
} 

function argsOf(node) {
    return node.slice(Array.isArray(node[1]) ? 1 : 2);
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
    'boolean': n => literal(null), 
    'name': n => id(n[2]),
    'number': n => literal(parseFloat(n[2])),
    'string': n => ({
          type: 'Literal', 
          raw: { 
              content: n[2],
              precedence: escodegen.Precedence.Primary
          }
    }),
    'regex': n => literal(RegExp.apply(null, argsOf(n))),
    'function': n => {
        let body = n.slice(-1)[0];
        body = body[0] == 'do' ? argsOf(body).map(convert) : [convert(body)];
        body[body.length - 1] = {
            type: 'ReturnStatement',
            argument: body[body.length - 1]
        }
        return {
            type: 'FunctionExpression',
            params: n.slice(2, -1).map(convert),
            body: {
                type: 'BlockStatement', 
                body: body
            }
        };
    },   
    'return': n => ({
        type: 'ReturnStatement',
        argument: convert(n[2]) 
    }),
    'throw': n => ({
        type: 'ThrowStatement',
        argument: convert(n[2]) 
    }),
    'if': n => {
        let [a, b, c] = n.args.map(convert);
        let exp = {
            type: 'IfStatement',
            test: a,
            consequent: {type: 'BlockStatement', body: [b]},
            alternate: c && {type: 'BlockStatement', body: [c]}
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
    'for': n => {
        let body = n.slice(-1)[0];
        body = body[0] == 'do' ? argsOf(body).map(convert) : [convert(body)];
        return {
            type: 'WhileStatement',
            test: convert(n[2]),
            body: {
                type: 'BlockStatement', 
                body: body.map($n => $n.type.endsWith('Expression') 
                    ? {type: 'ExpressionStatement', expression: $n} : $n
                )
            }
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
        let [left, right] = argsOf(n).map(convert);
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
                        callee: id('require'),
                        arguments: [right]
                    }
                }; 
            }),
            kind: 'let'
        };       
    },
    '+': binary,
    '==': n => binary(n, '==='),
    '!=': n => binary(n, '!=='),
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
    '(': n => ({
        type: 'CallExpression',
        callee: convert(n[0]),
        arguments: argsOf(n).map(convert)
    }),
    'Array': n => ({
        type: 'ArrayExpression',
        elements: n.slice(2).map(convert)
    }),      
    'HashMap': n => {
        return {
            type: 'CallExpression',
            callee: id('Immutable.HashMap'),
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
    OrderedMap: n => ({ 
        type: 'CallExpression',
        callee: id('Immutable.OrderedMap'),
        arguments: [{
            type: 'ObjectExpression', 
            properties: argsOf(n).map($n => {
                let [k, v] = argsOf($n).map(convert);
                return {
                    type: 'Property',
                    key: k,
                    value: v,
                    kind: 'init'
                };
            })
        }]
    }),    
    '{': n => ({
        type: 'CallExpression',
        callee: id('Immutable.HashMap'),
        arguments: n.slice(2).map($n => { 
            if (Array.isArray($n)) { 
                return {
                    type: 'SequenceExpression', 
                    expressions: $n.map(convert)
                };
            } 
            if ($n[0] == ':') {
                $n[0] = '=';
                return nodes['=']($n);
            }
            return convert($n);
        }) 
    }),
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
    'default': n => {
        let args = n.args[1].args;
        let body = args.slice(-1)[0].args[1];
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
            type: 'ExportDefaultDeclaration',
            declaration: {
                type: 'FunctionDeclaration',
                id: convert(args[0]),
                params: args[1].args.slice(0, -1).map(convert),
                body: {
                    type: 'BlockStatement', 
                    body: body
                }
            }
        };
    }
}
 
function convert(ast) {
    let head = ast[0];
    return (nodes[head] || nodes[head[2]] || nodes['('])(ast); 
}

function stripComments(ast) { 
    return ast;
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

function liftStatements(ast, block=false) { 
    return [ast, statements];
    let $ast = [];
    let statements = [];
    let res;
    for (let node of ast) {
        if (Array.isArray(node)) {
            res = liftStatements(node, block); 
            node = res[0];
            statements = statements.concat(res[1]);
        } else if (block && node.node == ':') {
            node.node = 'default';
            res = liftStatements(node.args[1].args[1].args, block); 
            node.args[1].args[1].args = res[0];
            statements = statements.concat(res[1]);
        } else if (node.node == '->') { 
            let arg = node.args[1];
            res = liftStatements(Array.isArray(arg) ? arg : [arg], true); 
            node.args[1] = res[0];
            statements = statements.concat(res[1]);
        } else if (node.node == '?') {
            res = liftStatements(node.args.slice(1), true); 
            if (res[1][0]) {
                node.node = 'if';
            }
            res = liftStatements(node.args.slice(0, 1)); 
            statements = statements.concat(res[1]);
        } else if (node.node && node.node.args && node.node.args[0] == 'for') {
            res = liftStatements(node.args[1], true); 
            node.args[1] = res[0];
        } else if (node.args) {
            res = liftStatements(node.args); 
            node.args = res[0];
            statements = statements.concat(res[1]);
        }        
        if (!block && node.node == '=') {
            statements.push(node);
            node = node.args[0];
        } else if (node.node == '+=') {
            statements.push(node);
        } else if (node.node && node.node.args && node.node.args[0] == 'throw') {
            statements.push(node);
        } else if (node.node && node.node.args && node.node.args[0] == 'return') {
            statements.push(node);
        } else if (block) {
            $ast = $ast.concat(statements);
            statements = [];
        }
        $ast.push(node);
    } 
    return [$ast, statements];
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
        }].concat(liftStatements(stripComments(ast), true)[0].map(convert))     
    }, {verbatim: 'raw'});
}
