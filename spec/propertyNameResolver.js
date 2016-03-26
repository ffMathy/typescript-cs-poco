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

var expectedOutput = "export interface MyPoco {\n\
	someInt: number;\n\
}\n";

var pocoGen = require('../index.js');

describe('typescript-cs-poco', function() {
	it('should use the propertyNameResolver option correctly', function() {
		var result = pocoGen(sampleFile, { propertyNameResolver : _propertyNameResolver });
        
        expect(result).toEqual(expectedOutput);
		
		
		function _propertyNameResolver(propertyName) {
			return propertyName[0].toLowerCase() + propertyName.substring(1);
		}
	});
});
