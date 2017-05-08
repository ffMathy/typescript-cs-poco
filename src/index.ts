import vm = require("vm");

var typeTranslation = {};

typeTranslation["int"] = "number";
typeTranslation["double"] = "number";
typeTranslation["float"] = "number";
typeTranslation["Int32"] = "number";
typeTranslation["Int64"] = "number";
typeTranslation["short"] = "number";
typeTranslation["long"] = "number";
typeTranslation["decimal"] = "number";
typeTranslation["bool"] = "boolean";
typeTranslation["DateTime"] = "string";
typeTranslation["Guid"] = "string";
typeTranslation["string"] = "string";
typeTranslation["JObject"] = "any";
typeTranslation["dynamic"] = "any";
typeTranslation["object"] = "any";

var blockCommentRegex = /\/\*([\s\S]*)\*\//gm;
var lineCommentRegex = /\/\/(.*)/g;
var typeRegex = /( *)(?:public\s*|partial\s*|abstract\s*)*\s*(class|enum|struct|interface)\s+([\w\d_<>, ]+?)(?:\s*:\s*((?:(?:[\w\d\._<>, ]+?)(?:,\s+)?)+))?\s*\{((?:.|\n|\r)+?^\1\})/gm;

function safeRegex(regex, input, options?) {
    if(!input) return [];

    const sandbox = {
        results: [],
        regex: regex,
        result: null
    };
    
    const context = vm.createContext(sandbox);
    const sanitizedInput = input
        .replace(/[\n\r]+/gm, "\\n")
        .replace(/\'/g, "\\'");

    const scriptString = `while(result=regex.exec('${sanitizedInput}')){results.push(result);}`;
    const script = new vm.Script(scriptString);
    
    try{
        let timeout = options && options.timeout;
        if(!timeout) timeout = 30000;
        script.runInContext(context, { 
            timeout: timeout.toString()
        });
    } catch(e){
        throw new Error(`Regular expression timeout for pattern '${regex}' and data '${input}', with ${sandbox.results.length} results gathered so far.\n\nInner error: ${e}`);
    }
    
    return sandbox.results;
}

function removeComments(code: string) {
    const output = code.replace(blockCommentRegex, "");

    const lines = output
        .split("\n")
        .map(line => line.replace(lineCommentRegex, ""));

    return lines.join("\n");
}

function generateInterface(className: string, inherits, input, isInterface?: boolean, options?) {
    var propertyRegex = /(?:(?:((?:public)?)|(?:private)|(?:protected)|(?:internal)|(?:protected internal)) )+(?:(virtual|readonly) )?([\w\d\._<>, \[\]]+?)(\??) ([\w\d]+)\s*(?:{\s*get;\s*(?:private\s*)?set;\s*}|;)/gm;
    var methodRegex = /(?:(?:((?:public)?)|(?:private)|(?:protected)|(?:internal)|(?:protected internal)) )+(?:(virtual|readonly) )?(?:(async) )?(?:([\w\d\._<>, \[\]]+?) )?([\w\d]+)\(((?:.?\s?)*?)\)\s*/gm;
    
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

    if (options && options.prefixWithI) {
        if (inherits)
            inherits = `I${inherits}`;
        className = `I${className}`;
    }

    var ignoreInheritance = options && options.ignoreInheritance;
    if (inherits && ignoreInheritance !== true && (!ignoreInheritance || ignoreInheritance.indexOf(inherits) === -1)) {
        className += ` extends ${inherits}`;
    }

    var definition = `interface ${className} {\n`;

    if (options && options.dateTimeToDate) {
        typeTranslation["DateTime"] = "Date";
        typeTranslation["System.DateTime"] = "Date";
    } else {
        typeTranslation["DateTime"] = "string";
        typeTranslation["System.DateTime"] = "string";
    }

    if (options && options.customTypeTranslations) {
        for (var key in options.customTypeTranslations) {
            if (options.customTypeTranslations.hasOwnProperty(key)) {
                typeTranslation[key] = options.customTypeTranslations[key];
            }
        }
    }

    var leadingWhitespace = "    ";

    var properties = [];
    for (let propertyResult of safeRegex(propertyRegex, input, options)) {
        var visibility = propertyResult[1];
        if(!isInterface && visibility !== "public") continue;

        if (options && options.ignoreVirtual) {
            let isVirtual = propertyResult[2] === "virtual";
            if (isVirtual){ 
                continue;
            }
        }

        var varType = getVarType(propertyResult[3], "property-type", options);

        var isReadOnly = propertyResult[2] === "readonly";
        var isOptional = propertyResult[4] === "?";

        var propertyName = propertyResult[5];
        if (propertyNameResolver) {
            propertyName = propertyNameResolver(propertyName);
        }
        definition += leadingWhitespace;

        if (options && !options.stripReadOnly && isReadOnly) {
            definition += "readonly ";
        }

        definition += propertyName;

        if (isOptional) {
            definition += "?";
        }

        definition += `: ${varType};\n`;

        properties.push({ name: propertyName, type: varType });
    }

    var methods = [];
    if (options && !options.ignoreMethods) {
        for (let methodResult of safeRegex(methodRegex, input, options)) {
            let visibility = methodResult[1];
            if(!isInterface && visibility !== "public") continue;

            let varType = getVarType(methodResult[4], "method-return-type", options);

            var isAsync = methodResult[3] === "async";
            if(isAsync) {
                if(varType.indexOf("<") > -1 && varType.indexOf(">") > -1) {
                    varType = varType.replace(/^Task\<([^?\s]*)\>$/gm, "$1");
                    varType = `Promise<${varType}>`;
                } else {
                    varType = varType.replace("Task", "Promise<void>");
                }
            }
            
            if (options && options.ignoreVirtual) {
                var isVirtual = methodResult[2] === "virtual";
                if (isVirtual) {
                    continue;
                }
            }

            var methodName = methodResult[5];
            if(methodName.toLowerCase() === originalClassName.toLowerCase()) continue;

            if (methodNameResolver) {
                methodName = methodNameResolver(methodName);
            }
            definition += leadingWhitespace + methodName + "(";

            var methodArguments = methodResult[6];
            var argumentsRegex = /\s*(?:\[[\w\d]+\])?([^?\s]*) ([\w\d]+)(?:\,\s*)?/gm;
            
            var argumentDefinition = "";
            for(var argumentResult of safeRegex(argumentsRegex, methodArguments, options)) {
                if (argumentDefinition !== "") {
                    argumentDefinition += ", ";
                }
                argumentDefinition += argumentResult[2] + ": " + getVarType(argumentResult[1], "method-argument-type", options);
            }

            definition += argumentDefinition;


            definition += `): ${varType};\n`;

            methods.push({ name: methodName, returnType: varType });
        }
    }

    if(options && options.additionalInterfaceCodeResolver) {
        var customCode = options.additionalInterfaceCodeResolver(leadingWhitespace, originalClassName, properties, methods);
        definition += `\n${leadingWhitespace}${customCode}\n`;
    }

    definition += "}\n";

    return definition;
}

function getVarType(typeCandidate, scope?, options?) {
    const collectionRegex = /^(I?List|IEnumerable|ICollection|HashSet)<([\w\d]+)>$/gm;
    const dictionaryRegex = /^I?Dictionary<([\w\d]+),\s?([\w\d]+)>$/gm;
    const genericPropertyRegex = /^([\w\d]+)<([\w\d\<\> ,]+)>$/gm;
    const arrayRegex = /^([\w\d]+)\[\]$/gm;

    let varType = typeTranslation[typeCandidate];
    
    if (varType) {
        if(scope && (options && options.typeResolver)) {
            varType = options.typeResolver(varType, scope);
        }
        return varType;
    }
    
    varType = typeCandidate;

    const collectionMatch = safeRegex(collectionRegex, varType, options)[0];
    const arrayMatch = safeRegex(arrayRegex, varType, options)[0];
    const genericPropertyMatch = safeRegex(genericPropertyRegex, varType, options)[0];
    const dictionaryMatch = safeRegex(dictionaryRegex, varType, options)[0];

    if(dictionaryMatch) {
        const type1 = dictionaryMatch[1];
        const type2 = dictionaryMatch[2];

        varType = `{ [index: ${getVarType(type1, null, options)}]: ${getVarType(type2, null, options)} }`;
    } else if (collectionMatch) {
        const collectionContentType = collectionMatch[2];
        varType = getVarType(collectionContentType, null, options) + "[]";
    } else if (arrayMatch) {
        const arrayType = arrayMatch[1];

        varType = getVarType(arrayType) + "[]";
    } else if (genericPropertyMatch) {
        const generic = genericPropertyMatch[1];

        const genericTypes = genericPropertyMatch[2];
        const splits = genericTypes
            .split(",")
            .map(x => x.trim());
        let finalGenericType = "";
        for(let split of splits) {
            if(finalGenericType !== "") finalGenericType += ", ";
            finalGenericType += getVarType(split, null, options);
        }

        varType = generic + "<" + finalGenericType + ">";
    }

    if(scope && (options && options.typeResolver)) {
        varType = options.typeResolver(varType, scope);
    }
    return varType;
}

function generateEnum(enumName: any, input: any, options: any);
function generateEnum(enumName, input, options) {
    const entryRegex = /(\w+)\s*=?\s*(-*\d+)?[,|\s]/gm;

    let definition;
    if (options.useStringUnionTypes) {
        definition = `type ${enumName} =\n    `;
    } else {
        definition = `enum ${enumName} {\n    `;
    }
    
    const elements = [];
    let lastIndex = 0;

    for(let entryResult of safeRegex(entryRegex, stripDecorators(input))) {
        const entryName = entryResult[1];
        let entryValue = entryResult[2];

        if (!entryValue) {
            entryValue = lastIndex;

            lastIndex++;
        } else {
            lastIndex = parseInt(entryValue, 10) + 1;
        }

        if (options.useStringUnionTypes) {
            elements.push(`'${entryName}'`);
        } else {
            elements.push(entryName + " = " + entryValue);
        }
    }

    if (options.useStringUnionTypes) {
        definition += elements.join(" |\n    ");
        definition += "\n";
    } else {
        definition += elements.join(",\n    ");
        definition += "\n}\n";
    }

    return definition;
}

function stripDecorators(input: string) {
    const decoratorsRegex = /\[\w+\(\s*(?:\w+\s*\=\s*)?"[A-Öa-ö\s]*"\s*\)\]/gm;
    return input.replace(decoratorsRegex, "");
}

export = function(input, options) {
    input = removeComments(input);

    var result = "";
    if (!options) {
        options = {};
    }

    for (let match of safeRegex(typeRegex, input, options)) {
        const type = match[2];
        const typeName = match[3];
        const inherits = match[4];

        if (result.length > 0) {
            result += "\n";
        }

        if (type === "class" || type === "struct" || (type === "interface" && options.includeInterfaces)) {
            result += generateInterface(typeName, inherits, match[5], type === "interface", options);
        } else if (type === "enum") {
            if (!options.baseNamespace) {
              result += "declare ";
            }

            result += generateEnum(typeName, match[5], options);
        }
    }

    if (options.baseNamespace) {
        let firstLine;

        if (options.definitionFile === false) {
            firstLine = `module ${options.baseNamespace} {`;
        } else {
            firstLine = `declare module ${options.baseNamespace} {`;
        }

        let lines = [firstLine];

        lines = lines.concat(result.split("\n").map(line =>
            `    ${/^(?:interface|enum|type)/.test(line) ? `export ${line}` : line}`));
        lines = lines.slice(0, lines.length - 1);
        lines = lines.concat("}");

        result = lines.join("\n");
    }
    
    return result;
};
