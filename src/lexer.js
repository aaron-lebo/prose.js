import Immutable from 'immutable';
let match = function (re) {
    return function (str) {
        let _ = str.match(re);
        return _ ? _[0].length : 0;
    };
};
let quotes = function (quote) {
    return function (str) {
        let chr = str[0];
        if (chr !== quote)
            return 0;
        let len = 1;
        while (str[len] !== chr) {
            str[len] === '\\' ? len += 1 : null;
            len += 1;
        }
        len += 1;
        return len + tokenizers.get('name')(str.slice(len));
    };
};
let tokenizers = Immutable.OrderedMap({
    '#': match(/^#.*[^\n]/),
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
    operator: match(/^\s+[~!@\$%\^&\*\-_=\+|:<>\/\?]+\s+/),
    newline: match(/^\s*\n\s*/),
    ' ': match(/^\s+/),
    quote: match(/^:/),
    number: match(/^[0-9]+(\.[0-9]+)?/),
    boolean: match(/^nil/),
    name: function (str) {
        let $match = match(/^[a-z~!@\$%\^&\*\-_=\+|:<>\/\?]+[a-z0-9~!@\$%\^&\*\-_=\+|:<>\/\?]*/i)(str);
        return str[$match - 1] === ':' ? $match - 1 : $match;
    },
    regex: quotes('`'),
    string: quotes('\''),
    doubled: quotes('"')
});
export default function lex(str) {
    let len = null;
    let line = 1;
    let tokens = [];
    while (str[0]) {
        let res = tokenizers.entrySeq().reduce(function (m, t) {
            return m[1] === 0 ? [
                t[0],
                t[1](str)
            ] : m;
        }, [
            null,
            0
        ]);
        let type = res[0];
        len = res[1];
        if (len === 0)
            throw str.substring(0);
        let val = str.substring(0, len);
        tokens.push({
            type: type === 'operator' ? val.replace(/\s/g, '') : type,
            len: len,
            line: line,
            value: val
        });
        let _ = val.match(/\n/);
        line += _ ? _.length : 0;
        str = str.substring(len);
    }
    return tokens;
}
