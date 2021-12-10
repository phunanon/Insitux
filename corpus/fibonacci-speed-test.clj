(function fib n
  (if (< n 2) n
      (+ (fib (dec n))
         (fib (- n 2)))))

(var results [])
(var top 10)
(function best-avg
  (when (< (len results) 2)
    (return (0 results)))
  (let tops (sect (sort results) 0 top))
  (floor (/ (.. + tops) (len tops))))

(function measure n
  (let report [(time) (fib 28) (time)])
  (let diff (- (2 report) (0 report)))
  (var results (push results diff))
  (print n " " (version) ": " (1 report) " took " diff "ms"
    "   " (best-avg) "ms best avg"))

(map measure (range 50))

(str "Average of top " top " results: " (best-avg) "ms")