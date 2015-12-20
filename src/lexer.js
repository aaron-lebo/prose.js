function alpha(chr) {
    return chr >= 'a' && chr <= 'z' || chr >= 'A' && chr <= 'Z' ;
}

function numeric(chr) {
    return chr >= '0' && chr <= '9';
}

function special(chr) {
    return '~!@#$%^&*-_=+|/?'.includes(chr);
}

let tokenizers = {
    singleChars: str => {
        let token = {
            '[': 'leftBracket',
            ']': 'rightBracket',
            '{': 'leftCurly',
            '}': 'rightCurly',
            '(': 'leftParen',
            ')': 'rightParen',
            ':': 'colon',
            ',': 'comma',
            '\n': 'newline',
            '.': 'period',
            ';': 'semicolon'
        }[str[0]];
        if (token) {
            return {type: token, len: 1};
        }
        return {len: 0};
    },
    number: str =>  {
        let len = 0,
            chr = str[0]; 
        while (chr >= '0' && chr <= '9') {
            len += 1;
            chr = str[len]; 
        }
        return {type: 'number', len: len};
    },
    operator: str => {
        let len = 0; 
        while (special(str[len])) {
            len += 1;
        } 
        return {type: 'operator', len: len};
    },
    name: str => { 
        let len = 0, 
            chr = str[len];
        if (alpha(chr) || special(chr)) {
            len = 1;
        } else {
            return {len: len}
        } 
        while (alpha(chr) || numeric(chr) || special(chr)) {
            len += 1;
            chr = str[len];
        }
        return {type: 'name', len: len};
    },
    whitespace: str => {
        let len = 0;
        while (str[len] != '\n' && /\s/.test(str[len])) {
            len += 1;
        }
        return {type: 'whitespace', len: len};
    },
    string: str => {
        let chr = str[0],
            len = 1;
        if (['"', "'"].indexOf(chr) == -1) {
            return {len: 0};
        } 
        while (str[len] != chr || str[len - 1] == '\\') {
            len += 1;
        }
        return {type: 'string', len: len + 1};
    }
};

export default function lex(str) {
    let line = 0, 
        token = {},
        tokens = [];
    while (str.length > 0) {
        for (let tokenizer in tokenizers) {
            token = tokenizers[tokenizer](str);
            let {len} = token;
            if (len > 0) {
                token.line = line;
                token.value = str.substring(0, len);
                tokens.push(token);
                line += (token.value.match(/\n/) || []).length;
                str = str.substring(len);
                break;
            }
        }
        if (token.len == 0) { 
            throw str.substring(0);
        }
    }
    return tokens;
}
