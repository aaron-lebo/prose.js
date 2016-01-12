match = do(re,
    str -> (
        $match = re.exec(str)
        $match ?($match[0].length, 0) 
    )
)

quotes = do(quote,
    str -> (
        chr = str @ 0
        chr != quote ?
            return(0)
        len = 1
        for(str @ len != chr | str @ len - 1 == '\\\\',
            len += 1
        )
        len + 1
    )
)

tokenizers = OrderedMap(
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
    '#': `^#.*[^\n]` match,
    operator: `^\s+[~!@\$%\^&\*\-_=\+|:<>\/\?]+\s+` match,
    newline: `^\s*\n\s*` match,
    ' ': `^\s+` match,
    quote: `^:` match,
    number: `^[0-9]+(\.[0-9]+)?` match,
    boolean: `^nil` match, 
    name: str  -> ( 
        $match = `^[a-z~!@\$%\^&\*\-_=\+|:<>\/\?]+[a-z0-9~!@\$%\^&\*\-_=\+|:<>\/\?]*`i match(str)
        str @ $match - 1 == ':' ?($match - 1, $match) 
    ),
    regex: '`' quotes,
    string: '\'' quotes,
    doubled: '"' quotes
)

default: lex = do(str,
    len = nil; line = 1; tokens = []
    for(str @ 0,
        res = tokenizers.entries().reduce(do(len, t, 
          len ?([len, t @ 0], str t @ 1)
        ), 0)
        res == 0 ?
            throw(str.substring(0))
        len := res @ 0; type = res @ 1
        val = str.substring(0, len)               
        tokens.push({
            type: type == 'operator' ?(val.replace(`\s`g, ''), type),
            len: len,
            line: line,
            value: val 
        })
        line += (val.match(`\n`) | []).length
        str := str.substring(len)
    ) 
)
