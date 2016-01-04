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
    '[': node => {
        return {
            type: 'CallExpression',
            callee: {type: 'Identifier', name: 'Immutable.Array'},
          arguments: node.args.map(n => convert(n))
        }
    },
    ' ': node => {
        let [left, right] = node.args;
        return {
            type: 'CallExpression',
            callee: convert(right),
            arguments: [convert(left)]
        }
    },
    '.': node => {
        let [left, right] = node.args;
        return {
            type: 'MemberExpression',
            object: convert(left),
            property: convert(right),
            computed: false 
        }
    }
}

function convert(ast) {
    return nodes[ast.node](ast);
}

export default function compile(ast) {
    return escodegen.generate(convert(ast));
}
