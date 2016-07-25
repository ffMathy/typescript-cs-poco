/// <reference path="../typings/tsd.d.ts" />
// Disabled multiline warning, we're fine with ES5
// jshint -W043

var sampleFile = "\
using System;\n\
\n\
public class LatLng : IEquatable<LatLng>\n\
{\n\
  public double lat { get; set; }\n\
  public double lng { get; set; }\n\
\n\
  public bool Equals(LatLng other)\n\
  {\n\
    return Math.Abs(other.lat - lat) < double.Epsilon && Math.Abs(other.lng - lng) < double.Epsilon;\n\
  }\n\
\n\
  public override bool Equals(object obj)\n\
  {\n\
    var latLng = obj as LatLng;\n\
    if (latLng != null)\n\
    {\n\
      return Equals(latLng);\n\
    }\n\
    return false;\n\
  }\n\
\n\
  public override int GetHashCode()\n\
  {\n\
    unchecked\n\
    {\n\
      return (lat.GetHashCode()*397) ^ lng.GetHashCode();\n\
    }\n\
  }\n\
}\n";

var expectedOutput = "interface LatLng extends IEquatable<LatLng> {\n\
    lat: number;\n\
    lng: number;\n\
}\n";

var pocoGen = require('../index.js');

describe('typescript-cs-poco', function() {
	it('should convert a class with a generic base class correctly', function() {
		var result = pocoGen(sampleFile);
        
    expect(result).toEqual(expectedOutput);
	});
});
