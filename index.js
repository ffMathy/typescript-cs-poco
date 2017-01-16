var util = require('util');
var vm = require('vm');

var typeTranslation = {};

typeTranslation.int = 'number';
typeTranslation.double = 'number';
typeTranslation.float = 'number';
typeTranslation.Int32 = 'number';
typeTranslation.Int64 = 'number';
typeTranslation.short = 'number';
typeTranslation.long = 'number';
typeTranslation.decimal = 'number';
typeTranslation.bool = 'boolean';
typeTranslation.DateTime = 'string';
typeTranslation.Guid = 'string';
typeTranslation.string = 'string';
typeTranslation.JObject = 'any';
typeTranslation.dynamic = 'any';
typeTranslation.object = 'any';

var blockCommentRegex = /\/\*([\s\S]*)\*\//gm;
var lineCommentRegex = /\/\/(.*)/g;
var typeRegex = /( *)(?:public\s*|partial\s*|abstract\s*)*\s*(class|enum|struct|interface)\s+([\w\d_<>, ]+?)(?:\s*:\s*((?:(?:[\w\d\._<>, ]+?)(?:,\s+)?)+))?\s*\{((?:.|\n|\r)+?^\1\})/gm;

function safeRegex(regex, input, options) {
    if(!input) return [];

    var sandbox = {
        results: [],
        regex: regex,
        result: null
    };
    
    var context = vm.createContext(sandbox);
    var sanitizedInput = input
        .replace(/[\n\r]+/gm, '\\n')
        .replace(/\'/g, '\\\'');

    var scriptString = 'while(result=regex.exec(\'' + sanitizedInput + '\')){results.push(result);}';
    var script = new vm.Script(scriptString);
    
    try{
        var timeout = options && options.timeout;
        if(!timeout) timeout = 30000;
        script.runInContext(context, { 
            timeout: timeout.toString()
        });
    } catch(e){
        throw new Error('Regular expression timeout for pattern \'' + regex + '\' and data \'' + input + '\', with ' + sandbox.results.length + ' results gathered so far.\n\nInner error: ' + e);
    }
    
    return sandbox.results;
}

function removeComments(code) {
    var output = code.replace(blockCommentRegex, '');

    var lines = output
        .split('\n')
        .map(function(line) {
            return line.replace(lineCommentRegex, '');
        });

    return lines.join('\n');
}

