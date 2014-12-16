(defproject rpd "0.1.0-SNAPSHOT"

  :description "FIXME: write description"
  :url "http://example.com/FIXME"

  :dependencies [[org.clojure/clojure "1.6.0"]
                 [org.clojure/clojurescript "0.0-2411"]]

  :plugins [[lein-cljsbuild "1.0.4-SNAPSHOT"]]

  :cljsbuild {
    :builds [{
        :source-paths ["src"]
        :compiler {
          :output-to "dist/rpd.js"
          :output-dir "out"
          :optimizations :whitespace
          :pretty-print true}}]})
