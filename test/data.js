/* global describe, it */

'use strict'

// Testing the effect of the data format
// ----------------------------------------------------------------------------
const fs = require('fs')
const path = require('path')
const assert = require('assert')

const tpl = require('../index.js')
const concat = require('../lib/concat.js')

const TPL_FILE = path.join(__dirname, 'tpl', 'test.html')
const DATA_DIR = path.join(__dirname, 'data')
const RESULT_DIR = path.join(__dirname, 'results')

// Test definitions
// ----------------------------------------------------------------------------

describe('Testing DATA API', function () {
  const TESTS = {
    'Replace & Remove Content': [
      { title: 'Regular replace syntax', files: 'replace' },
      { title: 'Compact replace syntax', files: 'replace-compact' },
      { title: 'Remove syntax & empty values', files: 'remove' },
      { title: 'Regular multi-replace syntax', files: 'replace-multiple' },
      { title: 'Compact multi-replace syntax', files: 'replace-multiple-compact' }
    ],
    'Append & Prepend Content': [
      { title: 'Regular append syntax', files: 'append' },
      { title: 'Regular prepend syntax', files: 'prepend' }
    ],
    'Cloning Content': [
      { title: 'Regular clone syntax', files: 'clone' }
    ],
    'Mutating Attributes': [
      { title: 'Changing attribute values', files: 'attributes' },
      { title: 'Removing attributes', files: 'attributes-remove' }
    ]
  }

  Object.keys(TESTS).forEach(function (key) {
    describe(key, function () {
      TESTS[key].forEach(function (test) {
        var JSON = path.join(DATA_DIR, test.files + '.json')
        var HTML = path.join(RESULT_DIR, test.files + '.html')

        it(test.title, function (done) {
          var data = require(JSON)
          var result = fs.readFileSync(HTML, 'utf8')
          var template = tpl(TPL_FILE)

          template(data).pipe(concat(function (err, html) {
            if (err) { assert.ok(false, 'No error expected') }

            assert.strictEqual(html, result, 'The HTML should have been properly transformed')
            done()
          }))
        })
      })
    })
  })
})
