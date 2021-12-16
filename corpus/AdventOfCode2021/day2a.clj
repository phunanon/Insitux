
(-> (read-lines "day2.txt")
   @(map split)
   @(map (fn [[a] b] [a (to-num b)]))
   @(map (fn [a b] ({"f" [b 0] "d" [0 b] "u" [0 (- b)]} a)))
   @(.. @(map +))
   @(.. *))
