import escodegen from 'escodegen';

function literal(val, raw) {
    let node = {type: 'Literal', value: val};
    if (raw) {
        node.raw = raw;
    }
    return node;
}

function id(name) {
    return {type: 'Identifier', name: name};
} 

let vars = [];
function lift(node, safe) {
    if (Array.isArray(node)) {
        return node.map(n => lift(n, safe));
    } else if (node && typeof node == 'object' && !(node instanceof RegExp)) {
        if (!safe && (node.type == 'VariableDeclaration')) {
            vars.push(node);
            return node.declarations[0].id;
        }
        Object.getOwnPropertyNames(node).forEach(n => {
            node[n] = lift(node[n], n == 'body');
        });
    }
    return node;
}

let comments = [];
function sweep(node, safe) {
    if (Array.isArray(node)) {
        return node.map(sweep);
    } else if (node && typeof node == 'object' && !(node instanceof RegExp)) {
        if (!safe && (node.type == '#')) {
            comments.push(node);
            return;
        }
        Object.getOwnPropertyNames(node).forEach(n => {
            node[n] = sweep(node[n], n == 'body');
        });
    }
    return node;
}

function statement(node, type) {
    let end = 'Statement';
    if (node.type.endsWith(end)) {
        return node;
    }
    return {type: (type || 'Return') + end, argument: node};
}

function block(body, fun$) {
    let $body = [];
    if (fun$ == false) {
        body = body.map(convert); 
    } else {
        body = body[0] == 'do' ? argsOf(body) : [convert(body)];
    }
    for (let i = 0; i < body.length; i++) {
        let $n = body[i];
        $n = sweep(fun$ && i == body.length - 1 ? statement(lift($n)) : lift($n, true));
        if (!$n) {
            continue;
        }
        $body = $body.concat(vars);
        vars = [];
        if ($n.type == 'statements') {
            $body = $body.concat($n.args);
            continue;
        }
        let $statement = $n.type.endsWith('Expression') ? 
            {type: 'ExpressionStatement', expression: $n} : 
            $n;
        $statement.leadingComments = comments;
        comments = [];
        $body.push($statement);
    }
    return fun$ == false ? $body : {type: 'BlockStatement', body: $body}; 
}

function argsOf(node, $convert=true) {
    let args = node.slice(Array.isArray(node[1]) ? 1 : 2);
    return $convert ? args.map(convert) : args; 
}

function fun(id, node) {
    let body = node.slice(-1)[0];
    body = block(body, 'return');
    return {
        type: 'Function' + (id ? 'Declaration' : 'Expression'),
        id: id && convert(id),
        params: node.slice(2, -1).map(convert),
        body: body
    };
}   
 
function member(node, computed=false) {
    let [obj, prop] = argsOf(node);
    return {
        type: 'MemberExpression',
        object: obj,
        property: prop,
        computed: computed 
    };
}
 
function call(callee, args, $new) {
    return {type: ($new ? 'New' : 'Call') + 'Expression', callee: callee, arguments: args};
}
 
function object(node) {
    return {
        type: 'ObjectExpression', 
        properties: argsOf(node, false).map(n => {
            let [k, v] = argsOf(n);
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
        let [left, right] = argsOf(n);
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
let logical = expression('LogicalExpression');

let nodes = {
    '#': n => ({type: '#'}),
    boolean: n => literal(null), 
    name: n => id(n[2]),
    number: n => literal(parseFloat(n[2])),
    string: n => literal(null, { 
          content: n[2],
          precedence: escodegen.Precedence.Primary
    }),
    regex: n => literal(RegExp.apply(null, argsOf(n, false))),
    new: n => {
        let [callee, args] = argsOf(n);
        return call(callee, args ? [args]: [], true);
    },
    not: n => ({
        type: 'UnaryExpression',
        operator: '!',
        prefix: true,
        argument: argsOf(n)[0]
    }),
    function: n => fun(null, n), 
    return: n => statement(convert(n[2])),
    throw: n => statement(convert(n[2]), 'Throw'),
    '?': n => {
        let [test, con, alt] = argsOf(n, false);
        test = convert(test);
        let unsafe = [con, alt].filter(n => n && n[0] == 'do').length > 0;
        let fun = unsafe ? block : convert;
        con = fun(con);
        alt = alt ? fun(alt) : null;
        let $statement = [con, alt].filter(n => n && n.type.endsWith('Statement')).length > 0; 
        return {
            type: $statement ? 'IfStatement' : 'ConditionalExpression', 
            test: test,
            consequent: con,
            alternate: alt || ($statement ? null : literal(null)) 
        }
    },      
    for: n => {
       let body = n.slice(-1)[0];
       return {
            type: 'WhileStatement',
            test: convert(n[2]),
            body: block(body)
        };
    },    
    '&': n => logical(n, '&&'), 
    '|': n => logical(n, '||'), 
    at: n => member(n, true),
    import: n => {
        return {
            type: 'statements', 
            args: argsOf(n, false).map($n => {
                let [spec, source] = argsOf($n);
                return {
                    type: 'ImportDeclaration',
                    specifiers: [{type: 'ImportDefaultSpecifier', id: spec}],
                    source: source 
                };
            })
        };
    },
    '+': binary,
    '-': binary,
    '==': n => binary(n, '==='),
    '!=': n => binary(n, '!=='),
    '<': binary,
    '>': binary,
    instanceof: n => binary(n, 'instanceof'),
    Obj: object,
    Array: n => ({type: 'ArrayExpression', elements: argsOf(n)}),      
    HashMap: n => call(id('Immutable.HashMap'), [object(n)]),
    OrderedMap: n => call(id('Immutable.OrderedMap'), [object(n)]),    
    '.': n => member(n), 
    '=': n => variable.apply(null, argsOf(n)),
    ':=': n => assignment(n, '='),
    '+=': assignment,
    ':': n => {     
        if (n[0] == 'default' || n[2][2] == 'default') {
            return {type: 'ExportDefaultDeclaration', declaration: fun.apply(null, argsOf(n[3], false))};
        }
        let args = argsOf(n, false);
        args.splice(1, 0, {});
        return statement(convert(args)); 
    }
}

function convert(node) {
    let head = node[0]; 
    let parser = nodes[head] || nodes[head[2]];
    return parser ? parser(node) : 
        call(Array.isArray(head) ? convert(head) : id(head), argsOf(node));
}

export default function compile(ast) {
    let first = ast[0].slice(-1)[0];
    return (/^[/s]?#!/.exec(first) ? first + '\n' : '') + escodegen.generate({
        type: 'Program',
        body: [{
            type: 'ImportDeclaration',
            specifiers: [{type: 'ImportDefaultSpecifier', id: id('Immutable')}],
            source: literal('immutable') 
        }].concat(block(ast, false))
    }, {verbatim: 'raw'});
}