function generateInterface(className, inherits, input, isInterface, options) {
    var propertyRegex = /(?:(?:((?:public)?)|(?:private)|(?:protected)|(?:internal)|(?:protected internal)) )+(?:(virtual|readonly) )?([\w\d\._<>, \[\]]+?)(\??) ([\w\d]+)\s*(?:{\s*get;\s*(?:private\s*)?set;\s*}|;)/gm;
    var methodRegex = /(?:(?:((?:public)?)|(?:private)|(?:protected)|(?:internal)|(?:protected internal)) )+(?:(virtual|readonly) )?(?:(async) )?(?:([\w\d\._<>, \[\]]+?) )?([\w\d]+)\(((?:.?\s?)*?)\)\s*\{(?:.?\s?)*?\}/gm;
    
    var propertyNameResolver = options && options.propertyNameResolver;
    var methodNameResolver = options && options.methodNameResolver;
    var interfaceNameResolver = options && options.interfaceNameResolver;

    var originalClassName = className;

    if (inherits && interfaceNameResolver) {
        inherits = interfaceNameResolver(inherits);
    }

    if (interfaceNameResolver) {
        className = interfaceNameResolver(className);
    }

    var ignoreInheritance = options && options.ignoreInheritance;
    if (inherits && (!ignoreInheritance || ignoreInheritance.indexOf(inherits) === -1)) {
        className += ' extends ' + inherits;
    }

    var definition = 'interface ' + className + ' {\n';

    if (options && options.dateTimeToDate) {
        typeTranslation.DateTime = 'Date';
        typeTranslation["System.DateTime"] = 'Date';
    } else {
        typeTranslation.DateTime = 'string';
        typeTranslation["System.DateTime"] = 'string';
    }

    if (options && options.customTypeTranslations) {
        for (var key in options.customTypeTranslations) {
            typeTranslation[key] = options.customTypeTranslations[key];
        }
    }

    var leadingWhitespace = '    ';

    var propertyResult;
    for (var propertyResult of safeRegex(propertyRegex, input, options)) {
        var visibility = propertyResult[1];
        if(!isInterface && visibility !== 'public') continue;

        if (options && options.ignoreVirtual) {
            var isVirtual = propertyResult[2] === 'virtual';
            if (isVirtual){ 
                continue;
            }
        }

        var varType = getVarType(propertyResult[3], "property-type", options);

        var isReadOnly = propertyResult[2] === 'readonly';
        var isOptional = propertyResult[4] === '?';

        var propertyName = propertyResult[5];
        if (propertyNameResolver) {
            propertyName = propertyNameResolver(propertyName);
        }
        definition += leadingWhitespace;

        if (options && !options.stripReadOnly && isReadOnly) {
            definition += 'readonly ';
        }

        definition += propertyName;

        if (isOptional) {
            definition += '?';
        }

        definition += ': ' + varType + ';\n';
    }

    if (options && !options.ignoreMethods) {
        var methodResult;
        for (var methodResult of safeRegex(methodRegex, input, options)) {
            var visibility = methodResult[1];
            if(!isInterface && visibility !== 'public') continue;

            var varType = getVarType(methodResult[4], "method-return-type", options);

            var isAsync = methodResult[3] === 'async';
            if(isAsync) {
                if(varType.indexOf('<') > -1 && varType.indexOf('>') > -1) {
                    varType = varType.replace(/^Task\<([^?\s]*)\>$/gm, '$1');
                    varType = 'Promise<' + varType + '>';
                } else {
                    varType = varType.replace('Task', 'Promise<void>');
                }
            }
            
            if (options && options.ignoreVirtual) {
                var isVirtual = methodResult[2] === 'virtual';
                if (isVirtual) {
                    continue;
                }
            }

            var methodName = methodResult[5];
            if(methodName.toLowerCase() === originalClassName.toLowerCase()) continue;

            if (methodNameResolver) {
                methodName = methodNameResolver(methodName);
            }
            definition += leadingWhitespace + methodName + '(';

            var arguments = methodResult[6];
            var argumentsRegex = /\s*(?:\[[\w\d]+\])?([^?\s]*) ([\w\d]+)(?:\,\s*)?/gm;

            var argumentResult;
            var argumentDefinition = '';
            for(var argumentResult of safeRegex(argumentsRegex, arguments, options)) {
                if (argumentDefinition !== '') {
                    argumentDefinition += ', ';
                }
                argumentDefinition += argumentResult[2] + ': ' + getVarType(argumentResult[1], "method-argument-type", options);
            }

            definition += argumentDefinition;

            definition += '): ' + varType + ';\n';
        }
    }

    if(options && options.additionalInterfaceCodeResolver) {
        var customCode = options.additionalInterfaceCodeResolver(leadingWhitespace, originalClassName);
        definition += "\n" + leadingWhitespace + customCode + "\n";
    }

    definition += '}\n';

    return definition;
}

