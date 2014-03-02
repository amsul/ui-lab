/*!
 * UI Lab v0.1.0, 24 February, 2014
 * By Amsul, http://amsul.ca
 * Hosted on http://github.com/amsul/ui-lab
 */

'use strict';


var _ = require('lodash')
var glob = require('glob')
var fs = require('fs')
var iconv = require('iconv-lite')
require('colors')



var CACHE_NAMES = {}
var CACHE_PATHS = {}
var MODE = 'debug'
var DEFAULTS = {
    markups: {
        demos: {
            src: null,
            buildFromPath: true
        }
    },
    styles: {
        variables: {
            src: null,
            noNameCascades: true,
            allow: ['variables', 'functions', 'group'],
            namespace: {
                variables: 'base',
                functions: 'base'
            },
            manipulate: {
                variables: function(declaration) {
                    if ( declaration.code && declaration.demo ) {
                        declaration.demo = interpolateVariables(declaration.code, declaration.demo)
                    }
                    else {
                        declaration.code = ''
                        declaration.demo = []
                    }
                },
                group: function(declaration) {
                    if ( declaration.code && declaration.demo ) {
                        declaration.demo = interpolateVariables(declaration.code, declaration.demo)
                    }
                }
            }
        },
        helpers: {
            src: null,
            allow: ['helper'],
            useFilename: true
        },
        objects: {
            src: null,
            allow: ['block', 'modifier', 'element', 'element-modifier'],
            namespace: {
                block: 'base',
                modifier: true
            },
            manipulate: {
                modifier: function(declaration) {
                    var comment = '// Extension of .' + declaration.sourceName + ' {}\n'
                    declaration.code = comment + declaration.code
                },
                'element': function(declaration) {
                    var comment,
                        parentName = declaration.namespace
                    if ( declaration.sourceName != parentName ) {
                        parentName = declaration.sourceName + '_' + parentName
                    }
                    comment = '// Descendant of .' + parentName + ' {}\n'
                    declaration.code = comment + declaration.code
                },
                'element-modifier': function(declaration) {
                    var comment,
                        sourceName = declaration.sourceName,
                        parentName = declaration.namespace,
                        extensionName = sourceName + '-' + declaration.variationName.split('_')[0]
                    if ( sourceName != parentName ) {
                        parentName = sourceName + '_' + parentName
                    }
                    comment = '// Descendant of .' + parentName + ' {}\n' +
                        '// Extension of .' + extensionName + ' {}\n'
                    declaration.code = comment + declaration.code
                }
            }
        }
    },
    scripts: {
        widgets: {
            src: null,
            allow: ['widget'],
            okWithout: true
        }
    }
}



module.exports = {
    getDeclarations: getDeclarations,
    // validatePatterns: validatePatterns,
    initiate: initiate,
    getDefaults: function() {
        return _.merge({}, DEFAULTS)
    },
    setMode: function(mode) {
        MODE = mode
    }
}



function log(msg) {
    if (MODE == 'debug') process.stdout.write(msg)
}
function logLn(msg) {
    if (MODE == 'debug') log(msg + '\n')
}
function logThrow(msg) {
    logLn('')
    throw new ReferenceError(msg)
}



_.mixin({
    capitalize: function(word) {
        return word[0].toUpperCase() + word.slice(1)
    },
    capitalizeSplit: function(string) {
        return string.split('').map(function(letter) {
            return letter.match(/[A-Z]/) ? ' ' + letter : letter
        }).join('').split(/-|_/).map(_.capitalize).join(' ')
    }
})



