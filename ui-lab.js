/*!
 * UI Lab v0.1.6, 04 April, 2014
 * By Amsul, http://amsul.ca
 * Hosted on http://github.com/amsul/ui-lab
 */

'use strict';


var _ = require('lodash')
var glob = require('glob')
var fs = require('fs')
var iconv = require('iconv-lite')
require('colors')


/**
 * Synchronously read a file.
 */
function readFileSync(filePath) {
    var buffer = fs.readFileSync(filePath)
    return iconv.decode(buffer, 'utf8')
}


/**
 * Get declarations from a path.
 */
function getPathDeclarations(globPattern) {

    var filePaths = glob.sync(globPattern)
    var declarations = []

    filePaths.forEach(function(filePath) {
        var pathSplit = filePath.split('/')
        var pattern = pathSplit[pathSplit.length - 2].replace(/^\[\d+\]/, '')
        var variation = pathSplit[pathSplit.length - 1].replace(/^\[\d+\]/, '').replace(/\.\w+?$/, '')
        var declaration = {
            filePath: filePath,
            pattern: pattern,
            variation: variation,
            code: readFileSync(filePath)
        }
        declarations.push(declaration)
    })

    return declarations
}


/**
 * Get declarations from a file.
 */
function getFileDeclarations(filePath, options) {

    var fileContents = readFileSync(filePath)
    var declarationRegExp = /(\ *)(\/\*[\s\S]*?\*\/)\n*([\s\S]*)/
    var declarations = []
    var match

    options = options || {}

    while /*if*/ ( (match = fileContents.match(declarationRegExp)) ) { // NOTE: assignment
        var declaration = parseDeclarationFromMatch(match, filePath);
        fileContents = fileContents.slice(declaration.length)
        verifyDeclarationContext(declaration, declarations[declarations.length-1], filePath, options)
        if ( verifyDeclarationValidity(declaration, options) ) {
            declarations.push(declaration)
        }
    }

    // If there’s a trailing chunk left over, add that to the actual code.
    if ( filePath == 'assets/styles/_variables.less' ) {
        var lastDeclaration = declarations[declarations.length - 1]
        if ( lastDeclaration.codeAfter ) {
            lastDeclaration.code += lastDeclaration.codeAfter
            lastDeclaration.codeAfter = ''
        }
    }

    if ( !declarations.length ) {
        warn('No declarations found in "' + filePath + '".')
    }

    return declarations
}


/**
 * Build a declaration object from a content match.
 */
