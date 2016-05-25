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
        public MyPoco()\n\
        {\n\
        }\n\
\n\
        public MyPoco(RichObject value)\n\
        {\n\
            this.Id = value.Id;\n\
            this.Name = value.Name;\n\
            this.Title = value.Title;\n\
        }\n\
\
        public int Id { get; set; }\n\
        public string Name { get; set; }\n\
        //public string IgnoreMe { get; set; }\n\
        // public string IgnoreMe2 { get; set; }\n\
        /* public string IgnoreMe3 {get; set; } */\n\
        /*\n\
        public string IgnoreMe4 {get; set; }\n\
        */\n\
        public string Title\n\
        {\n\
            get;\n\
            set;\n\
        }\n\
        public List<string> ListFields { get; set; }\n\
        public IEnumerable<string> IEnumerableFields { get; set; }\n\
        public string[] ArrayFields { get; set; }\n\
        public bool? OptionalBool {get; set;}\n\
        public DateTime SomeDate {get;set;}\n\
        public decimal SomeDecimal {get;set;}\n\
        public Guid SomeGuid {get;set;}\n\
        public SomeOtherPoco AnotherPoco {get; set;}\n\
        public List<SomeOtherPoco> MorePocos {get; set;}\n\
        public SomeOtherPoco[] ArrayPocos {get; set;}\n\
    }\n\
\n\
    public class ChildPoco : MyPoco\n\
    {\n\
      public ChildPoco()\n\
      {\n\
      }\n\
\n\
      public int SomeOtherThing {get; set; }\n\
    }\n\
}\n";

var expectedOutput = "interface IMyPoco {\n\
    Id: number;\n\
    Name: string;\n\
    Title: string;\n\
    ListFields: string[];\n\
    IEnumerableFields: string[];\n\
    ArrayFields: string[];\n\
    OptionalBool?: boolean;\n\
    SomeDate: string;\n\
    SomeDecimal: number;\n\
    SomeGuid: string;\n\
    AnotherPoco: ISomeOtherPoco;\n\
    MorePocos: ISomeOtherPoco[];\n\
    ArrayPocos: ISomeOtherPoco[];\n\
}\n\
\n\
interface IChildPoco extends IMyPoco {\n\
    SomeOtherThing: number;\n\
}\n";

var pocoGen = require('../index.js');

describe('typescript-cs-poco', function() {
	it('should prefix with I if option is set', function() {
		var result = pocoGen(sampleFile, {
            prefixWithI: true
        });
        
        expect(result).toEqual(expectedOutput);
	});
});
