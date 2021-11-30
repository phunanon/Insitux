
(function in-wave? x y
  (< (dec y) (+ (* 4 (sin (/ x 8))) 6) y))

(join (repeat (fn y (.. str (repeat #((in-wave? % y) "*" " ") 126))) 12) "\n")