function parseDeclarationFromMatch(match, filePath) {

    // Match the base of the declaration.
    var declarationIndent = match[1]
    var declarationComment = match[2]
    var declarationContent = match[3]

    // Match the component of the declaration.
    var componentMatch = declarationComment.match(/<([\w-_]+)>\s*?([\w-_]+)(?:\s*([\s\S]*?)(?=\n|```))?/)
    var componentType = componentMatch && componentMatch[1] || ''
    var componentName = componentMatch && componentMatch[2] || ''
    var componentDescription = componentMatch && componentMatch[3] || ''

    // Match the demo of the declaration.
    var demoMatch = declarationComment.match(/```(\w+)?([\s\S]*?)```/)
    var demoLanguage = demoMatch && demoMatch[1]
    var demoContent = demoMatch && demoMatch[2]

    // Match the code of the declaration.
    var declarationCode = ''
    var declarationCodeAfter = ''
    var codeMatch
    var codeFirstChunk
    var codeFirstComment
    var codeTrailingChunk

    // var i = 0

    while (
        // i < 30 &&
        ( codeMatch = declarationContent.match(/([\s\S]*?)(\/\*[\s\S]*?\*\/)([\s\S]*)/) )
    ) {

        // i += 1

        var parsedLength = 0

        codeFirstChunk = codeMatch[1]
        codeFirstComment = codeMatch[2]
        codeTrailingChunk = codeMatch[3]

        // Update the declaration code with the first chunk.
        declarationCode += codeFirstChunk
        parsedLength += codeFirstChunk.length

        // If the first comment has a declaration,
        // add that to the code after.
        if ( codeFirstComment.match(/<[\w-_]*>/) ) {
            declarationCodeAfter = codeFirstComment + codeTrailingChunk
            parsedLength += declarationCodeAfter.length
        }

        // Otherwise add the first comment to the actual code.
        else {
            declarationCode += codeFirstComment
            parsedLength += codeFirstComment.length
        }

        // Reduce the length of the declaration’s content.
        declarationContent = declarationContent.slice(parsedLength)

    }

    // If there’s a trailing chunk left over, add that to the code after.
    if ( codeTrailingChunk &&
        !declarationCodeAfter.match(
            new RegExp(codeTrailingChunk.replace(/[\[\]\(\)\{\}\|\/\\\.\+\*\?\^\$]/g, '\\$&') + '$')
        ) ) {
        declarationCodeAfter += codeTrailingChunk
    }

    // If there’s no declaration code, fallback to the content.
    if ( !declarationCode ) {
        declarationCode = declarationContent
    }

    // Create and return the declaration object.
    var declaration = {
        filePath: filePath,
        componentType: componentType,
        componentName: componentName,
        componentDescription: componentDescription,
        demoLanguage: demoLanguage,
        demoContent: demoContent,
        code: declarationCode,
        codeAfter: declarationCodeAfter,
        length: declarationComment.length + declarationCode.length
    }

    return declaration
}


/**
 * Verify if a declaration is within the right context.
 */
function verifyDeclarationContext(declaration, prevDeclaration, filePath, options) {

    var currentType = declaration.componentType
    var previousType = prevDeclaration && prevDeclaration.componentType
    var context = options && options.context && options.context[currentType]

    if ( !previousType && context && context.length ) {
        warn('The "<' + currentType + '>" declaration has no context ' +
            'in the file "' + filePath + '" - but it must be declared ' +
            'after one of the following: "<' + context.join('>", "<') + '>".')
    }
    if ( !previousType && 'first' in options && options.first !== currentType ) {
        warn('The "<' + options.first + '>" declaration must be ' +
            'the first declaration in the file "' + filePath + '"' +
            (currentType ?
                ' - but "<' + currentType + '>" appears first instead' :
                '' ) +
            '.')
    }
    if ( previousType && context && context.indexOf(previousType) < 0 ) {
        warn('The "<' + currentType + '>" declaration appears after ' +
            '"<' + previousType + '>" in the file "' + filePath + '" - ' +
            'but it must be declared after one of the following: ' +
            '"<' + context.join('>", "<') + '>".')
    }

}


/**
 * Verify if a declaration is valid.
 */
function verifyDeclarationValidity(declaration, options) {

    var isOkay = true
    var checks = [
        function isComponentDeclaration() {
            return declaration.componentType && declaration.componentName
        },
        function isComponentAllowed() {
            var type = declaration.componentType
            var variation = declaration.componentName
            var isAllowed = options.allow &&
                options.allow.indexOf(type) > -1
            if ( !isAllowed ) {
                warn('Unrecognized declaration ' +
                    '"<' + type + '> ' + variation + '" found in "' + declaration.filePath + '". ' +
                    ( options.allow ?
                        'The declaration type must be one of the following: ' +
                        '"<' + options.allow.join('>", "<') + '>".' :
                        'There are no known allowed declaration types provided.'
                    )
                )
            }
            return isAllowed
        }
    ]

    for ( var i = 0; i < checks.length; i += 1 ) {
        isOkay = !!checks[i]()
        if ( !isOkay ) {
            break
        }
    }

    return isOkay
}


/**
 * Build patterns found within the markups’ glob pattern.
 */
function buildPatterns(options) {

    var patternsRegistry = {
        variables: [],
        helpers: [],
        objects: []
    }

    if ( options.variables ) {
        buildPatternsForVariables(patternsRegistry.variables, options)
    }

    if ( options.helpers ) {
        buildPatternsForHelpers(patternsRegistry.helpers, options)
    }

    if ( options.objects ) {
        buildPatternsForObjects(patternsRegistry.objects, options)
    }

    return patternsRegistry
}


/**
 * Build patterns for variables using the source and demos.
 */
function buildPatternsForVariables(variablesPatternsRegistry, options) {

    var cachedNames = {}
    var cachedPatterns = {}

    logSilent('Generating the variables’ styles and markups... ')

    var variableStylesPaths = glob.sync(options.variables)
    var latestPatternName
    variableStylesPaths.forEach(function(variableStylesPath) {
        var declarations = getFileDeclarations(variableStylesPath, {
            allow: ['variables', 'group']
        })
        var name
        var demo
        declarations.forEach(function(declaration, index) {
            // if(index>0)return
            var variationName = declaration.componentName
            var description = declaration.componentDescription
            if ( declaration.componentType == 'variables' ) {
                name = variationName
                variationName = 'base'
                description = 'The base variables'
                demo = cleanWrappingWhitespace(declaration.demoContent)
            }
            var variablesPattern
            if ( name in cachedPatterns ) {
                variablesPattern = cachedPatterns[name]
            }
            else {
                variablesPattern = cachedPatterns[name] = {
                    name: name,
                    title: capitalizeSplit(name),
                    description: declaration.componentDescription || '',
                    variations: []
                }
            }
            var fullName = name + '/' + variationName
            if ( fullName in cachedNames ) {
                warn('Styles for the pattern "' + fullName + '" already exist.')
            }
            cachedNames[fullName] = true
            if ( !declaration.code ) return
            var variablesPatternVariation = {
                name: variationName,
                title: capitalizeSplit(variationName),
                description: description || '',
                demos: interpolateVariables(declaration.code, demo),
                source: {
                    styles: {
                        path: declaration.filePath,
                        code: cleanWrappingWhitespace(declaration.code),
                    },
                    markup: {
                        path: declaration.filePath,
                        code: cleanWrappingWhitespace(demo)
                    }
                }
            }
            variablesPattern.variations.push(variablesPatternVariation)
            if ( latestPatternName !== name ) {
                latestPatternName = name
                variablesPatternsRegistry.push(cachedPatterns[name])
            }
        })
    })

    logSilent('OK\n')

}


/**
 * Build patterns for helpers using styles and markups.
 */
function buildPatternsForHelpers(helpersPatternsRegistry, options) {

    var cachedVariations = {}
    var cachedPatterns = {}
    var cachedCompletedVariations = {}

    logSilent('Generating the helpers’ styles... ')

    var helpersStylesPaths = glob.sync(options.helpers.styles)
    helpersStylesPaths.forEach(function(helpersStylesPath) {
        var declarations = getFileDeclarations(helpersStylesPath, {
            allow: ['helper']
        })
        var pathDeclaration = getPathDeclarations(helpersStylesPath)
        var name = pathDeclaration[0].variation
        declarations.forEach(function(declaration, index) {
            // if(index>0)return
            var variationName = declaration.componentName
            var description = declaration.componentDescription
            var helperPattern
            if ( name in cachedPatterns ) {
                helperPattern = cachedPatterns[name]
            }
            else {
                helperPattern = cachedPatterns[name] = {
                    name: name,
                    title: capitalizeSplit(name),
                    description: declaration.componentDescription || '',
                    variations: []
                }
            }
            var fullName = name + '/' + variationName
            if ( fullName in cachedVariations ) {
                warn('Styles for the pattern "' + fullName + '" already exist.')
            }
            var helperPatternVariation = {
                name: variationName,
                title: capitalizeSplit(variationName),
                description: description || '',
                source: {
                    styles: {
                        path: declaration.filePath,
                        component: declaration.componentType,
                        code: cleanWrappingWhitespace(declaration.code)
                    }
                }
            }
            cachedVariations[fullName] = helperPatternVariation
        })
    })

    logSilent('OK\n')

    logSilent('Generating the helpers’ markups... ')

    var helpersDeclarations = getPathDeclarations(options.helpers.markups)
    var latestHelperName
    helpersDeclarations.forEach(function(helpersDeclaration, index) {
        // if(index)return
        var name = helpersDeclaration.pattern
        var variationName = helpersDeclaration.variation
        var fullName = name + '/' + variationName
        if ( !(fullName in cachedVariations) ) {
            warn('Styles for the pattern "' + fullName + '" are not defined.')
        }
        cachedCompletedVariations[fullName] = true
        var patternVariation = cachedVariations[fullName]
        patternVariation.demo = helpersDeclaration.code
        patternVariation.source.markup = {
            path: helpersDeclaration.filePath,
            code: helpersDeclaration.code
        }
        cachedPatterns[name].variations.push(patternVariation)
        if ( latestHelperName !== name ) {
            latestHelperName = name
            helpersPatternsRegistry.push(cachedPatterns[name])
        }
    })

    logSilent('OK\n')

    // Verify that all styles have been paired with markups.
    logSilent('Verifying helpers are all matched... ')
    for ( var fullName in cachedVariations ) {
        if ( !(fullName in cachedCompletedVariations) ) {
            warn('Styles for the pattern "' + fullName + '" have no markup.')
        }
    }
    logSilent('OK\n')

}


/**
 * Build patterns for objects using styles, markups, and apis.
 */
function buildPatternsForObjects(objectsPatternsRegistry, options) {

    var cachedNames = {}
    var cachedVariations = {}
    var cachedCompletedVariations = {}
    var cachedPatterns = {}

    logSilent('Generating the objects’ styles... ')

    var objectsStylesPaths = glob.sync(options.objects.styles)
    objectsStylesPaths.forEach(function(objectsStylesPath,index) {
        // if(index>0)return
        var declarations = getFileDeclarations(objectsStylesPath, {
            allow: ['block', 'element', 'modifier', 'element-modifier'],
            first: 'block',
            context: {
                'element': ['block', 'element', 'modifier'],
                'modifier': ['block', 'element', 'modifier', 'element-modifier'],
                'element-modifier': ['block', 'element', 'modifier', 'element-modifier']
            }
        })
        var name
        var namespace
        declarations.forEach(function(declaration, index) {
            // if(index>0)return
            var variationName = declaration.componentName
            var description = declaration.componentDescription
            if ( declaration.componentType == 'block' ) {
                if ( !index ) {
                    name = variationName
                    description = 'The base object'
                }
                namespace = variationName = 'base'
            }
            else if ( declaration.componentType == 'modifier' ) {
                namespace = variationName
            }
            else {
                variationName = namespace + '-' + variationName
            }
            var objectPattern
            if ( name in cachedPatterns ) {
                objectPattern = cachedPatterns[name]
            }
            else {
                objectPattern = cachedPatterns[name] = {
                    name: name,
                    title: capitalizeSplit(name),
                    description: declaration.componentDescription || '',
                    variations: [],
                    api: {}
                }
            }
            var fullName = name + '/' + variationName
            if ( variationName in cachedVariations ) {
                warn('Styles for the pattern "' + fullName + '" already exist.')
            }
            cachedNames[name] = true
            var objectPatternVariation = {
                name: variationName,
                title: capitalizeSplit(variationName),
                description: description || '',
                source: {
                    styles: {
                        path: declaration.filePath,
                        component: declaration.componentType,
                        code: cleanWrappingWhitespace(declaration.code)
                    }
                }
            }
            cachedVariations[fullName] = objectPatternVariation
        })
    })

    logSilent('OK\n')

    logSilent('Generating the objects’ apis... ')

    var objectsScriptsPaths = glob.sync(options.objects.apis)
    objectsScriptsPaths.forEach(function(objectsScriptsPath) {
        var declarations = getFileDeclarations(objectsScriptsPath, {
            allow: ['api']
        })
        declarations.forEach(function(declaration) {
            var name = declaration.componentName
            if ( !(name in cachedNames) ) {
                warn('Styles for the pattern "' + name + '" are not defined.')
            }
            cachedNames[name] = 'done'
            var patternRegistry = cachedPatterns[name]
            patternRegistry.api.markup = {
                filePath: declaration.filePath,
                description: declaration.componentDescription || '',
                code: cleanWrappingWhitespace(declaration.code)
            }
        })
    })

    logSilent('OK\n')

    logSilent('Generating the objects’ markups... ')

    var objectsDeclarations = getPathDeclarations(options.objects.markups)
    var latestObjectName
    objectsDeclarations.forEach(function(objectsDeclaration, index) {
        // if(index)return
        var name = objectsDeclaration.pattern
        var variationName = objectsDeclaration.variation
        var fullName = name + '/' + variationName
        if ( !(fullName in cachedVariations) ) {
            warn('Styles for the pattern "' + fullName + '" are not defined.')
        }
        cachedCompletedVariations[fullName] = true
        var patternVariation = cachedVariations[fullName]
        patternVariation.demo = objectsDeclaration.code
        patternVariation.source.markup = {
            path: objectsDeclaration.filePath,
            code: objectsDeclaration.code
        }
        cachedPatterns[name].variations.push(patternVariation)
        if ( latestObjectName !== name ) {
            latestObjectName = name
            objectsPatternsRegistry.push(cachedPatterns[name])
        }
    })

    logSilent('OK\n')


    // Verify that all styles have been paired with markups.
    logSilent('Verifying objects are all matched... ')
    for ( var fullName in cachedVariations ) {
        if ( !(fullName in cachedCompletedVariations) ) {
            warn('Styles for the pattern "' + fullName + '" have no markup.')
        }
    }
    logSilent('OK\n')

}


/**
 * Helper functions to title case a string.
 */
function capitalize(word) {
    return word ?
        word[0].toUpperCase() + word.slice(1) :
        ''
}
function capitalizeSplit(string) {
    return (string || '').split('').
        map(function(letter) {
            return letter.match(/[A-Z]/) ? ' ' + letter : letter
        }).
        join('').split(/-|_/).
        map(capitalize).join(' ')
}


/**
 * Helper function to manipulate whitespace in a string.
 */
function cleanWrappingWhitespace(string) {
    var match = string && string.match(/([\n\ ]+)?([\s\S]+?)([\n\ ]*?$)/)
    return match && match[2] || ''
}


/**
 * Helper function to interpolate variables into a demo.
 */
function interpolateVariables(code, demo) {
    var regex = /(@[\w-_]+)\s*?:(?:\s+)?([\s\S]*?);/g,
        matches = code.match(regex)
    if ( matches ) {
        matches = matches.map(function(statement) {
            var split = statement.split(regex)
            return demo.replace(/\{\$1\}/g, split[1]).replace(/\{\$2\}/g, split[2])
        })
    }
    return matches
}


/**
 * Environment variables.
 */
var MODE = 'debug'


/**
 * Export the public API.
 */
module.exports = {
    getFileDeclarations: getFileDeclarations,
    getPathDeclarations: getPathDeclarations,
    buildPatterns: buildPatterns,
    setMode: function(mode) {
        MODE = mode
    }
}


/**
 * Log warnings to the console based on the mode.
 */
function warn(msg) {
    if ( MODE == 'debug' || MODE == 'test' ) {
        throw new ReferenceError(msg)
    }
    else {
        log(msg.yellow)
    }
}
function log(msg) {
    process.stdout.write(msg)
}
function logSilent(msg) {
    if ( MODE == 'debug' || MODE == 'test' ) {
        log(msg.match(/^OK(\n|$)/) ? msg.green : msg.cyan)
    }
}



// function removeExtraSpacing(content, options) {
//     if ( !content ) return
//     var indentRegEx = /^\s*?(\ *?)[^\s]/,
//         contentRegEx = /^\s*([\s\S]+?)(\s*)$/,
//         indentation = content.split(indentRegEx)[1] || '',
//         snippet = content.split(contentRegEx)[1] || ''
//     snippet = snippet.match(/[^\s]/) ? snippet : ''
//     content = indentation + snippet
//     if ( options && options.unindent ) {
//         content = content.replace( new RegExp('^' + indentation, 'gm'), '' )
//     }
//     return content
// }
