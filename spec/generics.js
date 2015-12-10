/// <reference path="../typings/tsd.d.ts" />
// Disabled multiline warning, we're fine with ES5
// jshint -W043

var sampleFile = "\
using System;\n\
\n\
namespace MyNamespace.Domain\n\
{\n\
    public class MyPoco<T>\n\
    {\n\
        public T GenericTypeValue {get;set;}\n\
    }\n\
}\n";

var expectedOutput = "interface MyPoco<T> {\n\
    GenericTypeValue: T;\n\
}\n";

var pocoGen = require('../index.js');

describe('typescript-cs-poco', function() {
	it('should transform a POCO correctly', function() {
		var result = pocoGen(sampleFile);
        
        expect(result).toEqual(expectedOutput);
	});
});
