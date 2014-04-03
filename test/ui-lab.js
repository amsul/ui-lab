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


// Set the lab up in “test” mode.
uiLab.setMode('test')


describe('.getFileDeclarations()', function() {

    it('Parses allowed declarations in a file', function() {

        var sourcePath = './patterns/styles/objects/banner.less'
        var resultPath = './results/banner.json'

        var sourceDeclarations = uiLab.getFileDeclarations(sourcePath, {
            allow: ['block', 'modifier']
        })

        var resultDeclarations = readFileSync(resultPath)
        resultDeclarations = JSON.parse(resultDeclarations)
        sourceDeclarations.should.eql(resultDeclarations)

    })

    it('Throws an error when no declarations are found in a file', function() {

        var filePath = './patterns/styles/_none.less'
        var declarations = function() {
            uiLab.getFileDeclarations(filePath)
        }
        declarations.should.throw('No declarations found in "./patterns/styles/_none.less".')

        filePath = './patterns/scripts/_none.js'
        declarations = function() {
            uiLab.getFileDeclarations(filePath)
        }
        declarations.should.throw('No declarations found in "./patterns/scripts/_none.js".')

    })

    it('Throws an error when unrecognized declarations are found in a file', function() {

        var filePath = './patterns/styles/_unrecognized.less'
        var declarations = function() {
            uiLab.getFileDeclarations(filePath)
        }
        declarations.should.throw('Unrecognized declaration "<random> component" found in ' +
            '"./patterns/styles/_unrecognized.less". There are no known allowed declaration types provided.')

        declarations = function() {
            uiLab.getFileDeclarations(filePath, {
                allow: ['nothing', 'here', 'dude']
            })
        }
        declarations.should.throw('Unrecognized declaration "<random> component" found in ' +
            '"./patterns/styles/_unrecognized.less". The declaration type must be one of the following: "<nothing>", "<here>", "<dude>".')

        filePath = './patterns/scripts/_unrecognized.js'
        declarations = function() {
            uiLab.getFileDeclarations(filePath)
        }
        declarations.should.throw('Unrecognized declaration "<random> component" found in ' +
            '"./patterns/scripts/_unrecognized.js". There are no known allowed declaration types provided.')

        declarations = function() {
            uiLab.getFileDeclarations(filePath, {
                allow: ['nope']
            })
        }
        declarations.should.throw('Unrecognized declaration "<random> component" found in ' +
            '"./patterns/scripts/_unrecognized.js". The declaration type must be one of the following: "<nope>".')

    })

    it('Throws an error when a declaration must be the first in a file', function() {

        var filePath = './patterns/styles/_first.less'
        var declarations = function() {
            uiLab.getFileDeclarations(filePath, {
                allow: ['block', 'element'],
                first: 'block'
            })
        }
        declarations.should.throw('The "<block>" declaration must be the first declaration in the file ' +
            '"./patterns/styles/_first.less" - but "<element>" appears first instead.')

        filePath = './patterns/styles/_firstmissing.less'
        declarations = function() {
            uiLab.getFileDeclarations(filePath, {
                allow: ['block', 'element'],
                first: 'block'
            })
        }
        declarations.should.throw('The "<block>" declaration must be the first declaration in the file ' +
            '"./patterns/styles/_firstmissing.less" - but "<element>" appears first instead.')

    })

    it('Throws an error when a contextual declaration is in the wrong context', function() {

        var filePath = './patterns/styles/_contextless.less'
        var declarations = function() {
            uiLab.getFileDeclarations(filePath, {
                allow: ['block', 'modifier'],
                context: {
                    modifier: ['block']
                }
            })
        }
        declarations.should.throw('The "<modifier>" declaration has no context in the file ' +
            '"./patterns/styles/_contextless.less" - but it must be declared after one of the following: "<block>".')

        filePath = './patterns/styles/_contextwrong.less'
        declarations = function() {
            uiLab.getFileDeclarations(filePath, {
                allow: ['block', 'modifier', 'random'],
                context: {
                    random: ['element', 'modifier', 'mod-random']
                }
            })
        }
        declarations.should.throw('The "<random>" declaration appears after "<block>" in the file ' +
            '"./patterns/styles/_contextwrong.less" - but it must be declared after one of the ' +
            'following: "<element>", "<modifier>", "<mod-random>".')
    })

})


describe('.getPathDeclarations()', function() {

    var sourceGlobPattern = './patterns/markups/objects/**/*.html'
    var resultPath = './results/markups.json'

    var sourceDeclarations = uiLab.getPathDeclarations(sourceGlobPattern)

    var resultDeclarations = readFileSync(resultPath)
    resultDeclarations = JSON.parse(resultDeclarations)

    it('Parses declarations from a globbing pattern', function() {
        sourceDeclarations.should.eql(resultDeclarations)
    })

})


describe('.buildPatterns()', function() {

    describe('For variables', function() {

        var sourcePatterns = uiLab.buildPatterns({
            variables: './patterns/styles/_variables.less'
        })
        var resultPath = './results/variables.json'

        var resultPatterns = readFileSync(resultPath)
        resultPatterns = JSON.parse(resultPatterns)

        it('Builds patterns given a globbing pattern to the variables file(s)', function() {
            sourcePatterns.should.eql(resultPatterns)
        })

    })

    // ....test helper styles have <helper> only
    describe('For helpers', function() {

        var sourcePatterns = uiLab.buildPatterns({
            helpers: {
                styles: './patterns/styles/helpers/**/*.less',
                markups: './patterns/markups/helpers/**/*.html'
            }
        })
        var resultPath = './results/helpers.json'

        var resultPatterns = readFileSync(resultPath)
        resultPatterns = JSON.parse(resultPatterns)

        it('Builds patterns given a globbing pattern to the helpers file(s)', function() {
            sourcePatterns.should.eql(resultPatterns)
        })

    })

    describe('For objects', function() {

        var sourcePatterns = uiLab.buildPatterns({
            objects: {
                markups: './patterns/markups/objects/**/*.html',
                styles: './patterns/styles/objects/**/*.less',
                scripts: './patterns/scripts/objects/**/*.js'
            }
        })
        var resultPath = './results/objects.json'

        var resultPatterns = readFileSync(resultPath)
        resultPatterns = JSON.parse(resultPatterns)

        it('Builds patterns given globbing patterns to the markups, styles, and scripts', function() {
            sourcePatterns.should.eql(resultPatterns)
        })

    })

})