function initiate(options) {

    CACHE_NAMES = {}
    CACHE_PATHS = {}

    var filePaths
    var targetOptions
    var objectsData = {}
    var variablesData = {}

    if ( !_.isPlainObject(options) ) {
        options = {}
    }

    options = _.merge({}, DEFAULTS, options)

    // Start with the markup so it’s sorted.
    log('Generating ' + 'markups.demos '.cyan)
    targetOptions = options.markups.demos
    filePaths = glob.sync(targetOptions.src)
    if (!filePaths.length) {
        logThrow('No markups for demos found in ' + targetOptions.src)
    }
    filePaths.forEach(function(filePath) {
        var declaration = getDeclarations(filePath, targetOptions),
            namespace = declaration.namespace,
            variation = declaration.variation
        objectsData[namespace] = objectsData[namespace] || {}
        objectsData[namespace].variations = objectsData[namespace].variations || {}
        objectsData[namespace].variations[variation] = objectsData[namespace].variations[variation] || {}
        objectsData[namespace].variations[variation].markup = declaration
    })
    logLn('OK'.green)

    // Move on to the styles helpers.
    log('Generating ' + 'styles.helpers '.cyan)
    targetOptions = options.styles.helpers
    filePaths = glob.sync(targetOptions.src)
    filePaths.forEach(function(filePath) {
        var namespace,
            declarations = getDeclarations(filePath, targetOptions)
        declarations.forEach(function(declaration, index) {
            var type = declaration.type,
                variation = declaration.variation
            if ( type != 'helper' ) {
                logThrow('The helper file at ' + filePath +
                    ' can only have "<helper>" declarations.')
            }
            if ( index === 0 ) {
                namespace = declaration.namespace
            }
            objectsData[namespace] = objectsData[namespace] || {}
            objectsData[namespace].title = objectsData[namespace].title || _.capitalizeSplit(namespace)
            objectsData[namespace].variations = objectsData[namespace].variations || {}
            objectsData[namespace].variations[variation] = objectsData[namespace].variations[variation] || {}
            objectsData[namespace].variations[variation].title = _.capitalizeSplit(variation)
            objectsData[namespace].variations[variation].slug = declaration.fullName
            objectsData[namespace].variations[variation].styles = declaration
        })
    })
    logLn('OK'.green)


    // Next on to the styles objects.
    log('Generating ' + 'styles.objects '.cyan)
    targetOptions = options.styles.objects
    filePaths = glob.sync(targetOptions.src)
    filePaths.forEach(function(filePath) {
        var namespace,
            declarations = getDeclarations(filePath, targetOptions)
        declarations.forEach(function(declaration, index) {
            var type = declaration.type,
                variation = declaration.variation
            if ( index === 0 ) {
                if ( type != 'block' ) {
                    logThrow('The first declaration within ' +
                        filePath + ' must be a "<block>" declaration.')
                }
                namespace = declaration.namespace
            }
            objectsData[namespace] = objectsData[namespace] || {}
            objectsData[namespace].title = objectsData[namespace].title || _.capitalizeSplit(namespace)
            objectsData[namespace].variations = objectsData[namespace].variations || {}
            objectsData[namespace].variations[variation] = objectsData[namespace].variations[variation] || {}
            objectsData[namespace].variations[variation].title = _.capitalizeSplit(variation)
            objectsData[namespace].variations[variation].slug = declaration.fullName
            objectsData[namespace].variations[variation].styles = declaration
        })
    })
    logLn('OK'.green)


    // Next on to the scripts.
    log('Generating ' + 'scripts.widgets '.cyan)
    targetOptions = options.scripts.widgets
    filePaths = glob.sync(targetOptions.src)
    filePaths.forEach(function(filePath) {
        var declarations = getDeclarations(filePath, targetOptions)
        declarations.forEach(function(declaration) {
            var namespace = declaration.namespace
            objectsData[namespace] = objectsData[namespace] || {}
            objectsData[namespace].apis = declaration
        })
    })
    logLn('OK'.green)


    // Make sure the information we have so far it complete.
    log('Validating ' + 'demos, helpers, and objects '.cyan)
    validateObjectPatterns(objectsData)
    logLn('OK'.green)


    // Finally, do the styles variables.
    log('Generating ' + 'styles.variables '.cyan)
    targetOptions = options.styles.variables
    filePaths = glob.sync(targetOptions.src)
    filePaths.forEach(function(filePath) {
        var namespace,
            declarations = getDeclarations(filePath, targetOptions)
        declarations.forEach(function(declaration/*, index*/) {
            var type = declaration.type,
                variation = declaration.variation
            if ( type.match(/^(variables|functions)$/) ) {
                namespace = declaration.namespace
            }
            variablesData[namespace] = variablesData[namespace] || {}
            variablesData[namespace].title = variablesData[namespace].title || _.capitalizeSplit(namespace)
            variablesData[namespace].variations = variablesData[namespace].variations || {}
            variablesData[namespace].variations[variation] = variablesData[namespace].variations[variation] || {}
            variablesData[namespace].variations[variation].isDemoless = declaration.code.trim().length && declaration.demo ? undefined : true
            variablesData[namespace].variations[variation].title = _.capitalizeSplit(variation)
            variablesData[namespace].variations[variation].slug = declaration.fullName
            variablesData[namespace].variations[variation].variables = declaration
        })
    })
    logLn('OK'.green)


    // Notify the lab generation.
    logLn('>>'.green + ' Lab generated.')


    // Construct and return the final objects composition.
    return {
        variables: {
            title: 'Variables &amp; Mixins',
            slug: 'variables-mixins',
            declarations: variablesData
        },
        objects: {
            title: 'Objects &amp; Helpers',
            slug: 'objects-helpers',
            declarations: objectsData
        }
    }
}



