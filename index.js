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

var blockCommentRegex = new RegExp('/\\*([\\s\\S]*)\\*/', 'gm');
var lineCommentRegex = new RegExp('//(.*)', 'g');
var typeRegex = /^([\t ]*)(?:public\s*|partial\s*|abstract\s*)*\s*(class|enum|struct|interface)\s+([\w\d_<>, ]+?)(?:\s*:\s*((?:(?:[\w\d\._<>, ]+?)(?:,\s+)?)+))?\s*\{((?:.|\n|\r)*?)?^\1\}/gm;

function removeComments(code) {
    var output = code.replace(blockCommentRegex, '');

    var lines = output.split('\n').map(function(line) {
            return line.replace(lineCommentRegex, '');
        });

    return lines.join('\n');
}

function generateInterface(className, input, options) {
    var propertyRegex = /public( virtual)? ([\w\d\._<>, \[\]]+?)(\??) ([\w\d]+)\s*(?:{\s*get;\s*(?:private\s*)?set;\s*}|;)/gm;
    var methodRegex = /public( virtual)?( async)? ([^?\s]*) ([\w\d]+)\(((?:.?\s?)*?)\)\s*\{(?:.?\s?)*?\}/gm;
    
    var propertyNameResolver = options && options.propertyNameResolver;
    var methodNameResolver = options && options.methodNameResolver;
    var interfaceNameResolver = options && options.interfaceNameResolver;
    var typeResolver = options && options.typeResolver;
    
    if (interfaceNameResolver) {
        className = interfaceNameResolver(className);
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
    while (!!(propertyResult = propertyRegex.exec(input))) {
        var varType = getVarType(propertyResult[2], "property-type", typeResolver);

        var isOptional = propertyResult[3] === '?';

        if (options && options.ignoreVirtual) {
            var isVirtual = propertyResult[1] === ' virtual';
            if (isVirtual){ 
                continue;
            }
        }

        var propertyName = propertyResult[4];
        if (propertyNameResolver) {
            propertyName = propertyNameResolver(propertyName);
        }
        definition += leadingWhitespace + propertyName;

        if (isOptional) {
            definition += '?';
        }

        definition += ': ' + varType + ';\n';
    }

    var methodResult;
    while (!!(methodResult = methodRegex.exec(input))) {
        var varType = getVarType(methodResult[3], "method-return-type", typeResolver);

        var isAsync = methodResult[2] === ' async';
        if(isAsync) {
            if(varType.indexOf('<') > -1 && varType.indexOf('>') > -1) {
                varType = varType.replace(/^Task\<([^?\s]*)\>$/gm, '$1');
                varType = 'Promise<' + varType + '>';
            } else {
                varType = varType.replace('Task', 'Promise<void>');
            }
        }
        
        if (options && options.ignoreVirtual) {
            var isVirtual = methodResult[1] === ' virtual';
            if (isVirtual) {
                continue;
            }
        }

        var propertyName = methodResult[4];
        if (methodNameResolver) {
            propertyName = methodNameResolver(propertyName);
        }
        definition += leadingWhitespace + propertyName + '(';

        var arguments = methodResult[5];
        var argumentsRegex = /\s*(?:\[[\w\d]+\])?([^?\s]*) ([\w\d]+)(?:\,\s*)?/gm;

        var argumentResult;
        var argumentDefinition = '';
        while (!!(argumentResult = argumentsRegex.exec(arguments))) {
            if (argumentDefinition !== '') {
                argumentDefinition += ', ';
            }
            argumentDefinition += argumentResult[2] + ': ' + getVarType(argumentResult[1], "method-argument-type", typeResolver);
        }

        definition += argumentDefinition;

        definition += '): ' + varType + ';\n';
    }

    definition += '}\n';

    return definition;
}

function getVarType(typeCandidate, scope, typeResolver) {
    var collectionRegex = /^(I?List|IEnumerable|ICollection|HashSet)<([\w\d]+)>$/;
    var dictionaryRegex = /^I?Dictionary<([\w\d]+),\s?([\w\d]+)>$/;
    var genericPropertyRegex = /^([\w\d]+)<([\w\d\<\> ,]+)>$/;
    var arrayRegex = /^([\w\d]+)\[\]$/;

    var varType = typeTranslation[typeCandidate];
    if(typeResolver) {
        varType = typeResolver(varType, scope);
    }
    
    if (varType) {
        return varType;
    }
    
    varType = typeCandidate;

    var collectionMatch = collectionRegex.exec(varType);
    var arrayMatch = arrayRegex.exec(varType);
    var genericPropertyMatch = genericPropertyRegex.exec(varType);
    var dictionaryMatch = dictionaryRegex.exec(varType);

    if(dictionaryMatch) {
        var type1 = dictionaryMatch[1];
        var type2 = dictionaryMatch[2];

        varType = "{ [index: " + getVarType(type1) + "]: " + getVarType(type2) + " }";
    } else if (collectionMatch) {
        var collectionType = collectionMatch[1];
        var collectionContentType = collectionMatch[2];

        varType = getVarType(collectionContentType) + '[]';
    } else if (arrayMatch) {
        var arrayType = arrayMatch[1];

        varType = getVarType(arrayType) + '[]';
    } else if (genericPropertyMatch) {
        var generic = genericPropertyMatch[1];

        var genericTypes = genericPropertyMatch[2];
        var splits = genericTypes
            .split(',')
            .map(x => x.trim());
        var finalGenericType = "";
        for(let split of splits) {
            if(finalGenericType !== "") finalGenericType += ", ";
            finalGenericType += getVarType(split);
        }

        varType = generic + '<' + finalGenericType + '>';
    }

    return varType;
}

function generateEnum(enumName, input, options) {
    var entryRegex = /([^\s,\]\[]+)\s*=?\s*(\d+)?[,|\s]/gm;
    var definition = 'enum ' + enumName + ' {\n    ';

    var entryResult;

    var elements = [];
    var lastIndex = 0;

    while(!!(entryResult = entryRegex.exec(input))) {
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
    input = removeComments(input);
    var result = '';
    var match;

    if (!options) {
        options = {};
    }

    var ignoreInheritance = options && options.ignoreInheritance;

    while (!!(match = typeRegex.exec(input))) {
        var type = match[2];
        var typeName = match[3];
        var inherits = match[4];

        var interfaceNameResolver = options.interfaceNameResolver;
        if (inherits && interfaceNameResolver) {
            inherits = interfaceNameResolver(inherits);
        }

        if (result.length > 0) {
            result += '\n';
        }

        if (type === 'class' || type === 'struct' || (type === 'interface' && options.includeInterfaces)) {
            if (inherits && (!ignoreInheritance || ignoreInheritance.indexOf(inherits) === -1)) {
                typeName += ' extends ' + inherits;
            }

            if (interfaceNameResolver) {
                typeName = interfaceNameResolver(typeName);
            }

            result += generateInterface(typeName, match[5], options);
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
