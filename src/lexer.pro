match = do(re,
    str -> (_ = re.match(str)) ?(_.length, 0) 
)

quotes = do(quote,
    str -> (
        (chr = str @ 0) != quote ? 
            return(0)
        len = 1
        for(str @ len != chr,
            str @ len == '\\' ? 
                len += 1
            len += 1
        )
        len + 1 + (len str.slice tokenizers.name)
    )
)

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
    name: str -> ( 
        $match = match(`^[a-z~!@\$%\^&\*\-_=\+|:<>\/\?]+[a-z0-9~!@\$%\^&\*\-_=\+|:<>\/\?]*`i)(str)
        str[$match - 1] == ':' ?($match - 1, $match) 
    ),
    regex: '`' quotes,
    string: '\'' quotes,
    doubled: '"' quotes
]

default: lex = do(str,
    len = nil; line = 1; tokens = () 
    for(str @ 0,
        res = tokenizers.entries().reduce(do(len, t, 
            len ?((len, t @ 0), t[1](str))
        ), 0)
        res == 0 ?
            throw(str.substring(0))
        len := res @ 0; type = res @ 1
        val = str.substring(0, len)               
        tokens.push((
            type: type == 'operator' ?(val.replace(`\s`g, ''), type),
            len: len,
            line: line,
            value: val 
        ))
        (_ = val.match(`\n`)) ?(_.length, 0)
        str := str.substring(len)
    ) 
    tokens
)
