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
typeTranslation.JObject = 'any';
typeTranslation.string = 'string';
typeTranslation.dynamic = 'any';

var blockCommentRegex = new RegExp('/\\*([\\s\\S]*)\\*/', 'gm');
var lineCommentRegex = new RegExp('//(.*)', 'g');
var typeRegex = /^([\t ]*)(?:public\s*|partial\s*|abstract\s*)*\s*(class|enum|struct)\s+([\w\d_<>]+)(?:\s*:\s*((?:(?:[\w\d\._]+)(?:,\s+)?)+))?\s*\{((?:.|\n|\r)*?)^\1\}/gm;

function removeComments(code) {
    var output = code.replace(blockCommentRegex, '');

    var lines = output.split('\n').map(function(line) {
            return line.replace(lineCommentRegex, '');
        });

    return lines.join('\n');
}

function generateInterface(className, input, options) {
    var propertyRegex = /public( virtual)? ([^?\s]*)(\??) ([\w\d]+)\s*{\s*get;\s*set;\s*}/gm;
    var collectionRegex = /(?:List|IEnumerable)<([\w\d]+)>/;
    var arrayRegex = /([\w\d]+)\[\]/;

    var definition = 'interface ' + className + ' {\n';

    var propertyResult;

    var prefixFieldsWithI = options && options.prefixWithI;
    var propertyNameResolver = options && options.propertyNameResolver;

    if (options && options.dateTimeToDate) {
      typeTranslation.DateTime = 'Date';
    } else {
      typeTranslation.DateTime = 'string';
    }

    while (!!(propertyResult = propertyRegex.exec(input))) {
        var varType = typeTranslation[propertyResult[2]];

        var isOptional = propertyResult[3] === '?';

        if (!varType) {
            varType = propertyResult[2];

            var collectionMatch = collectionRegex.exec(varType);
            var arrayMatch = arrayRegex.exec(varType);

            if (collectionMatch) {
                var collectionType = collectionMatch[1];

                if (typeTranslation[collectionType]) {
                    varType = typeTranslation[collectionType];
                } else {
                    varType = collectionType;

                    if (prefixFieldsWithI) {
                        varType = 'I' + varType;
                    }
                }

                varType += '[]';
            } else if (arrayMatch) {
                var arrayType = arrayMatch[1];

                if (typeTranslation[arrayType]) {
                    varType = typeTranslation[arrayType];
                } else {
                    varType = arrayType;

                    if (prefixFieldsWithI) {
                        varType = 'I' + varType;
                    }
                }

                varType += '[]';
            } else if (prefixFieldsWithI) {
                varType = 'I' + varType;
            }
        }

        var propertyName = propertyResult[4];
        if (propertyNameResolver) {
          propertyName = propertyNameResolver(propertyName);
        }
        definition += '    ' + propertyName;

        if (isOptional) {
            definition += '?';
        }

        definition += ': ' + varType + ';\n';
    }

    definition += '}\n';

    return definition;
}

function generateEnum(enumName, input, options) {
    var entryRegex = /([^\s,]+)\s*=?\s*(\d+)?,?/gm;
    var definition = 'enum ' + enumName + ' {\n    ';

    var entryResult;

    var elements = [];
    var lastIndex = 0;

    while(!!(entryResult = entryRegex.exec(input))) {
        var entryName = entryResult[1];
        var entryValue = entryResult[2];

        // Skip attributes, might be a cleaner way in the regex
        if (entryName.indexOf('[') !== -1) {
            continue;
        }

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

        if (result.length > 0) {
            result += '\n';
        }

        if (type === 'class' || type === 'struct') {
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
