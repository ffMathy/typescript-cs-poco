/// <reference path="../typings/tsd.d.ts" />
// Disabled multiline warning, we're fine with ES5
// jshint -W043

var sampleFile = "\
using System;\n\
\n\
namespace MyNamespace.Domain\n\
{\n\
    public class MyPoco\n\
    {\n\
        public int SomeInt { get; set; }\n\
    }\n\
}\n";

var expectedOutput = "module MyNamespace {\n\
    interface MyPoco {\n\
        SomeInt: number;\n\
    }\n\
}";

var pocoGen = require('../index.js');

describe('typescript-cs-poco', function() {
	it('should use the baseNamespace option correctly', function() {
		var result = pocoGen(sampleFile, { baseNamespace: 'MyNamespace' });
        
        expect(result).toEqual(expectedOutput);
	});
});
