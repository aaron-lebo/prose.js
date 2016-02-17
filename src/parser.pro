symbols = Obj()

symbol = {id, prefix, infix, power,
    symbols[id] | (
        symbols[id] := ( 
            id: id,
            prefix: prefix | t {nil},
            infix: infix | {l,
                throw('missing operator')
            },
            power: power | 0 
        ) 
    )
}

node = {head, args, x,
    (head, (x: x)).concat(args)
}

literal = {ids,
    ids.map({i,
        i symbol(t {i node(t.value Array, t.line)})
    }) 
}

infix = {ids, power, right,
    ?(Array.isArray(ids), ids, Array new(ids)).map({i,  
        i symbol(
            nil, 
            {l, t, ts,
                i node((l, ts expression(right ?(power - 1, power))), t.line)
            },
            power 
        ) 
    }) 
}

infixR = {ids, power,
    infix(ids, power, true)
}

getArgs = {start, tokens, end,
    arg = (); args = () 
    for(token = tokens[0],
        cont = false
        (';', 'newline').indexOf(token.type) != -1 ?(
            cont := true
            tokens.shift()
        )
        (end, ',').indexOf(token.type) != -1 ?(
            cont := true
            tokens.shift()
            arg.length != 0 ?(
                args.push(arg.length == 1 ?(arg[0], new(Array, 'do').concat(arg)))
                arg := () 
            )
            token.type == end ?
                return(args)
        ) 
        cont not ?
            arg.push(tokens expression)
        token := tokens[0]
    )
    throw(start.line + ': ' + start.value + ' not closed')
}

wrap = {ends, power, fun, fun1, fun2,   
    (start, end) = ends
    symbol(
        start, 
        {t, ts,
            args = getArgs(t, ts, end)
            (args.length == 0 | args.filter({n, n[0] != ':'}).length != 0) ? 
                return(fun(t, args))
            fun1(t, args) 
        },
        {l, t, ts, fun2(l, t, getArgs(t, ts, end))},
        power
    )
}

('#', 'boolean', 'name', 'number', 'string') literal 
'regex' symbol(t {'regex' node(t.value.split('`').slice(1), t.line)})
':' infixR(5)
('=', ':=', '+=', '-=') infixR(10)
'?' infixR(20)
('&', '|') infix(30)
' ' symbol(nil, {l, t, ts,
    exp = ts expression(35)
    exp[0] == 'name' | exp[0][2] == 'name' ? 
        return((exp, l))
    exp.splice(2, 0, l)
    exp
}, 35)
('==', '!=', '<') infix(40)
('+', '-') infix(50)
('*', '/') infix(60)
'.' infix(80)
('[', ']') wrap(80,  
    {t, args, 'List' node(args, t.line)},
    {t, args, 'OrderedMap' node(args, t.line)},
    {l, t, args, 
        $args = Array new
        $args.push(l)
        'at' node($args.concat(args), t.line)
    }
)
('{', '}') wrap(80, 
    {t, args, 'function' node(args, t.line)},
    {t, args, 'HashMap' node(args, t.line)}
)
('(', ')') wrap(80, 
    {t, args, args.length == 1 ?(args[0], 'Array' node(args, t.line))},
    {t, args, 'Obj' node(args, t.line)},
    {l, t, args, l node(args, t.line)}
)

expression = {tokens, power,
    token = tokens.shift()
    sym = token.type symbol
    left = sym.prefix(token, tokens) 
    for(tokens[0] & (power | 0) < symbol(tokens[0].type).power,
        token := tokens.shift()
        sym := token.type symbol 
        left := sym.infix(left, token, tokens)
    ) 
    left
}

default: parse = {tokens,
    ast = () 
    for(tokens[0],
        (';', 'newline').indexOf(tokens[0].type) != -1 ?(
            tokens.shift(),
            ast.push(tokens expression) 
        ) 
    ) 
    ast
}
