buffalo = do(end,
  to(1, 8).map(i ->  
    [1, 3, 7].contains(i) if('B', 'b') + 'uffalo'
  ).join(' ') + end
)

buffalo('.')
'?' buffalo
buffalo! = buffalo('!')
