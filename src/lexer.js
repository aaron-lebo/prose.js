function alpha(chr) {
    return chr >= 'a' && chr <= 'z' || chr >= 'A' && chr <= 'Z' ;
}

function numeric(chr) {
    return chr >= '0' && chr <= '9';
}

function special(chr) {
    return '~!@#$%^&*-_=+|/?'.includes(chr);
}

function match(regex) {
    return str => {
        let matches = str.match(regex);
        return matches ? matches[0].length : 0;
    };
}

let tokenizers = {
    dot: match(/^\s*\.\s*/),
    newline: match(/^\s*\n\s*/),
    leftParen: match(/^\(\s*/),
    rightParen: match(/^\s*\)/),
    leftBracket: match(/^\[\s*/),
    rightBracket: match(/^\s*\]/),
    leftCurly: match(/^{\s*/),
    rightCurly: match(/^\s*}/),
    comma: match(/^\s*,\s*/),
    colon: match(/:/),
    semicolon: match(/;/),
    number: str =>  {
        let len = 0,
            chr = str[0]; 
        while (chr >= '0' && chr <= '9') {
            len += 1;
            chr = str[len]; 
        }
        return len;
    },
    operator: str => {
        let len = 0; 
        while (special(str[len])) {
            len += 1;
        } 
        return len;
    },
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
    space: str => {
        let len = 0;
        while (/\s/.test(str[len])) {
            len += 1;
        }
        return len;
    },
    string: str => {
        let chr = str[0],
            len = 1;
        if (['"', "'"].indexOf(chr) == -1) {
            return 0;
        } 
        while (str[len] != chr || str[len - 1] == '\\') {
            len += 1;
        }
        return len + 1;
    }
};

export default function lex(str) {
    let len, 
        line = 1, 
        tokens = [];
    while (str.length > 0) {
        for (let tokenizer in tokenizers) {
            len = tokenizers[tokenizer](str);
            if (len > 0) {
                let token = {
                    type: tokenizer, 
                    len: len,
                    line: line,
                    value: str.substring(0, len)
                };
                tokens.push(token);
                line += (token.value.match(/\n/) || []).length;
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
