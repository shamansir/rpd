RPD_VERSION = `cat $(VERSION_FILE)`

LICENSE_LINE = "/* RPD v$(RPD_VERSION)\n \
                   http://shamansir.github.io/rpd\n \
                   LICENSE: MIT (c) 2015 Anton Kotenko <shaman.sir@gmail.com> */\n"

SRC_DIR    = src
DIST_DIR   = dist
VENDOR_DIR = vendor

VERSION_FILE = VERSION

KEFIR_FILENAME      = kefir.min.js
TIMBRE_FILENAME     = timbre.min.js
ANM_PLAYER_FILENAME = anm-player.min.js

KEFIR_URL      = http://pozadi.github.io/kefir/dist/kefir.min.js
TIMBRE_URL     = http://mohayonao.github.io/timbre.js/timbre.js
ANM_PLAYER_URL = http://player.animatron.com/latest/bundle/animatron.min.js

CLOSURE_COMPILER = ./compiler.jar

JS_VERSION = ECMASCRIPT5

all: dist-html

deps:
	mkdir -p ./$(VENDOR_DIR)

	curl -o ./$(VENDOR_DIR)/$(KEFIR_FILENAME) $(KEFIR_URL)
	curl -o ./$(VENDOR_DIR)/$(TIMBRE_FILENAME) $(TIMBRE_URL)
	curl -sH 'Accept-encoding: gzip' --compressed $(ANM_PLAYER_URL) > ./$(VENDOR_DIR)/$(ANM_PLAYER_FILENAME)

test-deps:
	npm install jasmine
	npm install phantom-jasmine
	git clone https://github.com/jasmine/jasmine.git
	mkdir ./spec/lib
	cp ./jasmine/dist/jasmine-standalone-2.2.0.zip ./spec/lib
	cd ./spec/lib
	unzip ./jasmine-standalone-2.2.0.zip
	cd ../..
	rm -Rf ./jasmine

test:
	phantom-jasmine

dist: dist-html

dist-html:
	mkdir -p ./$(DIST_DIR)
	mkdir -p ./$(DIST_DIR)/$(RPD_VERSION)

	java -jar $(CLOSURE_COMPILER) --language_in $(JS_VERSION) \
	                              --js ./$(SRC_DIR)/rpd.js \
								  --js ./$(SRC_DIR)/render/html.js \
	                              --js ./$(SRC_DIR)/toolkit/core/toolkit.js \
							  	  --js ./$(SRC_DIR)/toolkit/core/render/html.js \
								  --js_output_file ./$(DIST_DIR)/rpd-core-html.min.js
	echo $(LICENSE_LINE) | cat - ./$(DIST_DIR)/rpd-core-html.min.js > ./tmp && mv ./tmp ./$(DIST_DIR)/rpd-core-html.min.js
	cp ./$(DIST_DIR)/rpd-core-html.min.js ./$(DIST_DIR)/$(RPD_VERSION)

	cat ./$(SRC_DIR)/render/html.css \
	    ./$(SRC_DIR)/toolkit/core/render/html.css > ./$(DIST_DIR)/rpd-core.css
	echo $(LICENSE_LINE) | cat - ./$(DIST_DIR)/rpd-core.css > ./tmp && mv ./tmp ./$(DIST_DIR)/rpd-core.css
	cp ./$(DIST_DIR)/rpd-core.css ./$(DIST_DIR)/$(RPD_VERSION)/rpd-core.css

dist-pd-html:

	mkdir -p ./$(DIST_DIR)
	mkdir -p ./$(DIST_DIR)/$(RPD_VERSION)

	java -jar $(CLOSURE_COMPILER) --language_in $(JS_VERSION) \
	                              --js ./$(SRC_DIR)/rpd.js \
								  --js ./$(SRC_DIR)/render/html.js \
	                              --js ./$(SRC_DIR)/toolkit/core/toolkit.js \
	                              --js ./$(SRC_DIR)/toolkit/core/render/html.js \
								  --js ./$(SRC_DIR)/toolkit/pd/toolkit.js \
								  --js ./$(SRC_DIR)/toolkit/pd/render/html.js \
	                              --js_output_file ./$(DIST_DIR)/rpd-core-pd-html.min.js
	echo $(LICENSE_LINE) | cat - ./$(DIST_DIR)/rpd-core-pd-html.min.js > ./tmp && mv ./tmp ./$(DIST_DIR)/rpd-core-pd-html.min.js
	cp ./$(DIST_DIR)/rpd-core-pd-html.min.js ./$(DIST_DIR)/$(RPD_VERSION)

	cat ./$(SRC_DIR)/render/html.css \
	    ./$(SRC_DIR)/toolkit/core/render/html.css \
	    ./$(SRC_DIR)/toolkit/pd/render/html.css > ./$(DIST_DIR)/rpd-core-pd.css
	echo $(LICENSE_LINE) | cat - ./$(DIST_DIR)/rpd-core-pd.css > ./tmp && mv ./tmp ./$(DIST_DIR)/rpd-core-pd.css
	cp ./$(DIST_DIR)/rpd-core-pd.css ./$(DIST_DIR)/$(RPD_VERSION)/rpd-core-pd.css

dist-anm-html:

	mkdir -p ./$(DIST_DIR)
	mkdir -p ./$(DIST_DIR)/$(RPD_VERSION)

	java -jar $(CLOSURE_COMPILER) --language_in $(JS_VERSION) \
								--js ./$(SRC_DIR)/rpd.js \
								--js ./$(SRC_DIR)/render/html.js \
								--js ./$(SRC_DIR)/toolkit/core/toolkit.js \
								--js ./$(SRC_DIR)/toolkit/core/render/html.js \
								--js ./$(SRC_DIR)/toolkit/anm/model.js \
								--js ./$(SRC_DIR)/toolkit/anm/toolkit.js \
								--js ./$(SRC_DIR)/toolkit/anm/render/html.js \
								--js_output_file ./$(DIST_DIR)/rpd-core-anm-html.min.js
	echo $(LICENSE_LINE) | cat - ./$(DIST_DIR)/rpd-core-anm-html.min.js > ./tmp && mv ./tmp ./$(DIST_DIR)/rpd-core-anm-html.min.js
	cp ./$(DIST_DIR)/rpd-core-anm-html.min.js ./$(DIST_DIR)/$(RPD_VERSION)

	cat ./$(SRC_DIR)/render/html.css \
		./$(SRC_DIR)/toolkit/core/render/html.css \
		./$(SRC_DIR)/toolkit/anm/render/html.css > ./$(DIST_DIR)/rpd-core-anm.css
	echo $(LICENSE_LINE) | cat - ./$(DIST_DIR)/rpd-core-anm.css > ./tmp && mv ./tmp ./$(DIST_DIR)/rpd-core-anm.css
	cp ./$(DIST_DIR)/rpd-core-anm.css ./$(DIST_DIR)/$(RPD_VERSION)/rpd-core-anm.css

.PHONY:  all deps dist-html dist-pd-html dist-anm-html
.SILENT: all deps dist-html dist-pd-html dist-anm-html
