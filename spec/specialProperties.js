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
        public virtual IEnumeration<MyOtherPoco> OtherPocos { get; set; }\n\
    }\n\
\n\
    public class MyOtherPoco\n\
    {\n\
        public int id { get; set; }\n\
    }\n\
}\n";

var expectedOutput = "interface MyPoco {\n\
    OtherPocos: MyOtherPoco[];\n\
}\n\
interface MyOtherPoco {\n\
    id: int;\n\
}\n";

var pocoGen = require('../index.js');

describe('typescript-cs-poco', function() {
	it('should also include properties marked as virtual', function() {
		var result = pocoGen(sampleFile);
        
        expect(result).toEqual(expectedOutput);
	});
});

