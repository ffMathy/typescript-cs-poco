/// <reference path="../typings/tsd.d.ts" />
// Disable multiline warning, we're fine with ES5
// jshint -W043

var sampleFile = "\
using System;\n\
\n\
namespace MyNamespace.Domain\n\
{\n\
    public enum MyEnum\n\
    {\n\
        [Translation(\"An enum translation\")]\n\
        Green = 0,\n\
		Red = 1,\n\
		Blue = 2\n\
    }\n\
}\n";

var expectedOutput = "declare enum MyEnum {\n\
    Green = 0,\n\
    Red = 1,\n\
    Blue = 2\n\
}\n";

var pocoGen = require('../index.js');

describe('typescript-cs-poco', function() {
	it('should transform an enum with a decorator correctly', function() {
		var result = pocoGen(sampleFile);

        expect(result).toEqual(expectedOutput);
	});
});
