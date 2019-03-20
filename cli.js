#!/usr/bin/env node
'use strict'
const importLocal = require('import-local')

if (!importLocal(__filename)) {
  // eslint-disable-next-line global-require
  require('.').run()
}
