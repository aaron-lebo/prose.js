symbols = Obj()

symbol = {id, prefix, infix, power,
    symbols[id] | (
        symbols[id] := ( 
            id: id,
            prefix: prefix | t {nil},
            infix: infix | {l,
                throw: 'missing operator'
            },
            power: power | 0 
        ) 
    )
}

node = {head, args, x,
    (head, (x: x)).concat(args)
}

literal = {ids,
    ids map(i,
        i symbol(t {i node(t.value Array, t.line)})
    ) 
}

infix = {ids, power, right,
    if(ids Array?, ids, Array new(ids)) map(i,  
        i symbol(
            nil, 
            {l, t, ts,
                i node(l, ts expression(right ?(power - 1, power)), t.line)
            },
            power 
        ) 
    ) 
}

infixR = {ids, power,
    infix(ids, power, true)
}

getArgs = {tokens, end,
    arg = (); args = () 
    for(token = tokens[0],
        (';', 'newline').indexOf(token.type) != -1 ?(
            tokens.shift(),
            (end, ',').indexOf(token.type) != -1 ?(
                tokens.shift()
                arg.length != 0 ? (
                    args.push(arg.length == 1 ?(arg[0], ('do').concat(arg)))
                    arg := () 
                )
                token.type == end ?
                    return: args
        )) ? arg.push(tokens expression)
        token = tokens[0]
    )
}

container = {ends, power, $0, $1, $2,   
    start = ends[0]; end = ends[1]
    symbol(
        start, 
        {t, ts,
            args = getArgs(ts, end)
            (args.length == 0 | args filter(n,  n[0] == ':').length == 0) ? 
                return: $0(t, args)
            $1(t, args) 
        },
        {l, t, ts, $2(l, t, ts getArgs(end))},
        power
    )
}

('#', 'boolean', 'name', 'number', 'string') literal 
'regex' symbol(t {'regex' node(t.value.split('`').slice(1), t.line)})
'.' infix(18)
('[', ']') container(18,  
    {t, args, 'List' node(args, t.line)},
    {t, args, 'OrderedMap' node(args, t.line)},
    {l, t, args, 'at' node([l].concat(args), t.line)}
)
('{', '}') container(18, 
    {t, args, 'function' node(args, t.line)},
    {t, args, 'HashMap' node(args, t.line)}
)
('(', ')') container(17, 
    {t, args, args.length == 1 ?(args[0], 'Array' node(args, t.line))},
    {t, args, 'object' node(args, t.line)},
    {l, t, args, l node(args, t.line)}
)
('+', '-') infix(13)
('==', '!=') infix(10)
'&' infix(7)
'|' infix(6)
' ' symbol(nil, l, {t, ts,
    exp = ts expression(3.5)
    exp[0] == 'name' | exp[0][2] == 'name' ? 
        return: (exp, l)
    exp.splice(2, 0, l)
    exp
}, 3.5)
('=', ':=', '+=', '-=', '?') infixR(3)
':' infixR(2)

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
    ast = []
    for(tokens[0],
        [';', 'newline'].indexOf(tokens[0].type)  != -1 ?(
            tokens.shift(),
            ast.push(tokens expression) 
       ) 
    ) 
    ast
}
