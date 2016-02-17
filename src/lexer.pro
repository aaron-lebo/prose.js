match = {re,
    {str, (_ = str.match(re)) ?(_[0].length, 0)} 
}

quotes = {quote,
    {str, 
        (chr = str[0]) != quote ? 
            return(0)
        len = 1
        for(str[len] != chr,
            str[len] == '\\' ? 
                (len += 1)
            len += 1
        )
        len += 1
        len + tokenizers.get('name')(str.slice(len))
    } 
}

tokenizers = [ 
    '#': `^#.*[^\n]` match,
    '.': `^\s*\.\s*` match,
    '(': `^\(\s*` match,
    ')': `^\s*\)` match,
    '[': `^\[\s*` match,
    ']': `^\s*\]` match,
    '{': `^{\s*` match,
    '}': `^\s*}` match,
    ',': `^\s*,\s*` match,
    ';': `^\s*;\s*` match,
    ':': `^\s*:\s+` match,
    operator: `^\s+[~!@\$%\^&\*\-_=\+|:<>\/\?]+\s+` match,
    newline: `^\s*\n\s*` match,
    ' ': `^\s+` match,
    quote: `^:` match,
    number: `^[0-9]+(\.[0-9]+)?` match,
    boolean: `^nil` match, 
    name: {str, 
        $match = match(`^[a-z~!@\$%\^&\*\-_=\+|:<>\/\?]+[a-z0-9~!@\$%\^&\*\-_=\+|:<>\/\?]*`i)(str)
        str[$match - 1] == ':' ?($match - 1, $match) 
    },
    regex: '`' quotes,
    string: '\'' quotes,
    doubled: '"' quotes
]

default: lex = {str,
    len = nil; line = 1; tokens = () 
    for(str[0],
        res = tokenizers.entrySeq().reduce({m, t, 
            m[1] == 0 ?((t[0], t[1](str)), m)
        }, (null, 0)) 
        type = res[0]; len := res[1] 
        len == 0 ? 
            throw(str.substring(0))
        val = str.substring(0, len)               
        tokens.push((
            type: type == 'operator' ?(val.replace(`\s`g, ''), type),
            len: len,
            line: line,
            value: val 
        ))
        line += val.split(`\n`).length - 1
        str := str.substring(len)
    ) 
    tokens
}
