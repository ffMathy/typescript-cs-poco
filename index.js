var typeTranslation = {};

typeTranslation["int"] = "number";
typeTranslation["double"] = "number";
typeTranslation["float"] = "number";
typeTranslation["Int32"] = "number";
typeTranslation["Int64"] = "number";
typeTranslation["short"] = "number";
typeTranslation["long"] = "number";
typeTranslation["bool"] = "boolean";

var blockCommentRegex = new RegExp("/\\*([\\s\\S]*)\\*/", "gm");
var lineCommentRegex = new RegExp("//(.*)", "g");
var classRegex = /class ([\w\d]+)/;
var propertyRegex = /public (\S*) ([\w\d]+)\s*{\s*get;\s*set;\s*}/gm;

function removeComments(code) {
    var output = code.replace(blockCommentRegex, "");

    var lines = output.split("\n").map(function(line) {
            return line.replace(lineCommentRegex, "");
        });

    return lines.join("\n");
}

module.exports = function(input) {
    input = removeComments(input);

    var className = classRegex.exec(input)[1];

    var definition = 'interface ' + className + ' {\n';

    var propertyResult;
    
    while (propertyResult = propertyRegex.exec(input)) {
        var varType = typeTranslation[propertyResult[1]];

        if (!varType) {
            varType = propertyResult[1];
        }

        definition += '    ' + propertyResult[2] + ': ' + varType + ';\n';
    }

    definition += '}\n';

    return definition;
}