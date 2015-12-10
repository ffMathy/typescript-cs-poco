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

var blockCommentRegex = new RegExp('/\\*([\\s\\S]*)\\*/', 'gm');
var lineCommentRegex = new RegExp('//(.*)', 'g');
var typeRegex = /^(\s*)(?:public\s*|partial\s*)*\s*(class|enum)\s+([\w\d_<>]+)(?:\s*:\s*([\w\d\._]+))?\s*\{((?:.|\n|\r)*?)^\1\}/gm;

function removeComments(code) {
    var output = code.replace(blockCommentRegex, '');

    var lines = output.split('\n').map(function(line) {
            return line.replace(lineCommentRegex, '');
        });

    return lines.join('\n');
}

function generateInterface(className, input) {
    var propertyRegex = /public ([^?\s]*)(\??) ([\w\d]+)\s*{\s*get;\s*set;\s*}/gm;
    var collectionRegex = /(?:List|IEnumerable)<([\w\d]+)>/;

    var definition = 'interface ' + className + ' {\n';

    var propertyResult;
    
    while (!!(propertyResult = propertyRegex.exec(input))) {
        var varType = typeTranslation[propertyResult[1]];
        
        var isOptional = propertyResult[2] === '?';

        if (!varType) {
            varType = propertyResult[1];
            
            var collectionMatch = collectionRegex.exec(varType);
            
            if (collectionMatch) {
                varType = collectionMatch[1] + '[]';
            }
        }

        definition += '    ' + propertyResult[3];
        
        if (isOptional) {
            definition += '?';
        }
        
        definition += ': ' + varType + ';\n';
    }

    definition += '}\n';

    return definition;
}

function generateEnum(enumName, input) {
    var entryRegex = /([^\s,]+)\s*=?\s*(\d+)?,?/gm;
    var definition = 'enum ' + enumName + ' { ';
    
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
    
    definition += elements.join(', ');
    
    definition += ' }\n';
    
    return definition;
}

module.exports = function(input, options) {
    input = removeComments(input);
    var result = '';
    var match;

    if (!options) {
        options = {};
    }

    while (!!(match = typeRegex.exec(input))) {
        var type = match[2];
        var typeName = match[3];
        var inherits = match[4];

        if (result.length > 0) {
            result += '\n';
        }

        if (type === 'class') {
            if (inherits) {
                typeName += ' extends ' + inherits;
            }

            if (options.prefixWithI) {
                typeName = 'I' + typeName;
            }

            result += generateInterface(typeName, match[5]);
        } else if (type === 'enum') {
            result += generateEnum(typeName, match[5]);
        }
    }
    
    // TODO: Error?  Is this ok?
    return result;
};

