
(-> (read "day7.txt")
   @(split ",")
    (map to-num)
    sort
   @[(// (len %) 2)]
    (fn [mid list] [(/ (+ (mid list) ((- mid) list)) 2) list])
    (fn [med list] (for - list [med]))
    (map abs)
    (.. +))