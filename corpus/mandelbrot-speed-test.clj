(function mandelbrot width height depth
  (.. str (for #(do
    (let c_re (/ (* (- % (/ width 2)) 4) width)
         c_im (/ (* (- %1 (/ height 2)) 4) width))
    (let x 0 y 0 i 0)
    (while (and (<= (+ (** x) (** y)) 4)
                (< i depth))
      (let x2 (+ (- (** x) (** y)) c_re)
           y  (+ (* 2 x y) c_im)
           x  x2
           i  (inc i)))
    (str ((zero? %) "\n" "") (i "ABCDEFGHIJ ")))
    (range width) (range height))))


(var results [])
(var top 10)
(function best-avg
  (when (< (len results) 2)
    (return (0 results)))
  (let tops (sect (sort results) 0 top))
  (floor (/ (.. + tops) (len tops))))

(function measure n
  (let report [(time) (mandelbrot 100 100 10) (time)])
  (let diff (- (2 report) (0 report)))
  (var results (append diff results))
  (print n " " (version) ": took " diff "ms"
    "   " (best-avg) "ms best avg"))

(map measure (range 50))

(str "Average of top " top " results: " (best-avg) "ms")