function getVarType(typeCandidate, scope, options) {
    var collectionRegex = /^(I?List|IEnumerable|ICollection|HashSet)<([\w\d]+)>$/gm;
    var dictionaryRegex = /^I?Dictionary<([\w\d]+),\s?([\w\d]+)>$/gm;
    var genericPropertyRegex = /^([\w\d]+)<([\w\d\<\> ,]+)>$/gm;
    var arrayRegex = /^([\w\d]+)\[\]$/gm;

    var varType = typeTranslation[typeCandidate];
    if(scope && (options && options.typeResolver)) {
        varType = options.typeResolver(varType, scope);
    }
    
    if (varType) {
        return varType;
    }
    
    varType = typeCandidate;

    var collectionMatch = safeRegex(collectionRegex, varType, options)[0];
    var arrayMatch = safeRegex(arrayRegex, varType, options)[0];
    var genericPropertyMatch = safeRegex(genericPropertyRegex, varType, options)[0];
    var dictionaryMatch = safeRegex(dictionaryRegex, varType, options)[0];

    if(dictionaryMatch) {
        var type1 = dictionaryMatch[1];
        var type2 = dictionaryMatch[2];

        varType = "{ [index: " + getVarType(type1, null, options) + "]: " + getVarType(type2, null, options) + " }";
    } else if (collectionMatch) {
        var collectionType = collectionMatch[1];
        var collectionContentType = collectionMatch[2];

        varType = getVarType(collectionContentType, null, options) + '[]';
    } else if (arrayMatch) {
        var arrayType = arrayMatch[1];

        varType = getVarType(arrayType) + '[]';
    } else if (genericPropertyMatch) {
        var generic = genericPropertyMatch[1];

        var genericTypes = genericPropertyMatch[2];
        var splits = genericTypes
            .split(',')
            .map(function(x) { return x.trim(); });
        var finalGenericType = "";
        for(let split of splits) {
            if(finalGenericType !== "") finalGenericType += ", ";
            finalGenericType += getVarType(split, null, options);
        }

        varType = generic + '<' + finalGenericType + '>';
    }

    return varType;
}

function generateEnum(enumName, input, options) {
    var entryRegex = /(\w+)\s*=?\s*(-*\d+)?[,|\s]/gm;
    var definition = 'enum ' + enumName + ' {\n    ';

    var entryResult;

    var elements = [];
    var lastIndex = 0;

    for(var entryResult of safeRegex(entryRegex, input)) {
        var entryName = entryResult[1];
        var entryValue = entryResult[2];

        if (!entryValue) {
            entryValue = lastIndex;

            lastIndex++;
        } else {
            lastIndex = parseInt(entryValue, 10) + 1;
        }

        elements.push(entryName + ' = ' + entryValue);
    }

    definition += elements.join(',\n    ');

    definition += '\n}\n';

    return definition;
}

module.exports = function(input, options) {
    if(options && options.prefixWithI) {
        var existingInterfaceNameResolver = (options && options.interfaceNameResolver) || ((name) => name);
        options.interfaceNameResolver = (name) => {
            var decoratedName = existingInterfaceNameResolver(name);
            return "I" + decoratedName;
        }
    }

    input = removeComments(input);
    var result = '';
    var match;

    if (!options) {
        options = {};
    }

    for (var match of safeRegex(typeRegex, input, options)) {
        var type = match[2];
        var typeName = match[3];
        var inherits = match[4];

        if (result.length > 0) {
            result += '\n';
        }

        if (type === 'class' || type === 'struct' || (type === 'interface' && options.includeInterfaces)) {
            result += generateInterface(typeName, inherits, match[5], type === 'interface', options);
        } else if (type === 'enum') {
            if (!options.baseNamespace) {
              result += 'declare ';
            }

            result += generateEnum(typeName, match[5], options);
        }
    }

    if (options.baseNamespace) {
        var firstLine;

        if (options.definitionFile === false) {
            firstLine = 'module ' + options.baseNamespace + ' {';
        } else {
            firstLine = 'declare module ' + options.baseNamespace + ' {';
        }

        var lines = [firstLine];

        lines = lines.concat(result.split('\n').map(function(line) {
            return '    ' + (/^(?:interface|enum)/.test(line) ? 'export ' + line : line);
        }));
        lines = lines.slice(0, lines.length - 1);
        lines = lines.concat('}');

        result = lines.join('\n');
    }
    
    return result;
};