function readFileSync(filePath) {
    var buffer = fs.readFileSync(filePath)
    return iconv.decode(buffer, 'utf8')
}



function getDeclarations(filePath, options) {

    var declarations = []

    options = _.isPlainObject(options) ? options : {}

    if ( options.buildFromPath ) {
        return buildDeclarationFromPath(filePath)
    }

    var contentMatch, declaration,
        regex = /(\ *)(\/\*[\s\S]*?\*\/)([\s\S]*)/,
        fileContents = readFileSync(filePath)

    while /*if*/ ( (contentMatch = fileContents.match(regex)) ) { // NOTE: assignment
        declaration = buildDeclarationFromMatch(contentMatch, filePath, options)
        fileContents = fileContents.slice(declaration.length)
        if ( declaration.fullName && declaration.fullName in CACHE_PATHS ) {
            logThrow('The declaration "' + declaration.fullName + '" ' +
                'made in ' + filePath + ' has already been declared in ' +
                CACHE_PATHS[declaration.fullName] + '.')
        }
        CACHE_PATHS[declaration.fullName] = filePath
        if ( declaration.type ) {
            declarations.push(declaration)
        }
    }

    if ( !declarations.length && !options.okWithout ) {
        logThrow('No declarations found within ' + filePath + '.')
    }

    return declarations
}



function buildDeclarationFromPath(filePath) {
    var pathSplit = filePath.split('/'),
        namespace = pathSplit[pathSplit.length - 2].replace(/^\[\d+\]/, ''),
        variation = pathSplit[pathSplit.length - 1].replace(/^\[\d+\]/, '').replace(/\.html$/, ''),
        fullName = namespace + '/' + variation,
        code = readFileSync(filePath)
    var declaration = {
        filePath: filePath,
        namespace: namespace,
        variation: variation,
        fullName: fullName,
        code: code
    }
    // console.log(declaration)
    return declaration
}



