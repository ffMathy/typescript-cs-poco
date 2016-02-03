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
        Green,\n\
		Red,\n\
		Blue\n\
        //Purple\n\
        /* public string IgnoreMe3 {get; set; } */\n\
        /*\n\
        public string IgnoreMe4 {get; set; }\n\
        */\n\
        [SomeAttribute(64)]\n\
        Pink = 10, Ultraviolet\n\
    }\n\
}\n";

var expectedOutput = "declare enum MyEnum { Green = 0, Red = 1, Blue = 2, Pink = 10, Ultraviolet = 11 }\n";

var pocoGen = require('../index.js');

describe('typescript-cs-poco', function() {
	it('should transform an enum correctly', function() {
		var result = pocoGen(sampleFile);
        
        expect(result).toEqual(expectedOutput);
	});
});
