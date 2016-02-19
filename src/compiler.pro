import(
    escodegen: 'escodegen'
)

literal = {val, raw,
    node = (type: 'Literal', value: val)
    raw ?
        node.raw := raw
    node
}

id = {name,
    (type: 'Identifier', name: name)
} 

vars = ()

lift = {node, safe,
    Array.isArray(node) ?(
        node.map({n, n lift(safe)}),
        if(node & node typeof == 'object' & node instanceof(RegExp) not, 
            if(safe not & node.type == 'VariableDeclaration',
                vars.push(node)
                return(node.declarations[0].id)
            )            
            Object.getOwnPropertyNames(node).forEach(n {
                node[n] := node[n] lift(n == 'body')
            })
        )
    )
    node
}

statement = {node, $throw,
    node.type.endsWith(end = 'Statement') ?
        return(node)
    (type: ($throw ?('Throw', 'Return')) + end, argument: node)
}

block = {body, fun$,
    body := fun$ == false ?(
        body.map(convert), 
        body[0] == 'do' ?(body argsOf, Array new(body convert))
    )
    i = 0; $body = () 
    for(i < body.length,
        $n = body[i]
        $n := fun$ & i == body.length - 1 ?($n lift statement, $n lift(true))
        $body := $body.concat(vars)
        vars := () 
        $body.push($n.type.endsWith('Expression') ? ( 
            (type: 'ExpressionStatement', expression: $n),  
            $n
        ))
    )
    fun$ == false ?($body, (type: 'BlockStatement', body: $body)) 
}


argsOf = {node, $convert,
    args = node.slice(node[1] Array.isArray ?(1, 2))
    ($convert | true) ?(args.map(convert), args) 
}


fun = {id, node,
    body = node.slice(-1)[0]
    body := body block(true)
    ( 
        type: 'Function' + id ?('Declaration', 'Expression'),
        id: id & id convert,
        params: node.slice(2, -1).map(convert),
        body: body
    ) 
}   
 
member = {node, computed,
    (obj, prop) = node argsOf
    ( 
        type: 'MemberExpression',
        object: obj,
        property: prop,
        computed: computed | true
    )    
}
 
call = {callee, args, $new,
    (type: ($new ?('New', 'Call')) + 'Expression', callee: callee, arguments: args)
}
 
object = {node,
    (
        type: 'ObjectExpression', 
        properties: node argsOf(false).map({n, 
            (k, v) = n argsOf
            ( 
                type: 'Property',
                key: k,
                value: v,
                kind: 'init'
            )
        })
    ) 
}

variable = {id, init,
    (
        type: 'VariableDeclaration',
        declarations: Array new((
            type: 'VariableDeclarator', 
            id: id,
            init: init 
        )),
        kind: 'let'
    ) 
}

expression = {type,
    {n, op,
        (left, right) = n argsOf
        ( 
            type: type,
            operator: op | n[0],
            left: left,
            right: right
        ) 
    }
}                

assignment = 'AssignmentExpression' expression
binary = 'BinaryExpression' expression
logical = 'LogicalExpression' expression

nodes = { 
    boolean: {n, nil literal}, 
    name: {n,  n[2] id},
    number: {n, n[2] parseFloat literal},
    string: {n, nil literal(( 
          content: n[2],
          precedence: escodegen.Precedence.Primary
    ))},
    regex: {n, RegExp.apply(nil, n argsOf(false) literal)},
    new: {n,
        (callee, args) = n argsOf
        callee call(args ?(Array new(args), ()), true)
    },
    not: {n, (
        type: 'UnaryExpression',
        operator: '!',
        prefix: true,
        argument: argsOf(n)[0]
    )},
    function: {n, nil fun(n)}, 
    return: {n, n[2] convert statement},
    throw: {n, n[2] convert statement(true)},
    '?': {n, 
        (test, con, alt) = n argsOf(false)
        test := test convert
        unsafe = (con, alt).filter({n, n & n[0] == 'do'}).length > 0
        fun = unsafe ?(block, convert)
        con := con fun
        alt := alt ? alt fun
        $statement = (con, alt).filter({n, n & n.type.endsWith('Statement')}).length > 0 
        (
            type: $statement ?('IfStatement', 'ConditionalExpression'), 
            test: test,
            consequent: con,
            alternate: alt | $statement ?(nil, nil literal) 
        ) 
    },      
    for: {n,
       body = n.slice(-1)[0]
       (
            type: 'WhileStatement',
            test: n[2] convert,
            body: body block
       )
    },    
    '&': {n, n logical('&&')}, 
    '|': {n, n logical('||')}, 
    at: {n, n member(true)},
    import: {n, ( 
            type: 'VariableDeclaration',
            declarations: n.args.map({n, 
                (left, right) = $n.args.map(convert)
                left variable('require' id call(Array new(right)))
            }),
            kind: 'let'
    )},
    '+': binary,
    '-': binary,
    '==': {n, n binary('===')},
    '!=': {n, n binary('!==')},
    '<': binary,
    Obj: object,
    Array: {n, (type: 'ArrayExpression', elements: n argsOf(n))},      
    HashMap: {n, 'Immutable.HashMap' id call(Array new(n object))},
    OrderedMap: {n, 'Immutable.OrderedMap' id call(Array new(n object))},
    '.': member, 
    '=': {n, variable.apply(nil, n argsOf)},
    ':=': {n, n assignment('=')},
    '+=': assignment,
    ':': {n,     
        n[0] == 'default' | n[2][2] == 'default' ?
            return((type: 'ExportDefaultDeclaration', declaration: fun.apply(nil, n[3] argsOf(false))))
        args = n argsOf(false)
        args.splice(1, 0, Obj())
        return(args convert statement) 
    }
}

convert = {node,
    head = node[0] 
    (parser = nodes[head] | nodes[head[2]]) ?(
        node parser, 
        head Array.isArray ?(head convert, head id) call(node argsOf)
    )
}

default: compile = {ast,
    escodegen.generate((
        type: 'Program',
        body: new(Array, (
            type: 'ImportDeclaration',
            specifiers: Array new((type: 'ImportDefaultSpecifier', id: 'Immutable' id)),
            source: 'immutable' literal
        )).concat(block(ast, false)) 
    ), (verbatim: 'raw'))
}
