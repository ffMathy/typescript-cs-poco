/// <reference path="../typings/tsd.d.ts" />
// Disables multiline warning, we're fine with ES5
// jshint -W043

var sampleFile = "\
using System;\n\
\n\
namespace MyNamespace.Domain\n\
{\n\
\n\
  public class MyPoco\n\
  {\n\
    public string MethodWithNoParameters() { \n\
        if(true) {\n\
            //foobar\n\
        }\n\
    }\n\
    public string MethodWithMultipleParameters(string baz, int buz) { \n\
        if(true) {\n\
            //foobar\n\
        }\n\
    }\n\
    public string MethodWithSingleParameter(string baz) { \n\
        if(true) {\n\
            //foobar\n\
        }\n\
    }\n\
    public string EmptyMethodWithNewLineParameters(\n\
        string baz,\n\
        int buz)\n\
    {}\n\
    public void EmptyVoid() {}\n\
  }\n\
}\n";

var expectedOutput = "interface MyPoco {\n\
    MethodWithNoParameters(): string;\n\
    MethodWithMultipleParameters(baz: string, buz: int): string;\n\
    MethodWithSingleParameter(baz: string): string;\n\
    EmptyMethodWithNewLineParameters(baz: string, buz: int): string;\n\
    EmptyVoid(): void;\n\
}\n";

var pocoGen = require('../index.js');

describe('typescript-cs-poco', function () {
    it('should transform a method correctly', function () {
        var result = pocoGen(sampleFile);
        expect(result).toEqual(expectedOutput);
    });
});
