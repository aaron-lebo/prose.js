function match(re) {
    return str => {
        let match = re.exec(str);
        return match ? match[0].length : 0;
    };
}

function quotes(...chrs) {
    return str => {
        let chr = str[0];
        if (chrs.indexOf(chr) == -1) {
            return 0;
        } 
        let len = 1; 
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
    quote: match(/^:/),
    number: match(/^[0-9]+(\.[0-9]+)?/),
    name: match(/^[a-z~@\$%\^&\*\-_=\+|:<>\/\?]+[a-z0-9~@\$%\^&\*\-_=\+|:<>\/\?]*/i),
    regex: quotes('`'),
    string: quotes('"', "'")
};

export default function lex(str) {
    let len; 
    let line = 1; 
    let tokens = [];
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
