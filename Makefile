# JavaScript source files
CRAWLER_JS=./src/crawler.js
CONCAT_JS=./src/concat.js

# Commands
CRAWLER_CMD=node $(CRAWLER_JS)
CONCAT_CMD=node $(CONCAT_JS) --format=json

# Options
ANIME_OPTS=--key='アニメシリーズID' --step=1 --converter=anime --format=json

all:
	@echo "available targets:"
	@echo "  anime -- crawl anime db"

anime:
	$(CRAWLER_CMD) animedb1.json $(ANIME_OPTS) --start=1 --end=4737
	$(CRAWLER_CMD) animedb2.json $(ANIME_OPTS) --start=4738 --end=9474
	$(CRAWLER_CMD) animedb3.json $(ANIME_OPTS) --start=9475 --end=14211
	$(CRAWLER_CMD) animedb4.json $(ANIME_OPTS) --start=14212 --end=18937
	$(CONCAT_CMD) animedb1.json animedb2.json animedb3.json animedb4.json \
		--outfile=animedb.json
	rm animedb1.json animedb2.json animedb3.json animedb4.json
