/*global
    describe: true,
    it: true
*/

'use strict';

// Grab all the requirements.
var uiLab = require('./../ui-lab.js')
var fs = require('fs')
var iconv = require('iconv-lite')
var glob = require('glob')
require('should')


// Initiate iconv to speed up the tests.
iconv.decode(fs.readFileSync('./package.json'))
function readFileSync(filePath) {
    return iconv.decode(fs.readFileSync(filePath))
}


// Set the lab up in “test” mode and get the defaults.
uiLab.setMode('test')
var defaults = uiLab.getDefaults()


// Let the testing begin..
describe('ui-lab', function() {


    describe('.getDeclarations', function() {

        describe('for styles and scripts', function() {

            it('throws an error when no declarations are found in a file', function() {

                var filePath = './test/fixtures/styles/none.less'
                var declarations = function() {
                    uiLab.getDeclarations(filePath)
                }
                declarations.should.throw(ReferenceError)

                filePath = './test/fixtures/scripts/none.js'
                declarations = function() {
                    uiLab.getDeclarations(filePath)
                }
                declarations.should.throw(ReferenceError)
            })

            it('throws an error when unrecognized declarations are found in a file', function() {
                var filePath = './test/fixtures/styles/unrecognized.less'
                var declarations = function() { return uiLab.getDeclarations(filePath) }
                declarations.should.throw(ReferenceError)

                filePath = './test/fixtures/scripts/unrecognized.js'
                declarations = function() { return uiLab.getDeclarations(filePath) }
                declarations.should.throw(ReferenceError)
            })

            it('returns an array of declarations found in an objects styles file', function() {
                var filePath = './test/fixtures/styles/objects/component.less'
                var declarations = uiLab.getDeclarations(filePath, defaults.styles.objects)
                var filePathResult = './test/expects/styles/objects.json'
                var expectations = readFileSync(filePathResult)
                declarations = JSON.stringify(declarations, null, '  ')
                declarations.should.eql(expectations)
            })

            it('returns an array of declarations found in a widgets scripts file', function() {
                var filePath = './test/fixtures/scripts/widgets/component.js'
                var declarations = uiLab.getDeclarations(filePath, defaults.scripts.widgets)
                var filePathResult = './test/expects/scripts/apis.json'
                var expectations = readFileSync(filePathResult)
                declarations = JSON.stringify(declarations, null, '  ')
                declarations.should.eql(expectations)
            })
        })

        describe('for global styles', function() {

            it('returns an array of declarations found in a helpers styles file while inheriting the file name', function() {
                var filePath = './test/fixtures/styles/helpers/typography.less'
                var declarations = uiLab.getDeclarations(filePath, defaults.styles.helpers)
                var filePathResult = './test/expects/styles/helpers.json'
                var expectations = readFileSync(filePathResult)
                declarations = JSON.stringify(declarations, null, '  ')
                declarations.should.eql(expectations)
            })
        })

        describe('for variables styles', function() {

            it('returns an array of declarations found in a variables styles file while interpolating variables into demos', function() {
                var filePath = './test/fixtures/styles/_vars.less'
                var declarations = uiLab.getDeclarations(filePath, defaults.styles.variables)
                var filePathResult = './test/expects/styles/variables.json'
                var expectations = readFileSync(filePathResult)
                declarations = JSON.stringify(declarations, null, '  ')
                declarations.should.eql(expectations)
            })
        })

        describe('for demo markups', function() {

            it('returns a declaration found in a demo markups file while inheriting from the path', function() {
                var filePath = './test/fixtures/markups/[0]typography/[0]font-sizes.html'
                var declarations = uiLab.getDeclarations(filePath, defaults.markups.demos)
                var filePathResult = './test/expects/markups/inherited.json'
                var expectations = readFileSync(filePathResult)
                declarations = JSON.stringify(declarations, null, '  ')
                declarations.should.eql(expectations)
            })

            it('returns sorted declarations by matching a globbing pattern while inheriting from the path', function() {
                var filePath = './test/fixtures/markups/**/*.html'
                var filePaths = glob.sync(filePath)
                var declarations = filePaths.map(function(filePath) {
                    return uiLab.getDeclarations(filePath, defaults.markups.demos)
                })
                var filePathResult = './test/expects/markups/sorted.json'
                var expectations = readFileSync(filePathResult)
                declarations = JSON.stringify(declarations, null, '  ')
                declarations.should.eql(expectations)
            })
        })

    })


    describe('.initiate', function() {

        it('builds the lab using the options passed', function() {
            var lab = uiLab.initiate({
                markups: {
                    demos: {
                        src: './test/fixtures/markups/**/*.html'
                    }
                },
                styles: {
                    helpers: {
                        src: './test/fixtures/styles/helpers/**/*.less'
                    },
                    objects: {
                        src: './test/fixtures/styles/objects/**/*.less'
                    },
                    variables: {
                        src: './test/fixtures/styles/_vars.less'
                    }
                },
                scripts: {
                    widgets: {
                        src: './test/fixtures/scripts/widgets/**/*.js'
                    }
                }
            })
            var expectations = readFileSync('./test/expects/lab.json')
            lab = JSON.stringify(lab, null, '  ')
            lab.should.eql(expectations)
        })
    })

})
