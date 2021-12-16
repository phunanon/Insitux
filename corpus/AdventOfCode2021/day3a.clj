
(-> (read-lines "day3.txt")
   @(map @(map to-num))
   @(.. @(map vec))
   @(map #(- (.. + %) (/ (len %) 2)))
   @(map #((pos? %) 1 0))
   @(reduce #(| (<< % 1) %1) 0)
   @(* (& (~ %) 0xFFF)))