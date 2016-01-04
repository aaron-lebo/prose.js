import escodegen from 'escodegen';

let nodes = {
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
  //' ': node => node,
}

function convert(ast) {
    return nodes[ast.node](ast);
}

export default function compile(ast) {
    return escodegen.generate(convert(ast));
}
