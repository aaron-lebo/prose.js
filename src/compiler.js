import escodegen from 'escodegen';

let nodes = {
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
    'do': node => {
        let body = node.args.slice(-1)[0];
        return {
            type: 'FunctionExpression',
            params: node.args.slice(0, -1).map(convert),
            body: {
                type: 'BlockStatement', 
                body: [convert(body)]
            }
        }
    },
    '(': node => {
        return {
            type: 'CallExpression',
            callee: convert(node.node),
            arguments: node.args.map(n => { 
                if (Array.isArray(n)) { 
                    return {
                        type: 'SequenceExpression', 
                        expressions: n.map(convert)
                    };
                } 
                return convert(n);
            }) 
        }
    },
    '[': node => {
        return {
            type: 'CallExpression',
            callee: {type: 'Identifier', name: 'Immutable.Array'},
            arguments: node.args.map(n => convert(n))
        }
    },
    ' ': node => {
        let [left, right] = node.args;
        if (['.', 'name'].indexOf(right.node.node) != -1) {
            right.args.splice(0, 0, left);
            return convert(right); 
        }
        return convert({node: right, args: [left]});
    },
    '.': node => {
        let [left, right] = node.args;
        return {
            type: 'MemberExpression',
            object: convert(left),
            property: convert(right),
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
    let node = nodes[ast.node.args && ast.node.args[0]];
    if (node) {
        return node(ast); 
    }
    return nodes['('](ast);
}

export default function compile(ast) {
    return escodegen.generate(convert(ast));
}
