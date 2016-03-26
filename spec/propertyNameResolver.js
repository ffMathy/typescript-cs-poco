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
        public int Id { get; set; }\n\
        public string Name { get; set; }\n\
        public string Title { get; set; }\n\
    }\n\
}\n";

var expectedOutput = "interface MyPoco {\n\
    id: number;\n\
    name: string;\n\
    title: string;\n\
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
