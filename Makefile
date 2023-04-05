CI_VERIFY_GENERATED_FILES := true
GENERATED_FILES += dist/main.js

-include .makefiles/Makefile
-include .makefiles/pkg/js/v1/Makefile
-include .makefiles/pkg/js/v1/with-npm.mk

.makefiles/%:
	@curl -sfL https://makefiles.dev/v1 | bash /dev/stdin "$@"

################################################################################

.PHONY: precommit
precommit:: verify-generated

################################################################################

dist/main.js: artifacts/link-dependencies.touch $(JS_SOURCE_FILES)
	node script/build.js dist/main.js
