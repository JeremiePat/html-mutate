/* global describe, it */

'use strict'

// Testing the module API
// ----------------------------------------------------------------------------
const fs = require('fs')
const path = require('path')
const assert = require('assert')

const tpl = require('../index.js')
const concat = require('../lib/concat.js')

const tplFile = path.join(__dirname, 'tpl', 'test.html')
const tplContent = fs.readFileSync(tplFile, 'utf8')

// Test definitions
// ----------------------------------------------------------------------------

describe('Testing the module API', function () {
  it('The module is a function', function () {
    assert.strictEqual(typeof tpl, 'function', 'The module should be a function')
  })

  describe('Calling the module return a template function', function () {
    describe('template', function () {
      it('The template is a function', function () {
        var template = tpl(tplFile)

        assert.strictEqual(typeof template, 'function', 'The template should be a function')
      })

      it('Calling the template return a Duplex stream', function () {
        var template = tpl(tplFile)
        var rs = template({})

        assert.strictEqual(typeof rs.pipe, 'function', 'The template should return a stream')
        assert.strictEqual(typeof rs.write, 'function', 'The return stream should have a "write" method')
        assert.strictEqual(typeof rs.read, 'function', 'The return stream should have a "read" method')
      })

      it('Calling the template output a stream of HTML', function (done) {
        var template = tpl(tplFile)
        var rs = template({})

        rs.pipe(concat(function (err, html) {
          if (err) { assert.ok(false, 'No error expected') }

          assert.strictEqual(html, tplContent, 'The stream should output the HTML template untouch')
          done()
        }))
      })
    })

    describe('template.inject', function () {
      it('The template has a method call "inject"', function () {
        var template = tpl(tplFile)

        assert.strictEqual(typeof template.inject, 'function', 'The template should have a method called "inject"')
      })

      it('Calling template.inject return a Duplex stream', function () {
        var template = tpl(tplFile)
        var rs = template.inject({})

        assert.strictEqual(typeof rs.pipe, 'function', 'The template should return a stream')
        assert.strictEqual(typeof rs.write, 'function', 'The return stream should have a "write" method')
        assert.strictEqual(typeof rs.read, 'function', 'The return stream should have a "read" method')
      })
    })

    describe('template.promise', function () {
      it('The template has a method call "promise"', function () {
        var template = tpl(tplFile)

        assert.strictEqual(typeof template.promise, 'function', 'The template should have a method called "promise"')
      })

      it('Calling template.promise return a Promise', function () {
        var template = tpl(tplFile)
        var promise = template.promise({})

        assert.strictEqual(typeof promise.then, 'function', 'The return Promise should have a "then" method')
        assert.strictEqual(typeof promise.catch, 'function', 'The return stream should have a "catch" method')
      })

      it('A resolved Promise get an HTML string as result', function (done) {
        var template = tpl(tplFile)
        var promise = template.promise({})

        promise.then(function (html) {
          assert.strictEqual(html, tplContent, 'The resolve promise should provide the HTML template untouch')
          done()
        }).catch(function () {
          assert.ok(false)
          done()
        })
      })
    })

    describe('template.callback', function () {
      it('The template has a method call "callback"', function () {
        var template = tpl(tplFile)

        assert.strictEqual(typeof template.callback, 'function', 'The template should have a method called "callback"')
      })

      it('A successful callback get an HTML string as result', function (done) {
        var template = tpl(tplFile)

        template.callback({}, function (err, html) {
          if (err) {
            assert.ok(false, 'The callback should be call successfully')
          }

          assert.strictEqual(html, tplContent, 'The resolve promise should provide the HTML template untouch')
          done()
        })
      })
    })
  })
})
