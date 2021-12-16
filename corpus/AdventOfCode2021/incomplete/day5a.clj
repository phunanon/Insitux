
(-> (read-lines "day5.txt")
   @(map split)
   @(map (fn [a _ b] [a b]))
   @(map @(map @(split ",")))
   @(map @(map @(map to-num))))
   ;@(filter #()))
  ; @(map @(.. @(map vec))))