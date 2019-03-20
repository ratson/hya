'use strict'
const excea = require('execa')

test('--help', async () => {
  const { stdout } = await excea('./cli.js', ['--help'])
  expect(stdout).toMatch(/Commands:/)
})
