function alpha(chr) {
    return chr >= 'a' && chr <= 'z' || chr >= 'A' && chr <= 'Z' ;
}

function numeric(chr) {
    return chr >= '0' && chr <= '9';
}

function special(chr) {
    return '~!@#$%^&*-_=+|/?'.includes(chr);
}

function match(re) {
    return str => {
        let match = re.exec(str);
        return match ? match[0].length : 0;
    };
}

function quotes(chrs) {
    return str => {
        let chr = str[0],
            len = 1;
        if (chrs.indexOf(chr) == -1) {
            return 0;
        } 
        while (str[len] != chr || str[len - 1] == '\\') {
            len += 1;
        }
        return len + 1;
    }
}
let tokenizers = {
    '.': match(/^\s*\.\s*/),
    '(': match(/^\(\s*/),
    ')': match(/^\s*\)/),
    '[': match(/^\[\s*/),
    ']': match(/^\s*\]/),
    '{': match(/^{\s*/),
    '}': match(/^\s*}/),
    ',': match(/^\s*,\s*/),
    ';': match(/^\s*;\s*/),
    ':': match(/^\s*:\s+/),
    operator: match(/^\s+[~@\$%\^&\*\-_=\+|:<>\/\?]+\s+/),
    newline: match(/^\s*\n\s*/),
    ' ': match(/^\s+/),
    number: match(/^[0-9]+(\.[0-9]+)?/),
    name: str => { 
        let len = 0, 
            chr = str[len];
        if (alpha(chr) || special(chr)) {
            len = 1;
            chr = str[1];
        } else {
            return len
        } 
        while (alpha(chr) || numeric(chr) || special(chr)) {
            len += 1;
            chr = str[len];
        }
        return len;
    },
    regex: quotes(['`']),
    string: quotes(['"', "'"])
};

export default function lex(str) {
    let len, 
        line = 1, 
        tokens = [];
    while (str.length > 0) {
        for (let tokenizer in tokenizers) {
            len = tokenizers[tokenizer](str);
            if (len > 0) {
                let value = str.substring(0, len);
                tokens.push({
                    type: tokenizer == 'operator' ? value.replace(/\s/g, '') : tokenizer,
                    len: len,
                    line: line,
                    value: value 
                });
                line += (value.match(/\n/) || []).length;
                str = str.substring(len);
                break;
            }
        }
        if (len == 0) { 
            throw str.substring(0);
        }
    }
    return tokens;
}
