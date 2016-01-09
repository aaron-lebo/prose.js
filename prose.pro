buffalo = do(end,
  1 to(9) map(i,
    if([1, 3, 7].contains(i), 'B', 'b') + 'uffalo'
  ).join(' ') + end
)

buffalo('.')
'?' buffalo
buffalo! = buffalo('!')
buffalo!
