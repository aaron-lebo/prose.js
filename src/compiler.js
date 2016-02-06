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

function fun(name, node) {
    let body = node.slice(-1)[0];
    body = body[0] == 'do' ? argsOf(body).map(convert) : [convert(body)];
    body[body.length - 1] = statement('Return', body[body.length - 1]);
    return {
        type: 'Function' + (name ? 'Declaration' : 'Expression'),
        name: name && convert(name),
        params: node.slice(2, -1).map(convert),
        body: block(body)
    };
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

function variable(id, init) {
    return {
        type: 'VariableDeclaration',
        declarations: [{
            type: 'VariableDeclarator', 
            id: id,
            init: init 
        }],
        kind: 'let'
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
    function: n => fun(null, n), 
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
                return variable(left, call(id('require'), [right]));
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
    '=': n => variable.apply(null, argsOf(n).map(convert)),
    ':=': n => assignment(n, '='),
    '+=': assignment, 
    ':': n => {     
        return {type: 'ExportDefaultDeclaration', declaration: fun.apply(null, argsOf(n[3]))};
    }
}

function convert(node) {
    let head = node[0]; 
    let parser = nodes[head] || nodes[head[2]];
    return parser ? parser(node) : call(
        Array.isArray(head) ? convert(head) : id(head), 
        argsOf(node).map(convert)
    );
}

export default function compile(ast) {
    return escodegen.generate({
        type: 'Program',
        body: [{
            type: 'ImportDeclaration',
            specifiers: [{type: 'ImportDefaultSpecifier', id: id('Immutable') }],
            source: literal('immutable') 
        }].concat(ast.map(convert))     
    }, {verbatim: 'raw'});
}