function buildDeclarationFromMatch(contentMatch, filePath, options) {

    var fullName, namespace, namespaceType, folderName, sourceName,
        filePathSplit = filePath.split('/'),
        indent = contentMatch[1],
        comment = contentMatch[2],
        contentLeft = contentMatch[3],
        statement = comment.match(/<([\w-_]+)>\s*?([\w-_]+)/),
        type = statement && statement[1],
        variation = statement && statement[2],
        demo = comment.match(/```([\s\S]*?)```/),
        contentLeftMatch = contentLeft && contentLeft.match(/([\s\S]*?)\/\*[\s\S]*?\*\//),
        code = contentLeftMatch ? contentLeftMatch[1] : contentLeft,
        nextIndent = code && code.match(/\ *$/)

    // If it's just a regular comment block, simply return the length.
    if ( !type && !variation ) {
        return {
            length: indent.length + comment.length
        }
    }

    // Make sure we have usable information.
    if ( !type || !variation ) {
        logThrow('Invalid declaration found in ' + filePath + ':\n' + comment + '\n')
    }
    if ( !options.allow || options.allow.indexOf(type) < 0 ) {
        logThrow('Unrecognized declaration ' +
            '"<' + type + '> ' + variation + '" found in ' + filePath + '. ' +
            ( options.allow ?
                'The declaration type must be one of the following: ' +
                '"<' + options.allow.join('>", "<') + '>".' :
                'There are no known allowed declaration types provided.'
            )
        )
    }

    // Update if a demo was matched within the comment.
    if ( demo ) {
        demo = demo[1]
    }

    // If the code ends with an indentation,
    // remove it from the code block.
    if ( nextIndent && nextIndent[0].length ) {
        code = code.slice(0, -nextIndent[0].length)
    }

    // Default the namespace to the variation.
    namespace = variation

    // Check if we need to namespace the full name and demo.
    if ( options && (options.namespace || options.useFilename) ) {

        namespaceType = options.namespace && options.namespace[type]

        // When a namespacing is there, store it in the cache.
        if ( namespaceType ) {
            CACHE_NAMES[filePath] = CACHE_NAMES[filePath] || {}
            if ( typeof namespaceType == 'string' ) {
                CACHE_NAMES[filePath].namespace = fullName = namespaceType
            }
            else {
                CACHE_NAMES[filePath].sourceName = CACHE_NAMES[filePath].sourceName || CACHE_NAMES[filePath].variation
                CACHE_NAMES[filePath].namespace = variation
                namespace = CACHE_NAMES[filePath].variation
            }
            CACHE_NAMES[filePath].demo = demo
            CACHE_NAMES[filePath].variation = variation
        }

        // Otherwise check the file path's cache.
        else if ( filePath in CACHE_NAMES ) {
            namespace = CACHE_NAMES[filePath].variation
            fullName = (options.noNameCascades ? '' : CACHE_NAMES[filePath].namespace + '-') + variation
            demo = demo || CACHE_NAMES[filePath].demo
        }

        // If there's nothing in the cache, check if there
        // should be namespacing using the file name.
        else {
            folderName = filePathSplit[filePathSplit.length - 2]
            if ( options.useFilename ) {
                namespace = filePathSplit[filePathSplit.length - 1].replace(/\.[\s\S]+$/, '')
            }
            else {
                logThrow('No "base sectioning" declaration found for ' +
                    '"<' + type + '> ' + variation + '" in ' + filePath + '.')
            }
        }

        sourceName = CACHE_NAMES[filePath] && CACHE_NAMES[filePath].sourceName || namespace
    }

    // Construct the actual declaration object.
    var declaration = {
        filePath: filePath,
        length: indent.length + comment.length + code.length,
        comment: comment,
        namespace: namespace || fullName,
        type: type,
        variation: fullName || variation,
        fullName: (namespace ? namespace + '/' : '') + (fullName || variation),
        sourceName: sourceName || 'FIXME',
        variationName: variation,
        demo: removeExtraSpacing(demo, { unindent: true }),
        code: removeExtraSpacing(code)
    }

    // Update the declaration if needed.
    if ( options.manipulate && options.manipulate[type] ) {
        options.manipulate[type](declaration)
    }

    // console.log(declaration)

    return declaration
}



function removeExtraSpacing(content, options) {
    if ( !content ) return
    var indentRegEx = /^\s*?(\ *?)[^\s]/,
        contentRegEx = /^\s*([\s\S]+?)(\s*)$/,
        indentation = content.split(indentRegEx)[1] || '',
        snippet = content.split(contentRegEx)[1] || ''
    snippet = snippet.match(/[^\s]/) ? snippet : ''
    content = indentation + snippet
    if ( options && options.unindent ) {
        content = content.replace( new RegExp('^' + indentation, 'gm'), '' )
    }
    return content
}



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



// Make sure dependencies are all there.
function validateObjectPatterns(objectsData) {
    for ( var pattern in objectsData ) {
        var patternObj = objectsData[pattern]
        for ( var variation in patternObj.variations ) {
            var variationObj = patternObj.variations[variation]
            if ( !('markup' in variationObj) ) {
                logThrow('No HTML markup found for the pattern declared as "' +
                    pattern + '/' + variation +
                    '" in ' + variationObj.styles.filePath + '.'
                )
            }
            if ( !('styles' in variationObj) ) {
                logThrow('No LESS styles found for the pattern declared as "' +
                    pattern + '/' + variation +
                    '" in ' + variationObj.markup.filePath + '.'
                )
            }
        }
        if ( 'apis' in patternObj ) {
            var apiVariation = patternObj.apis.variation
            if ( !patternObj.variations ) {
                logThrow('Need both HTML markup and LESS styles for the ' +
                    'pattern declared as "' + pattern + '/' + apiVariation +
                    '" in ' + patternObj.apis.filePath + '.')
            }
            else {
                console.log( 'TODO: `widgets`', pattern, 'variation' )
            }
        }
    }
}
