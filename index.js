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
typeTranslation["System.DateTime"] = 'string';
typeTranslation.Guid = 'string';
typeTranslation.JObject = 'any';
typeTranslation.string = 'string';
typeTranslation.dynamic = 'any';
typeTranslation.object = 'any';

var blockCommentRegex = new RegExp('/\\*([\\s\\S]*)\\*/', 'gm');
var lineCommentRegex = new RegExp('//(.*)', 'g');
var typeRegex = /^([\t ]*)(?:public\s*|partial\s*|abstract\s*)*\s*(class|enum|struct|interface)\s+([\w\d_<>]+)(?:\s*:\s*((?:(?:[\w\d\._<>]+)(?:,\s+)?)+))?\s*\{((?:.|\n|\r)*?)^\1\}/gm;

function removeComments(code) {
    var output = code.replace(blockCommentRegex, '');

    var lines = output.split('\n').map(function(line) {
            return line.replace(lineCommentRegex, '');
        });

    return lines.join('\n');
}

function generateInterface(className, input, options) {
    var propertyRegex = /public( virtual)? ([^?\s]*)(\??) ([\w\d]+)\s*(?:{\s*get;\s*(?:private\s*)?set;\s*}|;)/gm;
    var methodRegex = /public( virtual)?(?: async)? ([^?\s]*) ([\w\d]+)\(((?:.?\s?)*?)\)\s*\{(?:.?\s?)*?\}/gm;

    var definition = 'interface ' + className + ' {\n';
    
    var propertyNameResolver = options && options.propertyNameResolver;
    var methodNameResolver = options && options.methodNameResolver;

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
        var varType = getVarType(propertyResult[2]);

        var isOptional = propertyResult[3] === '?';

        if (options.ignoreVirtual) {
            var isVirtual = propertyResult[1] === ' virtual';
            if (isVirtual){ 
                continue;
            }
        }

        var methodName = propertyResult[4];
        if (propertyNameResolver) {
          methodName = propertyNameResolver(methodName);
        }
        definition += leadingWhitespace + methodName;

        if (isOptional) {
            definition += '?';
        }

        definition += ': ' + varType + ';\n';
    }

    var methodResult;
    while (!!(methodResult = methodRegex.exec(input))) {
        var varType = getVarType(methodResult[2]);
        
        if (options.ignoreVirtual) {
            var isVirtual = propertyResult[1] === ' virtual';
            if (isVirtual) {
                continue;
            }
        }

        var methodName = methodResult[3];
        if (methodNameResolver) {
            methodName = methodNameResolver(methodName);
        }
        definition += leadingWhitespace + methodName + '(';

        var arguments = methodResult[4];
        var argumentsRegex = /\s*(?:\[[\w\d]+\])??([^?\s]*) ([\w\d]+)(?:\,\s*)?/gm;
        console.log(arguments);

        var argumentResult;
        var argumentDefinition = '';
        while (!!(argumentResult = argumentsRegex.exec(arguments))) {
            if (argumentDefinition !== '') {
                argumentDefinition += ', ';
            }
            argumentDefinition += argumentResult[2] + ': ' + argumentResult[1];
        }

        definition += argumentDefinition;

        definition += '): ' + varType + ';\n';
    }

    definition += '}\n';

    return definition;
}

function getVarType(typeCandidate) {
    var collectionRegex = /(?:List|IEnumerable|ICollection)<([\w\d]+)>/;
    var genericPropertyRegex = /([\w\d]+)<([\w\d]+)>/;
    var arrayRegex = /([\w\d]+)\[\]/;

    var varType = typeTranslation[typeCandidate];
    if (!varType) {
        varType = typeCandidate;

        var collectionMatch = collectionRegex.exec(varType);
        var arrayMatch = arrayRegex.exec(varType);
        var genericPropertyMatch = genericPropertyRegex.exec(varType);

        if (collectionMatch) {
            var collectionType = collectionMatch[1];

            if (typeTranslation[collectionType]) {
                varType = typeTranslation[collectionType];
            } else {
                varType = collectionType;
            }

            varType += '[]';
        } else if (arrayMatch) {
            var arrayType = arrayMatch[1];

            if (typeTranslation[arrayType]) {
                varType = typeTranslation[arrayType];
            } else {
                varType = arrayType;
            }

            varType += '[]';
        } else if (genericPropertyMatch) {
            var generic = genericPropertyMatch[1];
            var genericType = genericPropertyMatch[2];

            if (typeTranslation[genericType]) {
                varType = generic + '<' + typeTranslation[genericType] + '>';
            } else {
                varType = generic + '<' + genericType + '>';
            }
        }
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

        if (inherits && options.prefixWithI) {
            inherits = 'I' + inherits;
        }

        if (result.length > 0) {
            result += '\n';
        }

        if (type === 'class' || type === 'struct' || (type === 'interface' && options.includeInterfaces)) {
            if (inherits && (!ignoreInheritance || ignoreInheritance.indexOf(inherits) === -1)) {
                typeName += ' extends ' + inherits;
            }

            if (options.prefixWithI) {
                typeName = 'I' + typeName;
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

    // TODO: Error?  Is this ok?
    return result;
};
